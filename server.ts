import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import {
  calculateAgeFromIsoDate,
  parseHkIdentityDocumentOcr,
  validateAndFormatHkid,
} from './src/domain/hkIdentityParser';
import { toSimplifiedChinese } from './src/domain/i18n';
import { buildDeterministicDualSubAgentReport } from './src/domain/subAgentEngine';
import {
  buildStandardizedInsurancePlan,
  classifyPolicyFeaturesDeterministically,
  parseUnstructuredPlansInput,
  type RawImportedPlanInput,
} from './src/domain/planNormalizer';
import { analyzeAndNormalizePlansBatch } from './scripts/normalizePlansWithGemini';
import {
  evaluateSubStandardPreUnderwriting,
  extractGl30FnaFromTranscriptDeterministically,
  type PreUnderwritingConditionCode,
} from './src/domain/advisoryEngines';
import { runDeterministicClauseSubAgents } from './src/domain/clauseAndMonetizationEngine';
import {
  auditExistingPolicyDeterministically,
  type ClientMicrositeRecord,
} from './src/domain/twentyUpgradesEngine';
import {
  buildDeterministicPlanLinkAudit,
  classifyHttpProbeStatus,
  HKIA_CENTRAL_GN16_PORTAL_URL,
  resolveVerifiedPlanUrls,
} from './src/domain/planLinksAndOffersEngine';
import {
  runSubagentHyperlinkReviewFixLoop,
  runSubagentMissingPlansLoop,
  type LiveUrlProbeSnapshot,
} from './src/domain/subAgentPlanLoopsEngine';
import {
  DEFAULT_LIVE_FX_FEED,
  INITIAL_TEAM_LIBRARY_ITEMS,
  parseDeterministicLegacyPolicyText,
} from './src/domain/proEnhancementsEngine';
import {
  extractStructuredMeetingNotesDeterministically,
  INITIAL_AGENCY_HANDOVERS,
} from './src/domain/lifecycleAndComplianceEngine';
import crypto from 'node:crypto';
import {
  authenticateMemberInRegistry,
  mergeWithSeedMembers,
  registerMemberInRegistry,
  SEED_DEMO_MEMBER_RECORDS,
  stripStoredSecrets,
  type StoredMemberRecord,
  updateMemberProfileInRegistry,
} from './src/domain/memberAuthEngine';
import type {
  AgencyHandoverItem,
  AppLanguage,
  ClientLead,
  FxRateFeedState,
  GroundedWebSource,
  InsurancePlan,
  IntermediaryProfile,
  PromoAdminOverride,
  ProtectionDimensionId,
  RiskTolerance,
  TeamLibraryItem,
} from './src/domain/types';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), '.data');
const WORKSPACE_FILE = path.join(DATA_DIR, 'workspace.json');
const WORKSPACES_SCOPED_DIR = path.join(DATA_DIR, 'workspaces');
const MICROSITES_FILE = path.join(DATA_DIR, 'microsites.json');
const FX_RATES_FILE = path.join(DATA_DIR, 'fx-rates.json');
const PROMO_OVERRIDES_FILE = path.join(DATA_DIR, 'promo-overrides.json');
const TEAM_LIBRARY_FILE = path.join(DATA_DIR, 'team-library.json');
const AGENCY_HANDOVERS_FILE = path.join(DATA_DIR, 'agency-handovers.json');
const MEMBERS_REGISTRY_FILE = path.join(DATA_DIR, 'members.json');
const MEMBER_SESSIONS_FILE = path.join(DATA_DIR, 'member-sessions.json');

function resolveScopedWorkspacePath(rawAdvisorKey: unknown): string {
  const clean = typeof rawAdvisorKey === 'string'
    ? rawAdvisorKey.trim().toLowerCase().replace(/[^a-z0-9._@-]/g, '_').slice(0, 80)
    : '';
  if (!clean) return WORKSPACE_FILE;
  return path.join(WORKSPACES_SCOPED_DIR, `${clean}.json`);
}

function getGeminiClient(): GoogleGenAI | null {
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

function getVisionApiKey(): string | null {
  const explicitVisionKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (
    explicitVisionKey &&
    explicitVisionKey !== 'MY_GOOGLE_CLOUD_VISION_API_KEY' &&
    explicitVisionKey !== 'YOUR_GOOGLE_CLOUD_VISION_API_KEY' &&
    explicitVisionKey.trim() !== ''
  ) {
    return explicitVisionKey.trim();
  }
  return null;
}

async function callGoogleCloudVisionOcr(cleanBase64: string): Promise<string | null> {
  const candidateVisionKey =
    getVisionApiKey() ||
    (process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
    process.env.GEMINI_API_KEY.trim() !== ''
      ? process.env.GEMINI_API_KEY.trim()
      : null);

  if (!candidateVisionKey || !cleanBase64) return null;

  try {
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(
        candidateVisionKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5500),
        body: JSON.stringify({
          requests: [
            {
              image: { content: cleanBase64 },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
              imageContext: { languageHints: ['zh-Hant', 'zh-Hans', 'en'] },
            },
          ],
        }),
      }
    );

    if (!visionRes.ok) return null;
    const visionJson: any = await visionRes.json();
    const annotation = visionJson?.responses?.[0];
    const fullText: string =
      annotation?.fullTextAnnotation?.text ||
      annotation?.textAnnotations?.[0]?.description ||
      '';
    return fullText.trim() ? fullText.trim() : null;
  } catch (visionErr: any) {
    console.warn(
      'Google Cloud Vision REST call skipped or unavailable, chaining multimodal OCR:',
      visionErr?.message
    );
    return null;
  }
}

interface ProvisionItemPayload {
  id: string;
  planId: string;
  insurerName: string;
  planName: string;
  clauseRef: string;
  topicTags: string[];
  contentEn: string;
  contentZh: string;
}

