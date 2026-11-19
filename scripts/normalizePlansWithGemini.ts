/**
 * CLI & Batch Script: Gemini API Policy Feature Analyzer & CRM Plan Normalizer
 *
 * Usage:
 *   npm run normalize:plans
 *   npx tsx scripts/normalizePlansWithGemini.ts [--input path/to/raw_plans.json]
 *
 * Analyzes imported Hong Kong insurance plans using `@google/genai` (`gemini-4-hydrogen` + structured JSON schema)
 * to automatically assign:
 *   1. `crmStandardCategory`: 'Critical Illness' | 'Life' | 'Medical' | 'Savings' | 'Tax Annuity' | 'General Insurance'
 *   2. `category` (canonical HKIA engine `PlanCategory`)
 *   3. Standardized 3-point `highlights` (`highlights`, `keyHighlightsEn`, `keyHighlightsZh`)
 *
 * Persists normalized records back into `.data/workspace.json` (`customPlans`) and writes a full
 * normalization audit log to `.data/normalized_imported_plans.json`.
 */

import 'dotenv/config';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import {
  buildStandardizedInsurancePlan,
  CATEGORY_TAXONOMY_META,
  classifyPolicyFeaturesDeterministically,
  NormalizedPlanClassification,
  parseUnstructuredPlansInput,
  RawImportedPlanInput,
} from '../src/domain/planNormalizer';
import {
  CrmStandardCategory,
  InsurancePlan,
  PlanCategory,
} from '../src/domain/types';

const DATA_DIR = path.join(process.cwd(), '.data');
const WORKSPACE_FILE = path.join(DATA_DIR, 'workspace.json');
const AUDIT_OUTPUT_FILE = path.join(DATA_DIR, 'normalized_imported_plans.json');

const SAMPLE_UNSTANDARDIZED_PLANS: RawImportedPlanInput[] = [
  {
    id: 'IMP_AIA_ON_YOUR_SIDE_2',
    insurerCode: 'AIA',
    insurerNameEn: 'AIA International (HK)',
    insurerNameZh: '友邦香港',
    nameEn: 'On Your Side Plan 2 (Imported Brochure)',
    nameZh: '愛伴航—首護摯寶2（匯入小冊子）',
    rawFeaturesText:
      'Covers 115 major illnesses and early-stage carcinoma-in-situ, stroke & heart recurrence protection up to 900% sum assured, waiving future premiums upon first major claim.',
    currencies: ['USD', 'HKD'],
    supportedPaymentTerms: [10, 15, 20, 25],
  },
  {
    id: 'IMP_SUNLIFE_STELLAR_2',
    insurerCode: 'SUNLIFE',
    insurerNameEn: 'Sun Life Hong Kong',
    insurerNameZh: '永明金融香港',
    nameEn: 'SunJoy Global Multi-Currency Plan (Imported CSV)',
    nameZh: '萬年青星河尊享傳承計劃（匯入表格）',
    rawFeaturesText:
      'Participating multi-currency wealth accumulation in 8 currencies (USD/HKD/RMB/GBP/CAD/AUD), policy split option from Year 3, terminal bonus lock-in and contingent insured succession.',
    currencies: ['USD', 'HKD', 'RMB'],
    fulfillmentRatio: 99,
    rawProjectedIrr: 0.0665,
    supportedPaymentTerms: [5, 10],
  },
  {
    id: 'IMP_BUPA_HERO_VHIS',
    insurerCode: 'BUPA',
    insurerNameEn: 'Bupa (Asia) Hong Kong',
    insurerNameZh: '保柏香港',
    nameEn: 'Bupa Hero VHIS Semi-Private Plan (Imported)',
    nameZh: '保柏非凡自願醫保計劃（半私家房）',
    rawFeaturesText:
      'HKSAR Health Bureau certified VHIS Flexi plan up to HK$40M annual inpatient surgical limit, cashless hospital LOG card, unknown pre-existing conditions & HK$8,000 annual tax deduction.',
    currencies: ['HKD', 'USD'],
    supportedPaymentTerms: [1],
  },
  {
    id: 'IMP_BOCLIFE_SMART_TERM',
    insurerCode: 'BOCLIFE',
    insurerNameEn: 'BOC Life',
    insurerNameZh: '中銀人壽',
    nameEn: 'i-Care Pure Term Life Protection (Imported)',
    nameZh: '智守護純人壽定期保障計劃（匯入）',
    rawFeaturesText:
      'Pure level-premium term life death benefit protection without cash value accumulation, guaranteed renewal up to age 80, ideal for household mortgage protection.',
    currencies: ['HKD', 'USD'],
    supportedPaymentTerms: [10, 15, 20],
  },
];

function createGeminiServerClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function analyzeAndNormalizePlansBatch(
  inputs: RawImportedPlanInput[],
  aiClient: GoogleGenAI | null
): Promise<{
  normalizedPlans: InsurancePlan[];
  auditEntries: Array<{
    id: string;
    nameEn: string;
    assignedCrmCategory: CrmStandardCategory;
    assignedEngineCategory: PlanCategory;
    standardizedHighlightsEn: [string, string, string];
    standardizedHighlightsZh: [string, string, string];
    confidenceReason: string;
    engineMode: 'gemini-4-hydrogen' | 'deterministic-taxonomy-fallback';
  }>;
}> {
  if (inputs.length === 0) {
    return { normalizedPlans: [], auditEntries: [] };
  }

  const validCrmCategories: CrmStandardCategory[] = [
    'Savings',
    'Critical Illness',
    'Medical',
    'Life',
    'Tax Annuity',
    'General Insurance',
  ];

  const validPlanCategories: PlanCategory[] = [
    PlanCategory.PARTICIPATING_SAVINGS,
    PlanCategory.CRITICAL_ILLNESS,
    PlanCategory.VHIS,
    PlanCategory.HIGH_END_MEDICAL,
    PlanCategory.QDAP,
    PlanCategory.UNIVERSAL_LIFE,
    PlanCategory.TERM_LIFE,
    PlanCategory.GENERAL_GI,
  ];

  if (aiClient) {
    try {
      const promptItems = inputs.map((item, index) => ({
        index,
        insurer: item.insurerNameEn || item.insurerCode || 'HK Insurer',
        nameEn: item.nameEn || '',
        nameZh: item.nameZh || '',
        rawCategoryText: item.rawCategoryText || '',
        features:
          item.rawFeaturesText ||
          [...(item.highlights || []), ...(item.keyHighlightsEn || [])].join('; '),
      }));

      const response = await aiClient.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze each imported Hong Kong insurance plan's policy features and return standardized CRM classifications and 3-point highlights:\n${JSON.stringify(
          promptItems,
          null,
          2
        )}`,
        config: {
          systemInstruction: `You are a Hong Kong Insurance Authority (HKIA) Actuarial Product Taxonomy & CRM Data Standardization Engine.
For each imported plan:
1. Assign crmStandardCategory strictly from: "Savings" | "Critical Illness" | "Medical" | "Life" | "Tax Annuity" | "General Insurance".
2. Assign planCategory strictly from: "PARTICIPATING_SAVINGS" | "CRITICAL_ILLNESS" | "VHIS" | "HIGH_END_MEDICAL" | "QDAP" | "UNIVERSAL_LIFE" | "TERM_LIFE" | "GENERAL_GI".
3. Generate standardizedHighlightsEn (3 concise English bullets prefixed with [Coverage]/[Core Return], [Features]/[Mechanics], [Suitability]) and standardizedHighlightsZh (3 concise Traditional Chinese bullets prefixed with 【核心保障】/【核心回報】, 【產品亮點】, 【適用客群】). Respect HKIA GL28 caps (6.0% HKD / 6.5% Non-HKD) and never guarantee non-guaranteed dividends.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    index: { type: Type.INTEGER },
                    crmStandardCategory: { type: Type.STRING },
                    planCategory: { type: Type.STRING },
                    standardizedHighlightsEn: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    standardizedHighlightsZh: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    confidenceReason: { type: Type.STRING },
                  },
                  required: [
                    'index',
                    'crmStandardCategory',
                    'planCategory',
                    'standardizedHighlightsEn',
                    'standardizedHighlightsZh',
                    'confidenceReason',
                  ],
                },
              },
            },
            required: ['items'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const aiMap = new Map<number, any>();
      for (const entry of parsed?.items || []) {
        if (typeof entry?.index === 'number') {
          aiMap.set(entry.index, entry);
        }
      }

      const normalizedPlans: InsurancePlan[] = [];
      const auditEntries: Array<{
        id: string;
        nameEn: string;
        assignedCrmCategory: CrmStandardCategory;
        assignedEngineCategory: PlanCategory;
        standardizedHighlightsEn: [string, string, string];
        standardizedHighlightsZh: [string, string, string];
        confidenceReason: string;
        engineMode: 'gemini-4-hydrogen' | 'deterministic-taxonomy-fallback';
      }> = [];

      inputs.forEach((raw, idx) => {
        const baseline = classifyPolicyFeaturesDeterministically(raw);
        const aiEntry = aiMap.get(idx);

        const resolvedPlanCat = validPlanCategories.includes(aiEntry?.planCategory)
          ? (aiEntry.planCategory as PlanCategory)
          : baseline.planCategory;
        const meta = CATEGORY_TAXONOMY_META[resolvedPlanCat];
        const resolvedCrmCat = validCrmCategories.includes(aiEntry?.crmStandardCategory)
          ? (aiEntry.crmStandardCategory as CrmStandardCategory)
          : meta.crmStandardCategory;

        const hlEnRaw = Array.isArray(aiEntry?.standardizedHighlightsEn)
          ? aiEntry.standardizedHighlightsEn.map(String).filter(Boolean)
          : [];
        const hlZhRaw = Array.isArray(aiEntry?.standardizedHighlightsZh)
          ? aiEntry.standardizedHighlightsZh.map(String).filter(Boolean)
          : [];

        const classification: NormalizedPlanClassification = {
          crmStandardCategory: resolvedCrmCat,
          planCategory: resolvedPlanCat,
          categoryLabelEn: meta.labelEn,
          categoryLabelZh: meta.labelZh,
          standardizedHighlightsEn: [
            hlEnRaw[0] || baseline.standardizedHighlightsEn[0],
            hlEnRaw[1] || baseline.standardizedHighlightsEn[1],
            hlEnRaw[2] || baseline.standardizedHighlightsEn[2],
          ],
          standardizedHighlightsZh: [
            hlZhRaw[0] || baseline.standardizedHighlightsZh[0],
            hlZhRaw[1] || baseline.standardizedHighlightsZh[1],
            hlZhRaw[2] || baseline.standardizedHighlightsZh[2],
          ],
          confidenceReason: String(aiEntry?.confidenceReason || baseline.confidenceReason),
        };

        const plan = buildStandardizedInsurancePlan(raw, classification, idx);
        normalizedPlans.push(plan);
        auditEntries.push({
          id: plan.id,
          nameEn: plan.nameEn,
          assignedCrmCategory: plan.crmStandardCategory!,
          assignedEngineCategory: plan.category,
          standardizedHighlightsEn: classification.standardizedHighlightsEn,
          standardizedHighlightsZh: classification.standardizedHighlightsZh,
          confidenceReason: classification.confidenceReason,
          engineMode: aiEntry ? 'gemini-4-hydrogen' : 'deterministic-taxonomy-fallback',
        });
      });

      return { normalizedPlans, auditEntries };
    } catch (err: any) {
      console.warn(
        '[normalizePlansWithGemini] Gemini API unavailable or timed out, applying deterministic HKIA taxonomy:',
        err?.message
      );
    }
  }

  // Deterministic fallback when GEMINI_API_KEY is unconfigured or offline
  const normalizedPlans: InsurancePlan[] = [];
  const auditEntries: Array<{
    id: string;
    nameEn: string;
    assignedCrmCategory: CrmStandardCategory;
    assignedEngineCategory: PlanCategory;
    standardizedHighlightsEn: [string, string, string];
    standardizedHighlightsZh: [string, string, string];
    confidenceReason: string;
    engineMode: 'gemini-4-hydrogen' | 'deterministic-taxonomy-fallback';
  }> = [];

  inputs.forEach((raw, idx) => {
    const classification = classifyPolicyFeaturesDeterministically(raw);
    const plan = buildStandardizedInsurancePlan(raw, classification, idx);
    normalizedPlans.push(plan);
    auditEntries.push({
      id: plan.id,
      nameEn: plan.nameEn,
      assignedCrmCategory: plan.crmStandardCategory!,
      assignedEngineCategory: plan.category,
      standardizedHighlightsEn: classification.standardizedHighlightsEn,
      standardizedHighlightsZh: classification.standardizedHighlightsZh,
      confidenceReason: classification.confidenceReason,
      engineMode: 'deterministic-taxonomy-fallback',
    });
  });

  return { normalizedPlans, auditEntries };
}