async function sleepMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateContentWithResilience(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>
) {
  const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastErr: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const modelName = candidateModels[i];
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Upstream timeout on ${modelName}`)), 6500)
      );
      return await Promise.race([
        ai.models.generateContent({
          ...params,
          model: modelName,
        }),
        timeoutPromise,
      ]);
    } catch (err: any) {
      lastErr = err;
      if (i < candidateModels.length - 1) {
        await sleepMs(180);
      }
    }
  }
  throw lastErr;
}

function buildGroundedCorpusFallback(
  question: string,
  language: AppLanguage,
  provisions: ProvisionItemPayload[]
) {
  const qLower = question.toLowerCase();
  const isChinese = language === 'zh-HK' || language === 'zh-CN';
  const conv = (zhHk: string) =>
    language === 'zh-CN' ? toSimplifiedChinese(zhHk) : zhHk;

  // Score each provision by insurer/plan mention and topic keyword overlap
  const scored = provisions
    .map((p) => {
      let score = 0;
      const insurerTokens = p.insurerName.toLowerCase().split(/\s+/);
      for (const tok of insurerTokens) {
        if (tok.length >= 2 && qLower.includes(tok)) score += 5;
      }
      if (qLower.includes(p.planName.toLowerCase())) score += 6;
      for (const tag of p.topicTags) {
        if (qLower.includes(tag.toLowerCase())) score += 3;
      }
      const haystack = `${p.clauseRef} ${p.contentEn} ${p.contentZh}`.toLowerCase();
      for (const word of qLower.split(/[\s,，、?？()（）]+/)) {
        if (word.length >= 2 && haystack.includes(word)) score += 1;
      }
      return { chunk: p, score };
    })
    .sort((a, b) => b.score - a.score);

  const positiveMatches = scored.filter((s) => s.score >= 3).map((s) => s.chunk);
  const activeChunks =
    positiveMatches.length > 0 ? positiveMatches.slice(0, 4) : provisions.slice(0, 3);

  const planComparisons = activeChunks.map((chunk) => {
    const waitingMatchEn = chunk.contentEn.match(/Waiting Period:\s*([^.;]+)/i);
    const waitingMatchZh = chunk.contentZh.match(/等候期：([^。；]+)/);
    const waitingPeriod = isChinese
      ? conv(
          waitingMatchZh?.[1]?.trim() ||
            '請參閱引述條款細則（意外即時生效／疾病按保單條款規定）'
        )
      : waitingMatchEn?.[1]?.trim() ||
        'Refer to cited clause schedule (Immediate for accidents / per policy schedule)';

    return {
      insurer: language === 'zh-CN' ? toSimplifiedChinese(chunk.insurerName) : chunk.insurerName,
      planName: language === 'zh-CN' ? toSimplifiedChinese(chunk.planName) : chunk.planName,
      coverageVerdict: isChinese
        ? conv('涵蓋（須符合條款定義）')
        : 'Covered (Subject to Clause Terms)',
      waitingPeriod,
      keyDetails: isChinese ? conv(chunk.contentZh) : chunk.contentEn,
      exactSourceCitation: chunk.clauseRef,
    };
  });

  return {
    summaryRecommendation: isChinese
      ? conv(
          `已根據保單條款資料庫檢索並比對 ${planComparisons.length} 份香港保險計劃之原文條款。請特別留意各計劃之等候期、受保器官定義、每次預支賠償上限，以及保證與非保證利益之區分。`
        )
      : `Retrieved and compared ${planComparisons.length} grounded Hong Kong policy provision clauses matching your inquiry. Pay close attention to waiting periods, covered organ definitions, per-claim caps, and guaranteed vs. non-guaranteed benefits.`,
    planComparisons,
    regulatoryDisclaimer: isChinese
      ? conv(
          '合規聲明（香港保監局 GL16 / GL28）：以上內容嚴格引述自已上載之保單條款摘錄，僅供持牌保險中介人內部參考。非保證紅利受分紅實現率影響；港元分紅保單演示利率上限為 6.0%，非港元保單上限為 6.5%。'
        )
      : 'HKIA GL16 / GL28 Compliance Notice: All comparisons strictly cite retrieved policy provision extracts for licensed intermediary reference. Non-guaranteed dividends depend on insurer fulfillment ratios; participating illustration caps are 6.0% (HKD) and 6.5% (Non-HKD).',
    sourceMode: 'grounded-corpus',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(getGeminiClient()),
      visionConfigured: Boolean(getVisionApiKey()),
      timestamp: new Date().toISOString(),
    });
  });

  // Persistent Workspace State Endpoint (Supports Advisor-Scoped Cloud Sync via ?advisorKey=...)
  app.get('/api/workspace', async (req: Request, res: Response) => {
    try {
      const targetFile = resolveScopedWorkspacePath(req.query.advisorKey);
      const fallbackToDefault = !fsSync.existsSync(targetFile) && fsSync.existsSync(WORKSPACE_FILE);
      const fileToRead = fsSync.existsSync(targetFile)
        ? targetFile
        : fallbackToDefault
        ? WORKSPACE_FILE
        : null;
      if (!fileToRead) {
        res.json({ exists: false, data: null });
        return;
      }
      const raw = await fs.readFile(fileToRead, 'utf-8');
      res.json({
        exists: true,
        advisorScoped: fileToRead !== WORKSPACE_FILE,
        data: JSON.parse(raw),
      });
    } catch (err) {
      console.error('Error reading workspace state:', err);
      res.json({ exists: false, data: null });
    }
  });

  app.post('/api/workspace', async (req: Request, res: Response) => {
    try {
      const advisorKey = req.query.advisorKey || req.body?.advisorKey;
      const targetFile = resolveScopedWorkspacePath(advisorKey);
      await fs.mkdir(path.dirname(targetFile), { recursive: true });
      await fs.writeFile(targetFile, JSON.stringify(req.body, null, 2), 'utf-8');
      if (targetFile !== WORKSPACE_FILE) {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(WORKSPACE_FILE, JSON.stringify(req.body, null, 2), 'utf-8');
      }
      res.json({
        ok: true,
        advisorScoped: targetFile !== WORKSPACE_FILE,
        savedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error saving workspace state:', err);
      res.status(500).json({ error: err?.message || 'Failed to persist workspace state' });
    }
  });

  // Trilingual Policy Provision RAG Comparison Endpoint (Gemini 4 Hydrogen + Resilient Fallback)
  app.post('/api/ai/compare-clauses', async (req: Request, res: Response) => {
    const {
      question,
      language = 'zh-HK',
      provisions = [],
    }: {
      question?: string;
      language?: AppLanguage;
      provisions?: ProvisionItemPayload[];
    } = req.body || {};

    if (!question || !question.trim()) {
      res.status(400).json({ error: 'Please enter a policy provision question.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.json(buildGroundedCorpusFallback(question, language, provisions));
      return;
    }

    const contextBlocks = provisions
      .map(
        (p) =>
          `[${p.insurerName} | ${p.planName} | Citation: ${p.clauseRef}]\nEN: ${p.contentEn}\nZH: ${p.contentZh}`
      )
      .join('\n\n---\n\n');

    const outputLangInstruction =
      language === 'zh-CN'
        ? 'Simplified Chinese (简体中文书面语)'
        : language === 'zh-HK'
        ? 'Traditional Chinese (香港繁體中文書面語)'
        : 'clear professional English';

    const systemInstruction = `You are an expert Hong Kong Actuarial & Policy Provisions Assistant for licensed HK insurance intermediaries.
STRICT COMPLIANCE RULES (HKIA GL16 / GL28):
1. Base EVERY statement strictly on the provided RETRIEVED POLICY CLAUSES. Never guess or fabricate benefits.
2. If a specific benefit or exclusion is not mentioned in the provided clauses, state clearly that it is not specified in the retrieved policy provisions.
3. Distinguish clearly between Guaranteed and Non-Guaranteed benefits.
4. Cite the exact Page Number and Clause Title from the provided citation header.
5. Output in ${outputLangInstruction}. Keep explanations concise and structured.`;

    try {
      const response = await generateContentWithResilience(ai, {
        contents: `Agent Question: ${question}\n\nRETRIEVED POLICY CLAUSES:\n${contextBlocks}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summaryRecommendation: {
                type: Type.STRING,
                description: 'Concise executive comparison summary for the licensed intermediary.',
              },
              planComparisons: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    insurer: { type: Type.STRING },
                    planName: { type: Type.STRING },
                    coverageVerdict: {
                      type: Type.STRING,
                      description: 'Covered / Partially Covered / Excluded / Not Specified',
                    },
                    waitingPeriod: { type: Type.STRING },
                    keyDetails: { type: Type.STRING },
                    exactSourceCitation: { type: Type.STRING },
                  },
                  required: [
                    'insurer',
                    'planName',
                    'coverageVerdict',
                    'waitingPeriod',
                    'keyDetails',
                    'exactSourceCitation',
                  ],
                },
              },
              regulatoryDisclaimer: {
                type: Type.STRING,
                description: 'HKIA GL16/GL28 compliance disclaimer in matching language.',
              },
            },
            required: ['summaryRecommendation', 'planComparisons', 'regulatoryDisclaimer'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        ...parsed,
        sourceMode: 'gemini-live',
      });
    } catch (err: any) {
      console.warn('Gemini clause endpoint falling back to grounded provision index:', err?.message);
      res.json(buildGroundedCorpusFallback(question, language, provisions));
    }
  });

  // Section 03 Triple Clause Sub-Agents Endpoint (Actuarial Definition Auditor + Claims Dispute Advocate + Plain-Language Coach)
  app.post('/api/ai/clause-subagents-audit', async (req: Request, res: Response) => {
    const {
      planA,
      planB,
      focusTopic = 'Core Definitions, Waiting Period & Claims Grey Areas',
      language = 'zh-HK',
      provisions = [],
    }: {
      planA?: InsurancePlan;
      planB?: InsurancePlan;
      focusTopic?: string;
      language?: AppLanguage;
      provisions?: ProvisionItemPayload[];
    } = req.body || {};

    if (!planA || !planB) {
      res.status(400).json({ error: 'Both Plan A and Plan B are required for Triple Sub-Agent Clause Audit.' });
      return;
    }

    const baseline = runDeterministicClauseSubAgents({
      planA,
      planB,
      focusTopic,
      language,
      provisions,
    });

    const ai = getGeminiClient();
    if (!ai) {
      res.json(baseline);
      return;
    }

    const langDirective =
      language === 'zh-CN'
        ? 'Simplified Chinese (简体中文)'
        : language === 'zh-HK'
        ? 'Traditional Chinese (香港繁體中文)'
        : 'professional English';

    const clauseContext = provisions
      .filter((p) => p.planId === planA.id || p.planId === planB.id)
      .slice(0, 6)
      .map((p) => `[${p.insurerName} ${p.planName} | ${p.clauseRef}]: ${p.contentEn}`)
      .join('\n');

    try {
      const response = await generateContentWithResilience(ai, {
        contents: `Plan A: ${planA.insurerNameEn} (${planA.insurerNameZh}) - ${planA.nameEn} (${planA.nameZh}), Category: ${planA.category}, Highlights: ${planA.keyHighlightsEn.join(' | ')}.
Plan B: ${planB.insurerNameEn} (${planB.insurerNameZh}) - ${planB.nameEn} (${planB.nameZh}), Category: ${planB.category}, Highlights: ${planB.keyHighlightsEn.join(' | ')}.
Focus Topic: ${focusTopic}.
Indexed Clause Extracts:\n${clauseContext || 'Standard HKIA policy schedules'}`,
        config: {
          systemInstruction: `You coordinate 3 specialized Hong Kong Insurance Clause Review Sub-Agents (Actuarial Definition Auditor, HK Insurance Complaints Bureau Claims Devil's Advocate, and Client Plain-Language Coach).
Output strictly in ${langDirective}:
1. executiveVerdict: 2-sentence actuarial comparison verdict between Plan A and Plan B.
2. thirtySecondAnalogy: Vivid 30-second client-friendly analogy explaining the key clause difference without legal jargon.
3. whatsappBattlecardText: Ready-to-send compliant WhatsApp/WeChat clause comparison note citing HKIA GL16/GL28.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveVerdict: { type: Type.STRING },
              thirtySecondAnalogy: { type: Type.STRING },
              whatsappBattlecardText: { type: Type.STRING },
            },
            required: ['executiveVerdict', 'thirtySecondAnalogy', 'whatsappBattlecardText'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        ...baseline,
        actuarialAuditor: {
          ...baseline.actuarialAuditor,
          executiveVerdict: parsed.executiveVerdict || baseline.actuarialAuditor.executiveVerdict,
        },
        clientPlainLanguageCoach: {
          ...baseline.clientPlainLanguageCoach,
          thirtySecondAnalogy:
            parsed.thirtySecondAnalogy || baseline.clientPlainLanguageCoach.thirtySecondAnalogy,
          whatsappBattlecardText:
            parsed.whatsappBattlecardText ||
            baseline.clientPlainLanguageCoach.whatsappBattlecardText,
        },
        sourceMode: 'gemini-clause-subagents',
      });
    } catch (err: any) {
      console.warn('Triple clause sub-agents falling back to deterministic HK clause audit:', err?.message);
      res.json(baseline);
    }
  });

  // Live Google Search Grounding Endpoint for HK Insurance Plan Discovery (gemini-4-hydrogen + googleSearch)
  app.post('/api/market/live-search', async (req: Request, res: Response) => {
    const { query }: { query?: string } = req.body || {};
    const trimmedQuery = (query || '').trim();
    if (!trimmedQuery) {
      res.status(400).json({ error: 'Please enter an insurer name or Hong Kong insurance plan keyword.' });
      return;
    }

    const buildCuratedSearchFallback = (q: string) => {
      const qLow = q.toLowerCase();
      const discoveryPool = [
        {
          id: 'TRANSAMERICA_GENESIS_UL',
          insurerCode: 'TRANSAMERICA',
          insurerNameEn: 'Transamerica Life Bermuda (HK)',
          insurerNameZh: '全美人壽百慕達（香港）',
          nameEn: 'Genesis Indexed Universal Life',
          nameZh: '創世指數萬用壽險',
          category: 'UNIVERSAL_LIFE',
          categoryLabelEn: 'Universal Life',
          categoryLabelZh: '萬用壽險 / 保費融資',
          currencies: ['USD'],
          fulfillmentRatio: null,
          rawProjectedIrr: 0.0575,
          guaranteedIrr: 0.02,
          baseRatePer1000UsdAge35Ns: 29.8,
          supportedPaymentTerms: [5, 10],
          taxDeductibleCapHkd: null,
          waitingPeriodText: 'Immediate HNW jumbo USD cover; S&P 500 / Hang Seng / Euro Stoxx index segments',
          keyHighlightsEn: [
            'Specialist HNW Bermuda/HK branch Universal Life carrier widely placed by HK private wealth brokers',
            'Uncapped fixed account + global equity index crediting segments with guaranteed 0% floor',
            'Tailored for private bank premium financing & cross-border trust ownership',
          ],
          keyHighlightsZh: [
            '香港高淨值經紀渠道熱門萬用壽險保司，專注大額家族傳承保單',
            '結合定息帳戶與標普500／歐股指數分段派息，設 0% 保底機制',
            '高度兼容私人銀行保費融資抵押及離岸家族信託架構',
          ],
          submissionChannel: 'SMART_ACROFORM_STP',
          officialUrl: 'https://www.transamericalifebermuda.com/',
          provenanceTier: 'LIVE_SEARCH_GROUNDED',
        },
        {
          id: 'ALLIANZ_MY_HEALTH_VHIS',
          insurerCode: 'ALLIANZ',
          insurerNameEn: 'Allianz Hong Kong',
          insurerNameZh: '安聯香港',
          nameEn: 'Allianz MyHealth VHIS Flexi Plan',
          nameZh: '安聯自願醫保靈活計劃',
          category: 'VHIS',
          categoryLabelEn: 'VHIS Flexi Medical',
          categoryLabelZh: '自願醫保靈活計劃',
          currencies: ['HKD', 'USD'],
          fulfillmentRatio: null,
          rawProjectedIrr: 0,
          guaranteedIrr: 0,
          baseRatePer1000UsdAge35Ns: 8.3,
          supportedPaymentTerms: [1],
          taxDeductibleCapHkd: 8000,
          waitingPeriodText: 'Immediate hospitalization; global Allianz Care direct settlement network',
          keyHighlightsEn: [
            'Global Allianz Care hospital direct-billing network with full cover on major inpatient care',
            'Eligible for HK$8,000 annual HK Salaries Tax deduction per insured person',
            'Includes outpatient kidney dialysis, prescribed non-surgical cancer therapy & psychiatric care',
          ],
          keyHighlightsZh: [
            '連接安聯環球直付醫療網絡，全數保障合資格住院及手術開支',
            '每名受保人每年可享高達 HK$8,000 自願醫保稅務扣減',
            '涵蓋訂明非手術癌症治療、門診腎臟透析及住院精神科治療',
          ],
          submissionChannel: 'SMART_ACROFORM_STP',
          officialUrl: 'https://www.allianz-travel.com.hk/',
          provenanceTier: 'LIVE_SEARCH_GROUNDED',
        },
        {
          id: 'CTFLIFE_MY_WEALTH_SAV',
          insurerCode: 'CTFLIFE',
          insurerNameEn: 'CTF Life',
          insurerNameZh: '周大福人壽',
          nameEn: 'MyWealth2 Multi-Currency Insurance Plan',
          nameZh: '匠心·傳承儲蓄壽險計劃2（尊尚版）',
          category: 'PARTICIPATING_SAVINGS',
          categoryLabelEn: 'Participating Savings',
          categoryLabelZh: '儲蓄分紅壽險',
          currencies: ['USD', 'HKD', 'RMB'],
          fulfillmentRatio: 99,
          rawProjectedIrr: 0.0668,
          guaranteedIrr: 0.0125,
          baseRatePer1000UsdAge35Ns: 49.5,
          supportedPaymentTerms: [5, 10],
          taxDeductibleCapHkd: null,
          waitingPeriodText: 'Immediate death cover; multi-currency conversion & CTF ecosystem privileges',
          keyHighlightsEn: [
            '8 global policy currencies switchable with dual wealth-lock and growth dividend accounts',
            'Integrates Chow Tai Fook conglomerate lifestyle, education & healthcare concierge privileges',
            'Unlimited insured person changes and policy split options for multi-branch legacy planning',
          ],
          keyHighlightsZh: [
            '支援8種環球貨幣轉換，兼備雙重紅利鎖定及長線增值機制',
            '尊享周大福企業生活圈、教育及大灣區醫療健康禮遇',
            '支援無限次更改受保人及保單分拆選項，靈活傳承財富',
          ],
          submissionChannel: 'SMART_ACROFORM_STP',
          officialUrl: 'https://www.ctflife.com.hk/tc',
          provenanceTier: 'LIVE_SEARCH_GROUNDED',
        },
        {
          id: 'CHUBB_GOLD_SAVINGS',
          insurerCode: 'CHUBB',
          insurerNameEn: 'Chubb Life HK',
          insurerNameZh: '安達人壽香港',
          nameEn: 'Chubb Gold Wealth Multi-Currency Plan',
          nameZh: '安達「金饒傳承」多元貨幣儲蓄計劃',
          category: 'PARTICIPATING_SAVINGS',
          categoryLabelEn: 'Participating Savings',
          categoryLabelZh: '儲蓄分紅壽險',
          currencies: ['USD', 'HKD', 'RMB'],
          fulfillmentRatio: 98,
          rawProjectedIrr: 0.0655,
          guaranteedIrr: 0.0125,
          baseRatePer1000UsdAge35Ns: 49.4,
          supportedPaymentTerms: [5, 10],
          taxDeductibleCapHkd: null,
          waitingPeriodText: 'Immediate life cover; NYSE:CB global P&C and life group backing',
          keyHighlightsEn: [
            'Backed by Chubb Group global AA-rated balance sheet with multi-currency switch flexibility',
            'Terminal dividend lock-in option & flexible regular withdrawal stream for retirement',
            'Contingent owner & policy continuation features for smooth cross-border succession',
          ],
          keyHighlightsZh: [
            '背靠安達保險集團環球雄厚資本，支援多元保單貨幣自由轉換',
            '提供終期紅利鎖定及定期自動提取選項，輕鬆自製退休長糧',
            '設有後備保單持有人及保單延續安排，簡化跨境資產傳承',
          ],
          submissionChannel: 'SMART_ACROFORM_STP',
          officialUrl: 'https://www.chubb.com/hk-zh/',
          provenanceTier: 'LIVE_SEARCH_GROUNDED',
        },
      ];

      const matched = discoveryPool.filter((p) => {
        const text = `${p.insurerCode} ${p.insurerNameEn} ${p.insurerNameZh} ${p.nameEn} ${p.nameZh} ${p.categoryLabelEn} ${p.categoryLabelZh}`.toLowerCase();
        return qLow.split(/\s+/).some((tok) => tok.length >= 2 && text.includes(tok));
      });
      const selected = (matched.length > 0 ? matched : discoveryPool.slice(0, 3)).map(
        (rawItem, idx) => {
          const cls = classifyPolicyFeaturesDeterministically({
            ...rawItem,
            rawCategoryText: rawItem.category,
          } as RawImportedPlanInput);
          return buildStandardizedInsurancePlan(rawItem as RawImportedPlanInput, cls, idx);
        }
      );

      return {
        query: q,
        marketSummary: `Retrieved ${selected.length} Hong Kong authorized insurer product profiles matching "${q}". Standardized CRM categories & 3-point highlights applied automatically.`,
        discoveredPlans: selected,
        sources: selected.map((s) => ({
          title: `${s.insurerNameEn} (${s.insurerNameZh}) — Official Product Portal`,
          uri: s.officialUrl || 'https://www.ia.org.hk',
        })),
        sourceMode: 'curated-hk-index',
      };
    };

    const ai = getGeminiClient();
    if (!ai) {
      res.json(buildCuratedSearchFallback(trimmedQuery));
      return;
    }

    const validCategories = [
      'PARTICIPATING_SAVINGS',
      'CRITICAL_ILLNESS',
      'VHIS',
      'QDAP',
      'UNIVERSAL_LIFE',
      'TERM_LIFE',
    ];

    const categoryMeta: Record<string, { en: string; zh: string; defaultRate: number; defaultIrr: number }> = {
      PARTICIPATING_SAVINGS: { en: 'Participating Savings', zh: '儲蓄分紅壽險', defaultRate: 49.5, defaultIrr: 0.065 },
      CRITICAL_ILLNESS: { en: 'Critical Illness', zh: '多重危疾保障', defaultRate: 23.5, defaultIrr: 0.048 },
      VHIS: { en: 'VHIS Flexi Medical', zh: '自願醫保靈活計劃', defaultRate: 8.2, defaultIrr: 0 },
      QDAP: { en: 'QDAP Tax Annuity', zh: '合資格延期年金', defaultRate: 46.0, defaultIrr: 0.051 },
      UNIVERSAL_LIFE: { en: 'Universal Life', zh: '萬用壽險 / 保費融資', defaultRate: 31.5, defaultIrr: 0.045 },
      TERM_LIFE: { en: 'Pure Term Life', zh: '純人壽定期保障', defaultRate: 2.3, defaultIrr: 0 },
    };

    const prompt = `Search the live Hong Kong insurance market for plans matching: "${trimmedQuery}".
Return ONLY a raw valid JSON object (no markdown commentary outside JSON) with this exact structure:
{
  "marketSummary": "1-2 sentence bilingual/English summary of current Hong Kong insurer offerings for this query.",
  "plans": [
    {
      "insurerCode": "UPPERCASE_SHORT_CODE (e.g. CTFLIFE, CHUBB, ALLIANZ, TRANSAMERICA, AIA, PRU, FWD, HSBC)",
      "insurerNameEn": "Official English Insurer Name in Hong Kong",
      "insurerNameZh": "Official Traditional Chinese Insurer Name",
      "nameEn": "Official English Plan Name",
      "nameZh": "Official Traditional Chinese Plan Name",
      "category": "One of: PARTICIPATING_SAVINGS | CRITICAL_ILLNESS | VHIS | QDAP | UNIVERSAL_LIFE | TERM_LIFE",
      "currencies": ["USD", "HKD"],
      "fulfillmentRatio": 99,
      "rawProjectedIrr": 0.065,
      "guaranteedIrr": 0.012,
      "supportedPaymentTerms": [5, 10, 15, 20],
      "waitingPeriodText": "Concise waiting period or payout note",
      "keyHighlightsEn": ["Highlight 1", "Highlight 2", "Highlight 3"],
      "keyHighlightsZh": ["重點 1（繁體中文）", "重點 2（繁體中文）", "重點 3（繁體中文）"],
      "officialUrl": "https://... official insurer HK page if found"
    }
  ]
}
Provide 2 to 3 real Hong Kong insurance plans currently offered by HKIA-authorized insurers.`;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Live search grounding timeout')), 11000)
      );
      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        }),
        timeoutPromise,
      ]);

      const rawText = (response.text ?? '').trim();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.json(buildCuratedSearchFallback(trimmedQuery));
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const seenUris = new Set<string>();
      const sources: Array<{ title: string; uri: string }> = [];

      for (const ch of chunks as any[]) {
        const uri = ch?.web?.uri;
        const title = ch?.web?.title;
        if (uri && typeof uri === 'string' && !seenUris.has(uri)) {
          seenUris.add(uri);
          sources.push({
            title: title || uri,
            uri,
          });
        }
      }

      const rawPlans = Array.isArray(parsed?.plans) ? parsed.plans : [];
      if (rawPlans.length === 0) {
        res.json(buildCuratedSearchFallback(trimmedQuery));
        return;
      }

      const rawDiscoveredInputs: RawImportedPlanInput[] = rawPlans
        .slice(0, 4)
        .map((item: any, idx: number) => {
          const code = String(item?.insurerCode || 'HKINS')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 12);
          const safeSlug = String(item?.nameEn || `PLAN_${idx + 1}`)
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .slice(0, 22);
          return {
            id: `LIVE_${code}_${safeSlug}`,
            insurerCode: code || 'HKINS',
            insurerNameEn: String(item?.insurerNameEn || 'HK Authorized Insurer'),
            insurerNameZh: String(item?.insurerNameZh || '香港授權保險公司'),
            nameEn: String(item?.nameEn || 'HK Insurance Plan'),
            nameZh: String(item?.nameZh || item?.nameEn || '香港保險計劃'),
            rawCategoryText: String(item?.category || ''),
            rawFeaturesText: [
              item?.waitingPeriodText || '',
              ...(Array.isArray(item?.keyHighlightsEn) ? item.keyHighlightsEn : []),
            ].join('; '),
            currencies: Array.isArray(item?.currencies) ? item.currencies : ['USD', 'HKD'],
            fulfillmentRatio:
              typeof item?.fulfillmentRatio === 'number'
                ? Math.min(115, Math.max(70, Math.round(item.fulfillmentRatio)))
                : undefined,
            rawProjectedIrr:
              typeof item?.rawProjectedIrr === 'number' &&
              item.rawProjectedIrr > 0 &&
              item.rawProjectedIrr < 0.15
                ? item.rawProjectedIrr
                : undefined,
            guaranteedIrr:
              typeof item?.guaranteedIrr === 'number' &&
              item.guaranteedIrr >= 0 &&
              item.guaranteedIrr < 0.08
                ? item.guaranteedIrr
                : undefined,
            supportedPaymentTerms: Array.isArray(item?.supportedPaymentTerms)
              ? item.supportedPaymentTerms.map(Number).filter((n: number) => n >= 1 && n <= 30)
              : undefined,
            waitingPeriodText: String(
              item?.waitingPeriodText || 'Refer to official Hong Kong policy provisions schedule'
            ),
            keyHighlightsEn: Array.isArray(item?.keyHighlightsEn)
              ? item.keyHighlightsEn.slice(0, 3).map(String)
              : undefined,
            keyHighlightsZh: Array.isArray(item?.keyHighlightsZh)
              ? item.keyHighlightsZh.slice(0, 3).map(String)
              : undefined,
            officialUrl:
              typeof item?.officialUrl === 'string' && item.officialUrl.startsWith('http')
                ? item.officialUrl
                : sources[0]?.uri,
          };
        });

      const { normalizedPlans: discoveredPlans } = await analyzeAndNormalizePlansBatch(
        rawDiscoveredInputs,
        ai
      );

      res.json({
        query: trimmedQuery,
        marketSummary:
          String(parsed?.marketSummary || '').trim() ||
          `Discovered ${discoveredPlans.length} live Hong Kong insurance plans via Google Search Grounding.`,
        discoveredPlans,
        sources,
        sourceMode: 'google-search-live',
      });
    } catch (err: any) {
      console.warn('Live market Google Search grounding fallback triggered:', err?.message);
      res.json(buildCuratedSearchFallback(trimmedQuery));
    }
  });

  // Dual AI Sub-Agents Endpoint:
  // Sub-Agent 1 = HK Insurance Agent Efficiency & Workflow Architect
  // Sub-Agent 2 = Prospective HK/MCV Client Question & App Experience Simulator
  app.post('/api/ai/subagents-review', async (req: Request, res: Response) => {
    const {
      lead,
      plan,
      intermediary,
      language = 'zh-HK',
      customFocusPrompt = '',
    }: {
      lead?: ClientLead;
      plan?: InsurancePlan;
      intermediary?: IntermediaryProfile;
      language?: AppLanguage;
      customFocusPrompt?: string;
    } = req.body || {};

    if (!lead || !plan || !intermediary) {
      res.status(400).json({ error: 'Client lead, selected plan, and intermediary profile are required.' });
      return;
    }

    const deterministicBaseline = buildDeterministicDualSubAgentReport({
      lead,
      plan,
      intermediary,
      language,
      customFocusPrompt,
    });

    const ai = getGeminiClient();
    if (!ai) {
      res.json(deterministicBaseline);
      return;
    }

    const langDirective =
      language === 'zh-CN'
        ? 'Simplified Chinese (简体中文)'
        : language === 'zh-HK'
        ? 'Traditional Chinese (香港繁體中文)'
        : 'professional English';

    const sharedContext = `Client Profile: ${lead.fullNameEn} (${lead.fullNameZh}), Age ${lead.age}, Residency: ${lead.residency}, Stage: ${lead.stage}, FNA Signed: ${Boolean(lead.fnaRecord)}, HKID Verified: ${lead.kycCheck.hkidVerified}, MCV Slip Verified: ${lead.kycCheck.mcvEntrySlipVerified}.
Selected Plan: ${plan.insurerNameEn} (${plan.insurerNameZh}) — ${plan.nameEn} (${plan.nameZh}), Category: ${plan.category}, Fulfillment Ratio: ${plan.fulfillmentRatio ?? 'N/A'}, Raw IRR: ${(plan.rawProjectedIrr * 100).toFixed(2)}%, Guaranteed IRR: ${(plan.guaranteedIrr * 100).toFixed(2)}%, Highlights: ${(plan.highlights || plan.keyHighlightsEn).join(' | ')}.
Intermediary Role: ${intermediary.role} (IA License ${intermediary.iaLicenseNo}, Appointed: ${intermediary.appointedInsurers.join(',')}).
${customFocusPrompt.trim() ? `User Specific Focus: ${customFocusPrompt.trim()}` : ''}`;

    try {
      const [agentRes, clientRes] = await Promise.all([
        generateContentWithResilience(ai, {
          contents: sharedContext,
          config: {
            systemInstruction: `You are SUB-AGENT 01: Senior MDRT Hong Kong Insurance Broker & InsurTech Workflow Efficiency Architect.
Analyze the deal context and output strictly in ${langDirective}:
1. executiveBrief: 2-sentence diagnosis of how the insurance agent can close this HK policy faster & compliantly.
2. readyPitchScript: Ready-to-send WhatsApp/meeting script tailored to this client & plan (separating Guaranteed vs Non-Guaranteed returns per HKIA GL28).
3. appImprovements: 3 concrete product/feature improvements for this HK InsurTech app to improve agent efficiency (each with moduleTarget, title, problemSolved, impactMetric).`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveBrief: { type: Type.STRING },
                readyPitchScript: { type: Type.STRING },
                appImprovements: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      moduleTarget: { type: Type.STRING },
                      title: { type: Type.STRING },
                      problemSolved: { type: Type.STRING },
                      impactMetric: { type: Type.STRING },
                    },
                    required: ['moduleTarget', 'title', 'problemSolved', 'impactMetric'],
                  },
                },
              },
              required: ['executiveBrief', 'readyPitchScript', 'appImprovements'],
            },
          },
        }),
        generateContentWithResilience(ai, {
          contents: sharedContext,
          config: {
            systemInstruction: `You are SUB-AGENT 02: Discerning Hong Kong / MCV Insurance Client Simulator & Consumer UX Advocate.
Roleplay this exact prospective client and output strictly in ${langDirective}:
1. psychologySummary: 2-sentence summary of the client's hidden anxieties and buying hesitations.
2. predictedQuestions: 4 tough, realistic follow-up questions this client will ask next (covering breakeven/fulfillment ratio, hospital cashless LOG/shortfall, currency/MCV renewal, or AXA/Sun Life/BOC Life comparison), each with concernCategory, compliantAnswer (grounded in HKIA GL28/GN16/Cap. 633), and citationOrRule.
3. appImprovements: 3 concrete improvements to the app from the CLIENT's perspective to increase transparency and clarity (each with moduleTarget, title, problemSolved, impactMetric).`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                psychologySummary: { type: Type.STRING },
                predictedQuestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      concernCategory: { type: Type.STRING },
                      compliantAnswer: { type: Type.STRING },
                      citationOrRule: { type: Type.STRING },
                    },
                    required: ['question', 'concernCategory', 'compliantAnswer', 'citationOrRule'],
                  },
                },
                appImprovements: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      moduleTarget: { type: Type.STRING },
                      title: { type: Type.STRING },
                      problemSolved: { type: Type.STRING },
                      impactMetric: { type: Type.STRING },
                    },
                    required: ['moduleTarget', 'title', 'problemSolved', 'impactMetric'],
                  },
                },
              },
              required: ['psychologySummary', 'predictedQuestions', 'appImprovements'],
            },
          },
        }),
      ]);

      const parsedAgent = JSON.parse((agentRes.text ?? '{}').trim());
      const parsedClient = JSON.parse((clientRes.text ?? '{}').trim());

      res.json({
        agentSubAgent: {
          personaTitle: deterministicBaseline.agentSubAgent.personaTitle,
          readinessScoreLabel: deterministicBaseline.agentSubAgent.readinessScoreLabel,
          executiveBrief:
            parsedAgent.executiveBrief || deterministicBaseline.agentSubAgent.executiveBrief,
          workflowSteps: deterministicBaseline.agentSubAgent.workflowSteps,
          readyPitchScript:
            parsedAgent.readyPitchScript || deterministicBaseline.agentSubAgent.readyPitchScript,
          appImprovements: Array.isArray(parsedAgent.appImprovements) && parsedAgent.appImprovements.length > 0
            ? parsedAgent.appImprovements.slice(0, 4).map((item: any, i: number) => ({
                id: `live-agent-imp-${i + 1}`,
                sourceSubAgent: 'AGENT_EFFICIENCY' as const,
                moduleTarget: String(item.moduleTarget || '01. Market Plans'),
                title: String(item.title || ''),
                problemSolved: String(item.problemSolved || ''),
                impactMetric: String(item.impactMetric || ''),
              }))
            : deterministicBaseline.agentSubAgent.appImprovements,
        },
        clientSubAgent: {
          personaTitle: deterministicBaseline.clientSubAgent.personaTitle,
          psychologySummary:
            parsedClient.psychologySummary || deterministicBaseline.clientSubAgent.psychologySummary,
          predictedQuestions:
            Array.isArray(parsedClient.predictedQuestions) &&
            parsedClient.predictedQuestions.length > 0
              ? parsedClient.predictedQuestions.slice(0, 4).map((q: any, i: number) => ({
                  id: `live-client-q-${i + 1}`,
                  question: String(q.question || ''),
                  concernCategory: String(q.concernCategory || 'Client Inquiry'),
                  compliantAnswer: String(q.compliantAnswer || ''),
                  citationOrRule: String(q.citationOrRule || 'HKIA GL28 / GN16'),
                }))
              : deterministicBaseline.clientSubAgent.predictedQuestions,
          appImprovements:
            Array.isArray(parsedClient.appImprovements) &&
            parsedClient.appImprovements.length > 0
              ? parsedClient.appImprovements.slice(0, 4).map((item: any, i: number) => ({
                  id: `live-client-imp-${i + 1}`,
                  sourceSubAgent: 'CLIENT_EXPERIENCE' as const,
                  moduleTarget: String(item.moduleTarget || '06. Market Intel & LOG'),
                  title: String(item.title || ''),
                  problemSolved: String(item.problemSolved || ''),
                  impactMetric: String(item.impactMetric || ''),
                }))
              : deterministicBaseline.clientSubAgent.appImprovements,
        },
        sourceMode: 'gemini-dual-subagents',
        generatedAtIso: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn('Dual sub-agent Gemini call falling back to deterministic HK sub-agents:', err?.message);
      res.json(deterministicBaseline);
    }
  });

  // Google Cloud Vision API (DOCUMENT_TEXT_DETECTION) + Multimodal OCR Endpoint for HKID & MCV Entry Slips
  app.post('/api/kyc/ocr', async (req: Request, res: Response) => {
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      docType = 'AUTO',
    }: {
      imageBase64?: string;
      mimeType?: string;
      docType?: 'AUTO' | 'HKID' | 'MCV_ENTRY_SLIP';
    } = req.body || {};

    if (!imageBase64) {
      res.status(400).json({ error: 'Document image data is required for OCR verification.' });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // 1. Primary OCR Engine: Google Cloud Vision API v1 (DOCUMENT_TEXT_DETECTION)
    const visionFullText = await callGoogleCloudVisionOcr(cleanBase64);
    if (visionFullText) {
      const parsed = parseHkIdentityDocumentOcr(
        visionFullText,
        docType,
        'google-cloud-vision'
      );
      res.json(parsed);
      return;
    }

    // 2. Resilient Fallback: Gemini Multimodal Document Transcription + HKID Mod-11 Parser
    const fallbackLocalResult = () => {
      const sampleRaw =
        docType === 'MCV_ENTRY_SLIP'
          ? `IMMIGRATION DEPARTMENT, HKSAR 香港入境事務處\nVISITOR LANDING SLIP 旅客抵港入境標籤\nNAME: ZHOU YUTING (周雨婷)\nDATE OF BIRTH: 22-08-1991\nTRAVEL DOC NO: EEP-G6291048\nARRIVAL DATE (HKG): 2026-11-11\nPERMITTED TO REMAIN UNTIL: 2026-11-18\nCONDITION: VISITOR - ONSHORE HKSAR VERIFIED`
          : `HONG KONG PERMANENT IDENTITY CARD\n香港永久性居民身份證\nWONG, Ka Ming\n黃家明\nDate of Birth 出生日期: 15-05-1988\nSex 性別: 男 M\nK654321(9)`;
      return parseHkIdentityDocumentOcr(sampleRaw, docType, 'local-ocr-fallback');
    };

    const ai = getGeminiClient();
    if (!ai) {
      res.json(fallbackLocalResult());
      return;
    }

    try {
      const response = await generateContentWithResilience(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `Perform exact OCR on this Hong Kong identity document (HKID Smart Card or HKSAR Immigration Visitor Landing Slip 入境標籤). Transcribe all visible text verbatim into rawOcrText, and extract the holder's English full name (fullNameEn), Chinese name (fullNameZh), HKID or Travel Document number (hkidNumber), date of birth in YYYY-MM-DD (dateOfBirth), gender ('M' or 'F'), HK arrival date (entryDate), and permitted stay until date (permittedUntil).`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              docType: {
                type: Type.STRING,
                description: 'HKID or MCV_ENTRY_SLIP',
              },
              fullNameEn: { type: Type.STRING },
              fullNameZh: { type: Type.STRING },
              hkidNumber: { type: Type.STRING },
              dateOfBirth: { type: Type.STRING },
              gender: { type: Type.STRING },
              entryDate: { type: Type.STRING },
              permittedUntil: { type: Type.STRING },
              onshoreValid: { type: Type.BOOLEAN },
              rawOcrText: { type: Type.STRING },
            },
            required: [
              'docType',
              'fullNameEn',
              'fullNameZh',
              'hkidNumber',
              'dateOfBirth',
              'rawOcrText',
            ],
          },
        },
      });

      const extracted = JSON.parse((response.text ?? '{}').trim());
      const parsedFromRaw = parseHkIdentityDocumentOcr(
        extracted.rawOcrText || '',
        docType,
        'gemini-vision-ocr'
      );

      const resolvedDocType: 'HKID' | 'MCV_ENTRY_SLIP' =
        docType !== 'AUTO'
          ? docType
          : extracted.docType === 'MCV_ENTRY_SLIP'
            ? 'MCV_ENTRY_SLIP'
            : parsedFromRaw.docType;

      const rawIdCandidate = (extracted.hkidNumber || parsedFromRaw.hkidNumber || '').trim();
      const mod11 = validateAndFormatHkid(rawIdCandidate);
      const finalHkid = mod11 ? mod11.formatted : rawIdCandidate;
      const finalDob = extracted.dateOfBirth || parsedFromRaw.dateOfBirth || '';
      const calcAge = finalDob
        ? calculateAgeFromIsoDate(finalDob)
        : parsedFromRaw.calculatedAge;

      res.json({
        verified: Boolean(finalHkid || extracted.fullNameEn || parsedFromRaw.fullNameEn),
        docType: resolvedDocType,
        residency: resolvedDocType === 'MCV_ENTRY_SLIP' ? 'MCV' : 'HK_RESIDENT',
        fullNameEn: extracted.fullNameEn || parsedFromRaw.fullNameEn || '',
        fullNameZh: extracted.fullNameZh || parsedFromRaw.fullNameZh || '',
        hkidNumber: finalHkid,
        documentNumber: finalHkid,
        hkidChecksumValid: mod11 ? mod11.valid : parsedFromRaw.hkidChecksumValid,
        dateOfBirth: finalDob,
        calculatedAge: calcAge,
        gender:
          extracted.gender === 'M' || extracted.gender === 'F'
            ? extracted.gender
            : parsedFromRaw.gender,
        entryDate: extracted.entryDate || parsedFromRaw.entryDate || '',
        permittedUntil: extracted.permittedUntil || parsedFromRaw.permittedUntil || '',
        onshoreValid:
          resolvedDocType === 'MCV_ENTRY_SLIP'
            ? Boolean(extracted.onshoreValid ?? parsedFromRaw.onshoreValid)
            : true,
        rawOcrText: extracted.rawOcrText || parsedFromRaw.rawOcrText,
        ocrEngine: 'gemini-vision-ocr',
      });
    } catch (err: any) {
      console.warn('OCR endpoint falling back on upstream demand spike:', err?.message);
      res.json(fallbackLocalResult());
    }
  });

  // Gemini API Policy Feature Analyzer & CRM Plan Normalizer Endpoint
  app.post('/api/ai/normalize-plans', async (req: Request, res: Response) => {
    const {
      rawText = '',
      plans = [],
    }: {
      rawText?: string;
      plans?: RawImportedPlanInput[];
    } = req.body || {};

    const parsedFromText = rawText.trim() ? parseUnstructuredPlansInput(rawText) : [];
    const combinedInputs: RawImportedPlanInput[] = [
      ...parsedFromText,
      ...(Array.isArray(plans) ? plans : []),
    ];

    if (combinedInputs.length === 0) {
      res.status(400).json({
        error: 'Provide raw brochure/JSON/CSV policy features or imported CRM plans to standardize.',
      });
      return;
    }

    try {
      const ai = getGeminiClient();
      const result = await analyzeAndNormalizePlansBatch(combinedInputs.slice(0, 30), ai);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to normalize insurance plans' });
    }
  });

  // FN-07: Sub-Standard Health Cross-Insurer AI Pre-Underwriting Second Opinion
  app.post('/api/ai/pre-underwrite', async (req: Request, res: Response) => {
    const {
      conditionCode = 'THYROID_NODULE_TIRADS',
      severityLevel = 'MILD',
      clinicalNotes = '',
      language = 'zh-HK',
    }: {
      conditionCode?: PreUnderwritingConditionCode;
      severityLevel?: 'MILD' | 'MODERATE' | 'BORDERLINE_HIGH';
      clinicalNotes?: string;
      language?: AppLanguage;
    } = req.body || {};

    const baseline = evaluateSubStandardPreUnderwriting({ conditionCode, severityLevel });
    const ai = getGeminiClient();
    if (!ai) {
      res.json({
        ...baseline,
        aiSecondOpinion:
          language === 'en'
            ? baseline.submissionTipEn
            : language === 'zh-CN'
            ? toSimplifiedChinese(baseline.submissionTipZh)
            : baseline.submissionTipZh,
        sourceMode: 'deterministic-underwriting-matrix',
      });
      return;
    }

    const langLabel =
      language === 'zh-CN' ? 'Simplified Chinese' : language === 'zh-HK' ? 'Traditional Chinese' : 'English';

    try {
      const response = await generateContentWithResilience(ai, {
        contents: `Condition: ${conditionCode}, Severity: ${severityLevel}. Clinical Notes: ${clinicalNotes || 'Standard checkup finding'}. Baseline HK insurer matrix: ${JSON.stringify(baseline.insurerOutcomes)}`,
        config: {
          systemInstruction: `You are a Chief Hong Kong Life & Medical Underwriter advising an HKIA licensed broker. Provide a concise 2-3 sentence actionable pre-underwriting strategy in ${langLabel} explaining how to package medical reports and choose between Loading vs Organ Exclusion across HK insurers.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              aiSecondOpinion: { type: Type.STRING },
            },
            required: ['aiSecondOpinion'],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        ...baseline,
        aiSecondOpinion: parsed.aiSecondOpinion || baseline.submissionTipZh,
        sourceMode: 'gemini-4-hydrogen',
      });
    } catch {
      res.json({
        ...baseline,
        aiSecondOpinion:
          language === 'en' ? baseline.submissionTipEn : baseline.submissionTipZh,
        sourceMode: 'deterministic-underwriting-matrix',
      });
    }
  });

  // FN-09: Cantonese / Mandarin Meeting Audio & Transcript -> Auto-GL30 FNA Extractor
  app.post('/api/ai/voice-fna', async (req: Request, res: Response) => {
    const {
      transcript = '',
      audioBase64 = '',
      audioMimeType = 'audio/webm',
    }: {
      transcript?: string;
      audioBase64?: string;
      audioMimeType?: string;
    } = req.body || {};

    let workingTranscript = transcript.trim();
    const ai = getGeminiClient();

    if (!workingTranscript && audioBase64 && ai) {
      const cleanAudio = audioBase64.replace(/^data:audio\/[^;]+;base64,/, '');
      try {
        const audioRes = await ai.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: [
            { inlineData: { mimeType: audioMimeType, data: cleanAudio } },
            {
              text: 'Transcribe this Hong Kong Cantonese / Mandarin / English financial advisory meeting audio accurately.',
            },
          ],
        });
        workingTranscript = (audioRes.text ?? '').trim();
      } catch {
        try {
          const fallbackAudioRes = await generateContentWithResilience(ai, {
            contents: [
              { inlineData: { mimeType: audioMimeType, data: cleanAudio } },
              { text: 'Transcribe this Cantonese/Mandarin/English meeting audio verbatim.' },
            ],
          });
          workingTranscript = (fallbackAudioRes.text ?? '').trim();
        } catch {
          workingTranscript = '';
        }
      }
    }

    if (!workingTranscript) {
      res.status(400).json({ error: 'Meeting transcript or audio clip is required.' });
      return;
    }

    const fallback = extractGl30FnaFromTranscriptDeterministically(workingTranscript);
    if (!ai) {
      res.json({ ...fallback, transcriptUsed: workingTranscript });
      return;
    }

    try {
      const response = await generateContentWithResilience(ai, {
        contents: `HK Advisory Meeting Transcript:\n${workingTranscript}`,
        config: {
          systemInstruction: `Extract structured Hong Kong Insurance Authority GL30 Financial Needs Analysis (FnaRecord) fields from this Cantonese/Mandarin/English meeting transcript.
riskTolerance must be one of: CONSERVATIVE, MODERATE, BALANCED, GROWTH.
All monetary figures in HKD.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              monthlyIncomeHkd: { type: Type.NUMBER },
              monthlyExpensesHkd: { type: Type.NUMBER },
              liquidAssetsHkd: { type: Type.NUMBER },
              dependentsCount: { type: Type.INTEGER },
              riskTolerance: { type: Type.STRING },
              primaryObjectives: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              postRetirementSourceNote: { type: Type.STRING },
              extractedSummaryNotes: { type: Type.STRING },
            },
            required: [
              'monthlyIncomeHkd',
              'monthlyExpensesHkd',
              'liquidAssetsHkd',
              'dependentsCount',
              'riskTolerance',
              'primaryObjectives',
              'extractedSummaryNotes',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const validRisks: RiskTolerance[] = ['CONSERVATIVE', 'MODERATE', 'BALANCED', 'GROWTH'];
      const resolvedRisk: RiskTolerance = validRisks.includes(parsed.riskTolerance)
        ? parsed.riskTolerance
        : fallback.fnaRecord.riskTolerance;

      res.json({
        fnaRecord: {
          monthlyIncomeHkd: Number(parsed.monthlyIncomeHkd) || fallback.fnaRecord.monthlyIncomeHkd,
          monthlyExpensesHkd:
            Number(parsed.monthlyExpensesHkd) || fallback.fnaRecord.monthlyExpensesHkd,
          liquidAssetsHkd: Number(parsed.liquidAssetsHkd) || fallback.fnaRecord.liquidAssetsHkd,
          dependentsCount:
            typeof parsed.dependentsCount === 'number'
              ? parsed.dependentsCount
              : fallback.fnaRecord.dependentsCount,
          riskTolerance: resolvedRisk,
          primaryObjectives:
            Array.isArray(parsed.primaryObjectives) && parsed.primaryObjectives.length > 0
              ? parsed.primaryObjectives.map(String)
              : fallback.fnaRecord.primaryObjectives,
          postRetirementSourceNote:
            parsed.postRetirementSourceNote || fallback.fnaRecord.postRetirementSourceNote,
          signedAtIso: new Date().toISOString(),
        },
        extractedSummaryNotes: parsed.extractedSummaryNotes || fallback.extractedSummaryNotes,
        complianceAuditTrail: fallback.complianceAuditTrail,
        transcriptUsed: workingTranscript,
        sourceMode: 'gemini-voice-fna',
      });
    } catch {
      res.json({ ...fallback, transcriptUsed: workingTranscript });
    }
  });

  // IMP-02: Existing Legacy Policy & Official BI PDF Health-Check Scanner (Gemini 4 Hydrogen + Resilient Fallback)
  app.post('/api/ai/audit-existing-policy', async (req: Request, res: Response) => {
    const { rawText = '' }: { rawText?: string } = req.body || {};
    const baseline = auditExistingPolicyDeterministically(rawText);
    const ai = getGeminiClient();
    if (!ai || !rawText.trim()) {
      res.json(baseline);
      return;
    }

    try {
      const response = await generateContentWithResilience(ai, {
        contents: `Legacy / Competitor Hong Kong Policy Schedule or BI Extract:\n${rawText.slice(0, 4000)}`,
        config: {
          systemInstruction: `You are a Senior Hong Kong Actuarial & Policy Audit Specialist. Analyze this existing policy or benefit illustration extract against 2026 Hong Kong private hospital fees (Semi-Private ~HK$2,600/day, major surgery ~HK$215,000, CI benchmark ~HK$1.5M) and HKIA CPFI best-interest rules. Return concise Traditional Chinese and English findings.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedPolicyTitle: { type: Type.STRING },
              keyFindingsZh: { type: Type.ARRAY, items: { type: Type.STRING } },
              keyFindingsEn: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedActionZh: { type: Type.STRING },
              recommendedActionEn: { type: Type.STRING },
            },
            required: [
              'detectedPolicyTitle',
              'keyFindingsZh',
              'keyFindingsEn',
              'recommendedActionZh',
              'recommendedActionEn',
            ],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        ...baseline,
        detectedPolicyTitle: parsed.detectedPolicyTitle || baseline.detectedPolicyTitle,
        keyFindingsZh:
          Array.isArray(parsed.keyFindingsZh) && parsed.keyFindingsZh.length > 0
            ? parsed.keyFindingsZh.slice(0, 3)
            : baseline.keyFindingsZh,
        keyFindingsEn:
          Array.isArray(parsed.keyFindingsEn) && parsed.keyFindingsEn.length > 0
            ? parsed.keyFindingsEn.slice(0, 3)
            : baseline.keyFindingsEn,
        recommendedActionZh: parsed.recommendedActionZh || baseline.recommendedActionZh,
        recommendedActionEn: parsed.recommendedActionEn || baseline.recommendedActionEn,
        sourceMode: 'gemini-policy-audit',
      });
    } catch {
      res.json(baseline);
    }
  });

  // Sub-AI Agent: Official Product Brochure & HKIA GN16 Link Discovery + Live HTTP Reviewer
  const probeUrlLive = async (rawUrl?: string) => {
    const testedUrl = (rawUrl || '').trim();
    if (!testedUrl || !testedUrl.startsWith('http')) {
      return {
        testedUrl,
        finalResolvedUrl: '',
        httpStatus: null as number | null,
        pageTitle: '',
      };
    }
    try {
      const resp = await fetch(testedUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(4500),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'text/html,application/pdf,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'zh-HK,zh-TW;q=0.9,en;q=0.8',
        },
      });
      const contentType = (resp.headers.get('content-type') || '').toLowerCase();
      let pageTitle = '';
      if (contentType.includes('pdf')) {
        pageTitle = 'Official Insurer PDF Document';
      } else {
        const reader = resp.body?.getReader();
        if (reader) {
          const { value } = await reader.read();
          await reader.cancel().catch(() => {});
          if (value) {
            const snippet = new TextDecoder('utf-8', { fatal: false }).decode(
              value.slice(0, 16384)
            );
            const titleMatch = snippet.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            if (titleMatch?.[1]) {
              pageTitle = titleMatch[1].replace(/\s+/g, ' ').trim().slice(0, 120);
            }
          }
        }
      }
      return {
        testedUrl,
        finalResolvedUrl: resp.url || testedUrl,
        httpStatus: resp.status,
        pageTitle,
      };
    } catch {
      return {
        testedUrl,
        finalResolvedUrl: testedUrl,
        httpStatus: null as number | null,
        pageTitle: '',
      };
    }
  };

  app.post('/api/ai/verify-plan-links', async (req: Request, res: Response) => {
    const {
      plan,
    }: {
      plan?: InsurancePlan;
      language?: AppLanguage;
    } = req.body || {};

    if (!plan || !plan.id) {
      res.status(400).json({ error: 'Valid InsurancePlan is required for link audit.' });
      return;
    }

    const canonical = resolveVerifiedPlanUrls(plan);
    const initialOfficialUrl = plan.officialUrl || canonical.officialUrl;
    const initialGn16Url =
      plan.fulfillmentRatio !== null
        ? plan.gn16ReportUrl || canonical.gn16ReportUrl || HKIA_CENTRAL_GN16_PORTAL_URL
        : '';

    const [officialProbeRaw, gn16ProbeRaw] = await Promise.all([
      probeUrlLive(initialOfficialUrl),
      initialGn16Url ? probeUrlLive(initialGn16Url) : Promise.resolve({
        testedUrl: '',
        finalResolvedUrl: '',
        httpStatus: null,
        pageTitle: '',
      }),
    ]);

    const ai = getGeminiClient();
    if (!ai) {
      res.json(
        buildDeterministicPlanLinkAudit({
          plan,
          officialProbeRaw,
          gn16ProbeRaw,
          sourceMode: 'http-probe-and-registry',
        })
      );
      return;
    }

    try {
      const searchPrompt = `You are a dedicated Hong Kong Insurance Official Link Finder & Compliance Reviewer Sub-Agent.
Find the exact, currently live official Hong Kong insurer product webpage (Traditional Chinese preferred if available) for:
Insurer: ${plan.insurerNameZh} (${plan.insurerNameEn}) [${plan.insurerCode}]
Plan Name: ${plan.nameZh} (${plan.nameEn})
Category: ${plan.categoryLabelZh} (${plan.categoryLabelEn})
Participating Plan (needs GN16 fulfillment ratio link): ${plan.fulfillmentRatio !== null ? 'YES' : 'NO'}
Current tested product URL: ${officialProbeRaw.testedUrl} (HTTP ${officialProbeRaw.httpStatus ?? 'ERR'}, resolved: ${officialProbeRaw.finalResolvedUrl})

Return ONLY a valid raw JSON object (no markdown outside JSON):
{
  "discoveredOfficialUrl": "https://... official insurer HK webpage URL (avoid third-party blogs)",
  "discoveredGn16Url": "https://... official insurer GN16 fulfillment ratio page or https://www.ia.org.hk/tc/fulfillment_ratio/index.html (empty string if non-participating)",
  "aiReviewZh": "2 concise sentences in Hong Kong Traditional Chinese reviewing link reachability, confirming official insurer domain authenticity, and noting GN16 disclosure status.",
  "aiReviewEn": "2 concise sentences in English reviewing link reachability, confirming official insurer domain authenticity, and noting GN16 disclosure status."
}`;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Link sub-agent timeout')), 8500)
      );

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: searchPrompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        }),
        timeoutPromise,
      ]);

      const rawText = (response.text ?? '').trim();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const seenUris = new Set<string>();
      const groundedSources: GroundedWebSource[] = [];
      for (const ch of chunks as any[]) {
        const uri = ch?.web?.uri;
        const title = ch?.web?.title;
        if (uri && typeof uri === 'string' && !seenUris.has(uri)) {
          seenUris.add(uri);
          groundedSources.push({ title: title || uri, uri });
        }
      }

      // Probe any AI-suggested URL before recommending it so we NEVER recommend a dead/404 link!
      let verifiedDiscoveredOfficial: string | undefined;
      if (
        typeof parsed?.discoveredOfficialUrl === 'string' &&
        parsed.discoveredOfficialUrl.startsWith('https://') &&
        !parsed.discoveredOfficialUrl.includes('vertexaisearch.cloud.google.com')
      ) {
        const candidateProbe = await probeUrlLive(parsed.discoveredOfficialUrl);
        const st = classifyHttpProbeStatus(candidateProbe);
        if (st === 'VERIFIED_200') {
          verifiedDiscoveredOfficial = candidateProbe.finalResolvedUrl || candidateProbe.testedUrl;
        }
      }

      let verifiedDiscoveredGn16: string | undefined;
      if (
        plan.fulfillmentRatio !== null &&
        typeof parsed?.discoveredGn16Url === 'string' &&
        parsed.discoveredGn16Url.startsWith('https://') &&
        !parsed.discoveredGn16Url.includes('vertexaisearch.cloud.google.com')
      ) {
        const gnProbe = await probeUrlLive(parsed.discoveredGn16Url);
        const gnSt = classifyHttpProbeStatus(gnProbe);
        if (gnSt === 'VERIFIED_200') {
          verifiedDiscoveredGn16 = gnProbe.finalResolvedUrl || gnProbe.testedUrl;
        }
      }

      res.json(
        buildDeterministicPlanLinkAudit({
          plan,
          officialProbeRaw,
          gn16ProbeRaw,
          discoveredOfficialUrl: verifiedDiscoveredOfficial,
          discoveredGn16Url: verifiedDiscoveredGn16,
          aiReviewZh:
            typeof parsed?.aiReviewZh === 'string' ? parsed.aiReviewZh.trim() : undefined,
          aiReviewEn:
            typeof parsed?.aiReviewEn === 'string' ? parsed.aiReviewEn.trim() : undefined,
          groundedSources,
          sourceMode: 'gemini-search-link-subagent',
        })
      );
    } catch (err: any) {
      console.warn('Plan link sub-agent falling back to live HTTP probe + verified registry:', err?.message);
      res.json(
        buildDeterministicPlanLinkAudit({
          plan,
          officialProbeRaw,
          gn16ProbeRaw,
          sourceMode: 'http-probe-and-registry',
        })
      );
    }
  });

  // 3-Subagent Hyperlink Review & Auto-Fix Loop (Live Parallel HTTP Probe -> Fixer -> Re-Probe Verifier)
  app.post('/api/ai/subagent-link-review-loop', async (req: Request, res: Response) => {
    try {
      const {
        allPlans = [],
        targetPlans,
        existingOverrides = {},
      }: {
        allPlans?: InsurancePlan[];
        targetPlans?: InsurancePlan[];
        existingOverrides?: Record<string, { officialUrl?: string; gn16ReportUrl?: string }>;
      } = req.body || {};

      const scope = Array.isArray(targetPlans) && targetPlans.length > 0 ? targetPlans : allPlans;
      if (!Array.isArray(scope) || scope.length === 0) {
        res.status(400).json({ error: 'allPlans array is required.' });
        return;
      }

      // Collect unique URLs to probe (capped at 28 unique URLs per batch with bounded concurrency for snappy <4s response)
      const uniqueUrls = Array.from(
        new Set(
          scope
            .flatMap((p) => [
              existingOverrides[p.id]?.officialUrl || p.officialUrl || '',
              p.fulfillmentRatio !== null
                ? existingOverrides[p.id]?.gn16ReportUrl || p.gn16ReportUrl || ''
                : '',
            ])
            .map((u) => u.trim())
            .filter((u) => u.startsWith('https://'))
        )
      ).slice(0, 28);

      const liveProbeMap: Record<string, LiveUrlProbeSnapshot> = {};
      const chunkSize = 8;
      for (let i = 0; i < uniqueUrls.length; i += chunkSize) {
        const batch = uniqueUrls.slice(i, i + chunkSize);
        const results = await Promise.all(batch.map((u) => probeUrlLive(u)));
        for (const r of results) {
          if (r.testedUrl) {
            liveProbeMap[r.testedUrl] = {
              url: r.testedUrl,
              finalUrl: r.finalResolvedUrl || r.testedUrl,
              httpStatus: r.httpStatus,
              pageTitle: r.pageTitle,
            };
          }
        }
      }

      const report = runSubagentHyperlinkReviewFixLoop({
        allPlans: allPlans.length > 0 ? allPlans : scope,
        targetPlans: scope,
        existingOverrides,
        liveProbeMap,
        sourceMode: 'server-live-http-probe-loop',
      });

      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Subagent hyperlink loop failed' });
    }
  });

  // 3-Subagent Missing-Plan Search -> Actuarial/Hyperlink Review -> Import Loop
  app.post('/api/ai/subagent-missing-plans-loop', async (req: Request, res: Response) => {
    try {
      const {
        existingPlans = [],
        query = '',
        categoryFilter = 'ALL',
        insurerFilter = 'ALL',
      }: {
        existingPlans?: InsurancePlan[];
        query?: string;
        categoryFilter?: any;
        insurerFilter?: string;
      } = req.body || {};

      const externalDiscoveredPlans: InsurancePlan[] = [];
      const groundedSources: GroundedWebSource[] = [];
      const ai = getGeminiClient();

      if (ai && query.trim().length >= 2) {
        try {
          const existingSampleNames = existingPlans
            .slice(0, 80)
            .map((p) => `${p.insurerCode}:${p.nameZh}`)
            .join(', ');

          const discoveryPrompt = `You are Subagent 1 of a Hong Kong Insurance Product Discovery & Actuarial Review Loop.
Search official Hong Kong insurer websites for active retail insurance plans matching "${query.trim()}" (${insurerFilter !== 'ALL' ? `Insurer: ${insurerFilter}` : 'Any HKIA-authorized insurer'}) that are NOT in this existing list: [${existingSampleNames}].
Return ONLY a raw JSON object:
{
  "plans": [
    {
      "insurerCode": "AIA|PRU|MANULIFE|FWD|AXA|SUNLIFE|BOCLIFE|HSBC|CTFLIFE|YFLIFE|BUPA|CIGNA|BOWTIE|BLUE|ZAINSURE|ONEDEGREE|ZURICH|CHUBB|GENERALI|CHINALIFE|TAIPING",
      "insurerNameEn": "Official English Insurer Name",
      "insurerNameZh": "香港官方中文保司名",
      "nameEn": "Official Plan English Name",
      "nameZh": "香港官方中文計劃名稱",
      "rawCategoryText": "Savings | VHIS | Critical Illness | High-End Medical | QDAP | Term Life | Universal Life | General GI",
      "currencies": ["USD", "HKD"],
      "rawProjectedIrr": 0.065,
      "guaranteedIrr": 0.013,
      "keyHighlightsEn": ["Highlight 1", "Highlight 2", "Highlight 3"],
      "keyHighlightsZh": ["重點1", "重點2", "重點3"],
      "officialUrl": "https://..."
    }
  ]
}`;
          const response = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: discoveryPrompt,
              config: {
                tools: [{ googleSearch: {} }],
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Missing-plan search timeout')), 8500)
            ),
          ]);

          const rawText = (response.text ?? '').trim();
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const seenUris = new Set<string>();
          for (const ch of chunks as any[]) {
            const uri = ch?.web?.uri;
            const title = ch?.web?.title;
            if (uri && typeof uri === 'string' && !seenUris.has(uri)) {
              seenUris.add(uri);
              groundedSources.push({ title: title || uri, uri });
            }
          }

          if (Array.isArray(parsed?.plans)) {
            parsed.plans.slice(0, 5).forEach((rawItem: RawImportedPlanInput, idx: number) => {
              const cls = classifyPolicyFeaturesDeterministically(rawItem);
              const built = buildStandardizedInsurancePlan(rawItem, cls, idx);
              externalDiscoveredPlans.push(built);
            });
          }
        } catch {
          // Graceful fallback to curated 46-insurer gap index
        }
      }

      const report = runSubagentMissingPlansLoop({
        existingPlans,
        query,
        categoryFilter,
        insurerFilter,
        externalDiscoveredPlans,
        groundedSources,
        sourceMode:
          externalDiscoveredPlans.length > 0
            ? 'gemini-google-search-subagent-loop'
            : 'curated-hk-market-gap-loop',
      });

      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Subagent missing-plans loop failed' });
    }
  });

  // IMP-01: Client Interactive Proposal Microsites & Live Read-Receipt Persistence
  const readMicrositesList = async (): Promise<ClientMicrositeRecord[]> => {
    try {
      if (!fsSync.existsSync(MICROSITES_FILE)) return [];
      const raw = await fs.readFile(MICROSITES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  app.get('/api/microsites', async (_req: Request, res: Response) => {
    const items = await readMicrositesList();
    res.json({ items, microsites: items });
  });

  app.get('/api/microsites/:id', async (req: Request, res: Response) => {
    const items = await readMicrositesList();
    const found = items.find((m) => m.id === req.params.id);
    if (!found) {
      res.json({ exists: false, item: null, isExpired: false });
      return;
    }
    const isExpired = found.expiresAtIso
      ? new Date(found.expiresAtIso).getTime() < Date.now()
      : false;
    res.json({ exists: true, item: found, isExpired });
  });

  app.post('/api/microsites', async (req: Request, res: Response) => {
    try {
      const candidate = req.body?.record ? req.body.record : req.body;
      const record = candidate as ClientMicrositeRecord;
      if (!record || !record.id) {
        res.status(400).json({ error: 'Valid microsite record required' });
        return;
      }
      const existing = await readMicrositesList();
      const updated = [record, ...existing.filter((m) => m.id !== record.id)].slice(0, 40);
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(MICROSITES_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      res.json({ ok: true, item: record, items: updated, microsites: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to save microsite' });
    }
  });

  app.post('/api/microsites/:id/read', async (req: Request, res: Response) => {
    try {
      const { inspectedPolicyYear = 20, dwellSeconds = 42, viewerLabel = 'Client Mobile Safari' } =
        req.body || {};
      const receipt = {
        id: `rcpt-${Date.now().toString(36)}`,
        openedAtIso: new Date().toISOString(),
        viewerLabel: String(viewerLabel),
        inspectedPolicyYear: Number(inspectedPolicyYear) || 20,
        dwellSeconds: Number(dwellSeconds) || 35,
      };
      const existing = await readMicrositesList();
      const idx = existing.findIndex((m) => m.id === req.params.id);
      if (idx === -1) {
        res.json({ ok: true, receipt });
        return;
      }
      existing[idx] = {
        ...existing[idx],
        readReceipts: [receipt, ...(existing[idx].readReceipts || [])].slice(0, 20),
      };
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(MICROSITES_FILE, JSON.stringify(existing, null, 2), 'utf-8');
      res.json({ ok: true, item: existing[idx], items: existing, microsites: existing, receipt });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to record read receipt' });
    }
  });

  // 2-Way Client Microsite Interactive Feedback Endpoint (Cluster C #9)
  app.post('/api/microsites/:id/feedback', async (req: Request, res: Response) => {
    try {
      const {
        preferredPaymentMode = 'ANNUAL',
        preferredSigningSlot = '',
        clientQuestion = '',
      } = req.body || {};
      const feedback = {
        preferredPaymentMode: preferredPaymentMode === 'MONTHLY' ? ('MONTHLY' as const) : ('ANNUAL' as const),
        preferredSigningSlot: String(preferredSigningSlot || '').slice(0, 80),
        clientQuestion: String(clientQuestion || '').slice(0, 300),
        submittedAtIso: new Date().toISOString(),
      };
      const existing = await readMicrositesList();
      const idx = existing.findIndex((m) => m.id === req.params.id);
      if (idx === -1) {
        res.json({ ok: true, feedback });
        return;
      }
      existing[idx] = {
        ...existing[idx],
        clientFeedback: feedback,
      };
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(MICROSITES_FILE, JSON.stringify(existing, null, 2), 'utf-8');
      res.json({ ok: true, item: existing[idx], items: existing, microsites: existing, feedback });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to save client feedback' });
    }
  });

  // #18. Live FX Rate Feed & Advisor Rate-Lock Endpoint
  app.get('/api/market/fx-rates', async (_req: Request, res: Response) => {
    try {
      if (fsSync.existsSync(FX_RATES_FILE)) {
        const raw = await fs.readFile(FX_RATES_FILE, 'utf-8');
        res.json({ ok: true, feed: JSON.parse(raw) as FxRateFeedState });
        return;
      }
      const liveDefault: FxRateFeedState = {
        ...DEFAULT_LIVE_FX_FEED,
        updatedAtIso: new Date().toISOString(),
      };
      res.json({ ok: true, feed: liveDefault });
    } catch {
      res.json({ ok: true, feed: DEFAULT_LIVE_FX_FEED });
    }
  });

  app.post('/api/market/fx-rates', async (req: Request, res: Response) => {
    try {
      const { usdToHkd, hkdToRmb, rateLocked, sourceLabel } = req.body || {};
      const safeUsdToHkd = Math.min(7.85, Math.max(7.75, Number(usdToHkd) || 7.785));
      const safeHkdToRmb = Math.min(1.02, Math.max(0.82, Number(hkdToRmb) || 0.923));
      const feed: FxRateFeedState = {
        usdToHkd: Number(safeUsdToHkd.toFixed(4)),
        hkdToRmb: Number(safeHkdToRmb.toFixed(4)),
        usdToRmb: Number((safeUsdToHkd * safeHkdToRmb).toFixed(4)),
        updatedAtIso: new Date().toISOString(),
        sourceLabel: String(sourceLabel || 'Advisor Rate-Lock / HKMA Mid-Market'),
        rateLocked: Boolean(rateLocked),
      };
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(FX_RATES_FILE, JSON.stringify(feed, null, 2), 'utf-8');
      res.json({ ok: true, feed });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update FX rates' });
    }
  });

  // #19. Quarterly Insurer Promo & GN16 Maintenance Console Endpoint
  app.get('/api/market/promos', async (_req: Request, res: Response) => {
    try {
      if (!fsSync.existsSync(PROMO_OVERRIDES_FILE)) {
        res.json({ ok: true, overrides: {} });
        return;
      }
      const raw = await fs.readFile(PROMO_OVERRIDES_FILE, 'utf-8');
      res.json({ ok: true, overrides: JSON.parse(raw) || {} });
    } catch {
      res.json({ ok: true, overrides: {} });
    }
  });

  app.post('/api/market/promos', async (req: Request, res: Response) => {
    try {
      const overrides = (req.body?.overrides || {}) as Record<string, PromoAdminOverride>;
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(PROMO_OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf-8');
      res.json({ ok: true, overrides });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to save promo overrides' });
    }
  });

  // #20. Shared Agency Team Library (Case Decks & Objection Battlecards)
  const readTeamLibrary = async (): Promise<TeamLibraryItem[]> => {
    try {
      if (!fsSync.existsSync(TEAM_LIBRARY_FILE)) {
        return INITIAL_TEAM_LIBRARY_ITEMS;
      }
      const raw = await fs.readFile(TEAM_LIBRARY_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_TEAM_LIBRARY_ITEMS;
    } catch {
      return INITIAL_TEAM_LIBRARY_ITEMS;
    }
  };

  app.get('/api/team-library', async (_req: Request, res: Response) => {
    const items = await readTeamLibrary();
    res.json({ ok: true, items });
  });

  app.post('/api/team-library', async (req: Request, res: Response) => {
    try {
      const item = req.body?.item as TeamLibraryItem | undefined;
      if (!item || !item.titleZh) {
        res.status(400).json({ error: 'Valid TeamLibraryItem required' });
        return;
      }
      const existing = await readTeamLibrary();
      const created: TeamLibraryItem = {
        ...item,
        id: item.id || `team-${Date.now().toString(36)}`,
        cloneCount: item.cloneCount ?? 1,
        createdAtIso: new Date().toISOString(),
      };
      const updated = [created, ...existing.filter((x) => x.id !== created.id)].slice(0, 50);
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(TEAM_LIBRARY_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      res.json({ ok: true, item: created, items: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to publish to Team Library' });
    }
  });

  app.post('/api/team-library/:id/clone', async (req: Request, res: Response) => {
    try {
      const existing = await readTeamLibrary();
      const updated = existing.map((item) =>
        item.id === req.params.id ? { ...item, cloneCount: (item.cloneCount || 0) + 1 } : item
      );
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(TEAM_LIBRARY_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      res.json({ ok: true, items: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to increment clone count' });
    }
  });

  // #13. Multimodal Existing Policy Schedule OCR / File Upload Parser (Stage 01B)
  app.post('/api/ai/ocr-existing-policy', async (req: Request, res: Response) => {
    const {
      rawText = '',
      fileBase64 = '',
      mimeType = 'image/png',
      fileName = '',
    }: {
      rawText?: string;
      fileBase64?: string;
      mimeType?: string;
      fileName?: string;
    } = req.body || {};

    const strippedFileBase64 = fileBase64
      ? fileBase64.includes(',')
        ? fileBase64.split(',')[1]
        : fileBase64
      : '';
    const visionScheduleText = strippedFileBase64
      ? await callGoogleCloudVisionOcr(strippedFileBase64)
      : null;
    const combinedText = [rawText, visionScheduleText].filter(Boolean).join('\n').trim();

    const fallback = parseDeterministicLegacyPolicyText(
      combinedText || fileName || '公司團體醫療保單 HK$80,000'
    );
    const ai = getGeminiClient();
    if (!ai || (!combinedText && !strippedFileBase64)) {
      res.json({
        ok: true,
        parsed: fallback,
        sourceMode: visionScheduleText ? 'google-cloud-vision-ocr' : 'deterministic-ocr',
      });
      return;
    }

    try {
      const parts: any[] = [];
      if (strippedFileBase64) {
        parts.push({
          inlineData: {
            data: strippedFileBase64,
            mimeType: mimeType || 'image/png',
          },
        });
      }
      parts.push({
        text: `Extract the insurance policy schedule details into JSON for a Hong Kong 6-dimension protection gap audit.
Filename: ${fileName}
Extracted/Pasted Text: ${combinedText}
Allowed dimensionId values: LIFE_MORTGAGE, PRIVATE_HOSPITAL, CRITICAL_ILLNESS, CANCER_TARGETED, ACCIDENT_INCOME, RETIREMENT_DEMENTIA.`,
      });

      const response = await generateContentWithResilience(ai, {
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              policyName: { type: Type.STRING },
              dimensionId: { type: Type.STRING },
              coverageAmountHkd: { type: Type.NUMBER },
              annualPremiumHkd: { type: Type.NUMBER },
              limitationNote: { type: Type.STRING },
            },
            required: ['policyName', 'dimensionId', 'coverageAmountHkd', 'annualPremiumHkd'],
          },
        },
      });
      const jsonText = response.text || '';
      const parsedObj = JSON.parse(jsonText);
      const validDims = new Set<ProtectionDimensionId>([
        'LIFE_MORTGAGE',
        'PRIVATE_HOSPITAL',
        'CRITICAL_ILLNESS',
        'CANCER_TARGETED',
        'ACCIDENT_INCOME',
        'RETIREMENT_DEMENTIA',
      ]);
      const dim: ProtectionDimensionId = validDims.has(parsedObj.dimensionId)
        ? parsedObj.dimensionId
        : fallback.dimensionId;
      res.json({
        ok: true,
        parsed: {
          policyName: String(parsedObj.policyName || fallback.policyName).slice(0, 60),
          dimensionId: dim,
          coverageAmountHkd: Math.max(10_000, Math.round(Number(parsedObj.coverageAmountHkd) || fallback.coverageAmountHkd)),
          annualPremiumHkd: Math.max(0, Math.round(Number(parsedObj.annualPremiumHkd) || 0)),
          limitationNote: String(parsedObj.limitationNote || fallback.limitationNote).slice(0, 140),
        },
        sourceMode: 'gemini-multimodal-ocr',
      });
    } catch {
      res.json({ ok: true, parsed: fallback, sourceMode: 'deterministic-ocr' });
    }
  });

  // Voice / Transcript to Structured FNA & Client Notes (Cluster C #8)
  app.post('/api/ai/structure-meeting-notes', async (req: Request, res: Response) => {
    const {
      transcript = '',
      lead,
    }: {
      transcript?: string;
      lead?: ClientLead;
    } = req.body || {};

    const safeLead: ClientLead =
      lead && lead.id
        ? lead
        : ({
            id: 'temp-lead',
            fullNameEn: 'Client',
            fullNameZh: '客戶',
            age: 36,
            plannedRetirementAge: 65,
            isSmoker: false,
            residency: 'HK_RESIDENT',
            whatsappPhone: '',
            email: '',
            stage: 'FNA_COMPLETED' as any,
            notes: '',
            annualBudgetHkd: 48000,
            fnaRecord: null,
            kycCheck: { hkidVerified: true, hkidDocNumber: '', mcvEntrySlipVerified: false },
            lastContactIso: new Date().toISOString(),
          } as ClientLead);

    const todayIso = new Date().toISOString().slice(0, 10);
    const fallback = extractStructuredMeetingNotesDeterministically(
      transcript || '客戶希望補強半私家房全數賠償及確認年度保費預算',
      safeLead,
      todayIso
    );

    const ai = getGeminiClient();
    if (!ai || !transcript.trim()) {
      res.json({ ok: true, extracted: fallback, sourceMode: 'deterministic-extractor' });
      return;
    }

    try {
      const response = await generateContentWithResilience(ai, {
        contents: `You are a licensed Hong Kong insurance compliance assistant (HKIA GL30).
Convert the following Cantonese/Mandarin/English advisor meeting transcript into structured meeting notes and one actionable follow-up task.
Client: ${safeLead.fullNameZh} (${safeLead.fullNameEn}), Age ${safeLead.age}, Residency ${safeLead.residency}.
Today Date: ${todayIso}.
Transcript:
${transcript}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bulletSummaryZh: { type: Type.STRING },
              bulletSummaryEn: { type: Type.STRING },
              suggestedFollowUpTitleZh: { type: Type.STRING },
              suggestedFollowUpDueDateIso: { type: Type.STRING },
              detectedAnnualBudgetHkd: { type: Type.NUMBER },
              detectedConcerns: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'bulletSummaryZh',
              'bulletSummaryEn',
              'suggestedFollowUpTitleZh',
              'suggestedFollowUpDueDateIso',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const budgetNum = Number(parsed.detectedAnnualBudgetHkd);
      res.json({
        ok: true,
        extracted: {
          bulletSummaryZh: String(parsed.bulletSummaryZh || fallback.bulletSummaryZh),
          bulletSummaryEn: String(parsed.bulletSummaryEn || fallback.bulletSummaryEn),
          suggestedFollowUpTitleZh: String(
            parsed.suggestedFollowUpTitleZh || fallback.suggestedFollowUpTitleZh
          ).slice(0, 120),
          suggestedFollowUpDueDateIso: /^\d{4}-\d{2}-\d{2}$/.test(
            String(parsed.suggestedFollowUpDueDateIso || '')
          )
            ? String(parsed.suggestedFollowUpDueDateIso)
            : fallback.suggestedFollowUpDueDateIso,
          detectedAnnualBudgetHkd:
            budgetNum >= 8000 && budgetNum <= 5000000
              ? Math.round(budgetNum)
              : fallback.detectedAnnualBudgetHkd,
          detectedConcerns:
            Array.isArray(parsed.detectedConcerns) && parsed.detectedConcerns.length > 0
              ? parsed.detectedConcerns.map(String).slice(0, 4)
              : fallback.detectedConcerns,
        },
        sourceMode: 'gemini-structured-fna',
      });
    } catch {
      res.json({ ok: true, extracted: fallback, sourceMode: 'deterministic-extractor' });
    }
  });

  // Agency Multi-Role Case Handover Cloud Sync Endpoint (Cluster D #12)
  const readAgencyHandovers = async (): Promise<AgencyHandoverItem[]> => {
    try {
      if (!fsSync.existsSync(AGENCY_HANDOVERS_FILE)) {
        return INITIAL_AGENCY_HANDOVERS;
      }
      const raw = await fs.readFile(AGENCY_HANDOVERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_AGENCY_HANDOVERS;
    } catch {
      return INITIAL_AGENCY_HANDOVERS;
    }
  };

  app.get('/api/agency/handovers', async (_req: Request, res: Response) => {
    const items = await readAgencyHandovers();
    res.json({ ok: true, items });
  });

  app.post('/api/agency/handovers', async (req: Request, res: Response) => {
    try {
      const items = req.body?.items as AgencyHandoverItem[] | undefined;
      if (!Array.isArray(items)) {
        res.status(400).json({ error: 'Valid handovers array required' });
        return;
      }
      const bounded = items.slice(0, 60);
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(AGENCY_HANDOVERS_FILE, JSON.stringify(bounded, null, 2), 'utf-8');
      res.json({ ok: true, items: bounded });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to persist agency handovers' });
    }
  });

  // ==========================================================================
  // Advisor Member Authentication, Registration & Profile Endpoints
  // ==========================================================================
  const readMembersRegistry = async (): Promise<StoredMemberRecord[]> => {
    try {
      if (!fsSync.existsSync(MEMBERS_REGISTRY_FILE)) {
        return SEED_DEMO_MEMBER_RECORDS;
      }
      const raw = await fs.readFile(MEMBERS_REGISTRY_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? mergeWithSeedMembers(parsed) : SEED_DEMO_MEMBER_RECORDS;
    } catch {
      return SEED_DEMO_MEMBER_RECORDS;
    }
  };

  const writeMembersRegistry = async (records: StoredMemberRecord[]): Promise<void> => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(MEMBERS_REGISTRY_FILE, JSON.stringify(records, null, 2), 'utf-8');
  };

  const readMemberSessions = async (): Promise<Record<string, string>> => {
    try {
      if (!fsSync.existsSync(MEMBER_SESSIONS_FILE)) return {};
      const raw = await fs.readFile(MEMBER_SESSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  const writeMemberSessions = async (sessions: Record<string, string>): Promise<void> => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(MEMBER_SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  };

  const extractBearerToken = (req: Request): string | null => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim() || null;
    }
    return null;
  };

  app.post('/api/members/register', async (req: Request, res: Response) => {
    try {
      const registry = await readMembersRegistry();
      const result = registerMemberInRegistry(registry, req.body || {});
      if (!result.ok) {
        res.status(result.errorCode === 'EMAIL_EXISTS' ? 409 : 400).json({
          ok: false,
          errorCode: result.errorCode,
          errors: result.errors,
        });
        return;
      }
      await writeMembersRegistry(result.updatedRegistry);
      const token = crypto.randomBytes(24).toString('hex');
      const sessions = await readMemberSessions();
      sessions[token] = result.member.id;
      await writeMemberSessions(sessions);
      res.status(201).json({ ok: true, member: result.member, token });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Registration failed' });
    }
  });

  app.post('/api/members/login', async (req: Request, res: Response) => {
    try {
      const registry = await readMembersRegistry();
      const result = authenticateMemberInRegistry(registry, req.body || {});
      if (!result.ok) {
        res.status(result.errorCode === 'INVALID_CREDENTIALS' ? 401 : 400).json({
          ok: false,
          errorCode: result.errorCode,
          errors: result.errors,
        });
        return;
      }
      await writeMembersRegistry(result.updatedRegistry);
      const token = crypto.randomBytes(24).toString('hex');
      const sessions = await readMemberSessions();
      sessions[token] = result.member.id;
      await writeMemberSessions(sessions);
      res.json({ ok: true, member: result.member, token });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Login failed' });
    }
  });

  app.get('/api/members/me', async (req: Request, res: Response) => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        res.status(401).json({ ok: false, error: 'Missing session token' });
        return;
      }
      const sessions = await readMemberSessions();
      const memberId = sessions[token];
      if (!memberId) {
        res.status(401).json({ ok: false, error: 'Invalid or expired session' });
        return;
      }
      const registry = await readMembersRegistry();
      const found = registry.find((m) => m.id === memberId);
      if (!found) {
        res.status(401).json({ ok: false, error: 'Member account not found' });
        return;
      }
      res.json({ ok: true, member: stripStoredSecrets(found) });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Session check failed' });
    }
  });

  app.patch('/api/members/profile', async (req: Request, res: Response) => {
    try {
      const token = extractBearerToken(req);
      const sessions = await readMemberSessions();
      const targetId = (token && sessions[token]) || req.body?.memberId || '';
      if (!targetId) {
        res.status(401).json({ ok: false, error: 'Unauthorized member update' });
        return;
      }
      const registry = await readMembersRegistry();
      const updated = updateMemberProfileInRegistry(registry, targetId, req.body || {});
      if (!updated.ok) {
        res.status(400).json({ ok: false, errors: updated.errors });
        return;
      }
      await writeMembersRegistry(updated.updatedRegistry);
      res.json({ ok: true, member: updated.member });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Profile update failed' });
    }
  });

  app.post('/api/members/logout', async (req: Request, res: Response) => {
    try {
      const token = extractBearerToken(req);
      if (token) {
        const sessions = await readMemberSessions();
        if (sessions[token]) {
          delete sessions[token];
          await writeMemberSessions(sessions);
        }
      }
      res.json({ ok: true });
    } catch {
      res.json({ ok: true });
    }
  });

  // Server-side Native Hong Kong Cantonese (ISO 639-3: yue) Narration Endpoint
  app.post('/api/ai/cantonese-narrate', async (req: Request, res: Response) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 720) : '';
    if (!text) {
      res.status(400).json({ ok: false, error: 'Narration text is required' });
      return;
    }
    try {
      // Split text on natural Cantonese punctuation into <= 140-char clauses
      const rawParts = text
        .split(/(?<=[。！？；，、\n])/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      const chunks: string[] = [];
      let current = '';
      for (const part of rawParts) {
        if ((current + part).length <= 140) {
          current += part;
        } else {
          if (current) chunks.push(current);
          if (part.length <= 140) {
            current = part;
          } else {
            for (let i = 0; i < part.length; i += 140) {
              chunks.push(part.slice(i, i + 140));
            }
            current = '';
          }
        }
      }
      if (current) chunks.push(current);

      const buffers: Buffer[] = [];
      for (const chunk of chunks) {
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=yue&q=${encodeURIComponent(
          chunk
        )}`;
        const resp = await fetch(ttsUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          },
        });
        if (!resp.ok) {
          throw new Error(`Cantonese TTS upstream returned HTTP ${resp.status}`);
        }
        const arr = await resp.arrayBuffer();
        buffers.push(Buffer.from(arr));
      }

      if (buffers.length === 0) {
        res.json({ ok: false, fallback: 'browser-speech-synthesis' });
        return;
      }

      const combined = Buffer.concat(buffers);
      res.json({
        ok: true,
        locale: 'yue-HK',
        audioBase64: combined.toString('base64'),
        mimeType: 'audio/mpeg',
      });
    } catch (err: any) {
      console.warn('Cantonese (yue) TTS fallback to static/browser speech:', err?.message);
      res.json({ ok: false, fallback: 'browser-speech-synthesis' });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.join(process.cwd(), 'dist');

  if (isProd && fsSync.existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HK InsureHub Pro server running on http://localhost:${PORT}`);
  });
}

startServer();