async function runCli() {
  const args = process.argv.slice(2);
  const inputFlagIdx = args.indexOf('--input');
  const inputFilePath = inputFlagIdx >= 0 ? args[inputFlagIdx + 1] : undefined;

  await fs.mkdir(DATA_DIR, { recursive: true });

  let existingWorkspace: Record<string, any> = {};
  if (fsSync.existsSync(WORKSPACE_FILE)) {
    try {
      existingWorkspace = JSON.parse(await fs.readFile(WORKSPACE_FILE, 'utf-8'));
    } catch {
      existingWorkspace = {};
    }
  }

  let rawInputs: RawImportedPlanInput[] = [];

  if (inputFilePath && fsSync.existsSync(inputFilePath)) {
    const fileContent = await fs.readFile(inputFilePath, 'utf-8');
    rawInputs = parseUnstructuredPlansInput(fileContent);
  } else {
    const existingCustom: RawImportedPlanInput[] = Array.isArray(existingWorkspace.customPlans)
      ? existingWorkspace.customPlans.map((p: InsurancePlan) => ({
          id: p.id,
          insurerCode: p.insurerCode,
          insurerNameEn: p.insurerNameEn,
          insurerNameZh: p.insurerNameZh,
          nameEn: p.nameEn,
          nameZh: p.nameZh,
          rawCategoryText: p.category,
          rawFeaturesText: [
            p.waitingPeriodText,
            ...(p.highlights || []),
            ...(p.keyHighlightsEn || []),
          ].join('; '),
          currencies: p.currencies,
          fulfillmentRatio: p.fulfillmentRatio,
          rawProjectedIrr: p.rawProjectedIrr,
          guaranteedIrr: p.guaranteedIrr,
          supportedPaymentTerms: p.supportedPaymentTerms,
          waitingPeriodText: p.waitingPeriodText,
          highlights: p.highlights,
          keyHighlightsEn: p.keyHighlightsEn,
          keyHighlightsZh: p.keyHighlightsZh,
          officialUrl: p.officialUrl,
        }))
      : [];
    const seenIds = new Set(existingCustom.map((item) => item.id));
    const missingSamples = SAMPLE_UNSTANDARDIZED_PLANS.filter((s) => !seenIds.has(s.id));
    rawInputs = [...existingCustom, ...missingSamples];
  }

  const ai = createGeminiServerClient();
  const { normalizedPlans, auditEntries } = await analyzeAndNormalizePlansBatch(rawInputs, ai);

  const mergedById = new Map<string, InsurancePlan>();
  for (const existing of (existingWorkspace.customPlans || []) as InsurancePlan[]) {
    if (existing?.id) mergedById.set(existing.id, existing);
  }
  for (const norm of normalizedPlans) {
    mergedById.set(norm.id, norm);
  }

  const updatedWorkspace = {
    ...existingWorkspace,
    customPlans: Array.from(mergedById.values()),
    lastPlanNormalizationIso: new Date().toISOString(),
  };

  await fs.writeFile(WORKSPACE_FILE, JSON.stringify(updatedWorkspace, null, 2), 'utf-8');
  await fs.writeFile(
    AUDIT_OUTPUT_FILE,
    JSON.stringify(
      {
        generatedAtIso: new Date().toISOString(),
        totalNormalized: normalizedPlans.length,
        auditEntries,
        normalizedPlans,
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(
    `[HK InsureHub CRM Normalizer] Normalized ${normalizedPlans.length} imported plan(s):`
  );
  for (const row of auditEntries) {
    console.log(
      `  - [${row.assignedCrmCategory} -> ${row.assignedEngineCategory}] ${row.nameEn} (${row.engineMode})`
    );
    console.log(`    Highlight 1: ${row.standardizedHighlightsEn[0]}`);
  }
  console.log(`  Audit saved to: ${AUDIT_OUTPUT_FILE}`);
}

const isDirectExecution =
  process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('normalizePlansWithGemini.ts');

if (isDirectExecution) {
  runCli().catch((err) => {
    console.error('[normalizePlansWithGemini] Fatal error:', err);
    process.exit(1);
  });
}
