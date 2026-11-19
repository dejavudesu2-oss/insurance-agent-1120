import {
  BundleRiderId,
  calculateDualCurrencyBundleSimulation,
  CLAIM_SCENARIO_PRESETS,
  ClaimScenarioId,
  DualCurrencySimulationResult,
  evaluateSixDimensionGapAudit,
  getDefaultRidersForScheme,
  getSchemeMeta,
  HKD_TO_RMB_RATE,
  MODULAR_RIDER_OPTIONS,
  SixDimensionGapAuditResult,
} from './clientGapEngine';
import { derivePlanSyncProfile, SelectedPlanSyncProfile } from './crmAndCatalogTaxonomy';
import {
  ClientLead,
  InsurancePlan,
  PolicyApplicationRecord,
  ProposalCartConfig,
  ProtectionDimensionId,
} from './types';

export const WORKSPACE_SCHEMA_VERSION = 3;

const LEGACY_V1_SEED_IDS = new Set([
  'lead-chan-taiman',
  'lead-lin-xiaomei',
  'lead-sarah-wong',
  'lead-kenneth-cheung',
  'lead-zhao-wei',
]);

/**
 * Ensures any persisted workspace leads upgrade cleanly to v3:
 * - Drops obsolete v1 placeholder leads that lacked v2/v3 fields (annualBudgetHkd, targetSchemeId, roleTagZh)
 * - Preserves all canonical v3 seed leads AND any custom leads created by the user
 * - Hydrates a complete `proposalCart` and `savedSnapshots` array on every lead
 */
export function migrateWorkspaceLeadsV3(
  persistedLeads: ClientLead[] | undefined | null,
  seedLeads: ClientLead[],
  persistedSchemaVersion?: number
): ClientLead[] {
  const normalizedSeeds = seedLeads.map((seed) => ensureLeadCartDefaults(seed));

  if (!Array.isArray(persistedLeads) || persistedLeads.length === 0) {
    return normalizedSeeds;
  }

  const isLegacySchema =
    !persistedSchemaVersion || persistedSchemaVersion < WORKSPACE_SCHEMA_VERSION;

  if (isLegacySchema) {
    const seedIds = new Set(normalizedSeeds.map((s) => s.id));
    const survivingCustomOrUpdated = persistedLeads
      .filter((l) => l && typeof l.id === 'string' && !LEGACY_V1_SEED_IDS.has(l.id))
      .map((l) => ensureLeadCartDefaults(l));

    const mergedById = new Map<string, ClientLead>();
    for (const seed of normalizedSeeds) {
      mergedById.set(seed.id, seed);
    }
    for (const item of survivingCustomOrUpdated) {
      if (seedIds.has(item.id)) {
        const baseSeed = mergedById.get(item.id)!;
        mergedById.set(
          item.id,
          ensureLeadCartDefaults({
            ...baseSeed,
            ...item,
            annualBudgetHkd: item.annualBudgetHkd ?? baseSeed.annualBudgetHkd,
            roleTagZh: item.roleTagZh || baseSeed.roleTagZh,
            roleTagEn: item.roleTagEn || baseSeed.roleTagEn,
            existingSummaryNote: item.existingSummaryNote ?? baseSeed.existingSummaryNote,
            priorityGoalNote: item.priorityGoalNote ?? baseSeed.priorityGoalNote,
            clientNotes:
              typeof item.clientNotes === 'string'
                ? item.clientNotes
                : (baseSeed.clientNotes ?? ''),
            clientNotesUpdatedAtIso:
              item.clientNotesUpdatedAtIso ?? baseSeed.clientNotesUpdatedAtIso,
          })
        );
      } else {
        mergedById.set(item.id, item);
      }
    }
    return Array.from(mergedById.values());
  }

  const seedMap = new Map<string, ClientLead>(normalizedSeeds.map((s) => [s.id, s]));
  return persistedLeads.map((l) => {
    const matchedSeed = seedMap.get(l.id);
    if (!matchedSeed) {
      return ensureLeadCartDefaults(l);
    }
    return ensureLeadCartDefaults({
      ...l,
      clientNotes: l.clientNotes !== undefined ? l.clientNotes : matchedSeed.clientNotes,
      clientNotesUpdatedAtIso:
        l.clientNotesUpdatedAtIso ?? matchedSeed.clientNotesUpdatedAtIso,
      followUpTasks:
        Array.isArray(l.followUpTasks) && l.followUpTasks.length > 0
          ? l.followUpTasks
          : matchedSeed.followUpTasks,
      householdMembers:
        Array.isArray(l.householdMembers) && l.householdMembers.length > 0
          ? l.householdMembers
          : matchedSeed.householdMembers,
      existingPolicies:
        Array.isArray(l.existingPolicies) && l.existingPolicies.length > 0
          ? l.existingPolicies.map((ep) => {
              const seedEp = matchedSeed.existingPolicies?.find((sEp) => sEp.id === ep.id);
              return { ...ep, policyNumber: ep.policyNumber || seedEp?.policyNumber };
            })
          : matchedSeed.existingPolicies,
      contingentOwnerName: l.contingentOwnerName ?? matchedSeed.contingentOwnerName,
      beneficiaryAllocations: l.beneficiaryAllocations ?? matchedSeed.beneficiaryAllocations,
    });
  });
}

export function buildDefaultProposalCartForLead(lead: ClientLead): ProposalCartConfig {
  const defaultRiders = getDefaultRidersForScheme(lead.targetSchemeId);
  const validRiderIds = new Set<string>(MODULAR_RIDER_OPTIONS.map((r) => r.id));
  const persistedRiders = Array.isArray(lead.proposalCart?.selectedRiderIds)
    ? lead.proposalCart!.selectedRiderIds.filter((id) => validRiderIds.has(id))
    : null;

  return {
    anchorPlanId: lead.proposalCart?.anchorPlanId || '',
    comboPlanIds: Array.isArray(lead.proposalCart?.comboPlanIds)
      ? lead.proposalCart!.comboPlanIds.filter(Boolean).slice(0, 2)
      : [],
    selectedRiderIds: persistedRiders !== null ? persistedRiders : defaultRiders,
    paymentMode: lead.proposalCart?.paymentMode === 'MONTHLY' ? 'MONTHLY' : 'ANNUAL',
    paymentTermYears:
      typeof lead.proposalCart?.paymentTermYears === 'number' &&
      lead.proposalCart.paymentTermYears > 0
        ? lead.proposalCart.paymentTermYears
        : 10,
    currency:
      lead.proposalCart?.currency === 'USD' ||
      lead.proposalCart?.currency === 'HKD' ||
      lead.proposalCart?.currency === 'RMB'
        ? lead.proposalCart.currency
        : lead.residency === 'MCV'
        ? 'USD'
        : 'HKD',
    sumAssuredUsd:
      typeof lead.proposalCart?.sumAssuredUsd === 'number' && lead.proposalCart.sumAssuredUsd > 0
        ? lead.proposalCart.sumAssuredUsd
        : 100000,
    fxRateHkdToRmb:
      typeof lead.proposalCart?.fxRateHkdToRmb === 'number' &&
      lead.proposalCart.fxRateHkdToRmb >= 0.75 &&
      lead.proposalCart.fxRateHkdToRmb <= 1.05
        ? lead.proposalCart.fxRateHkdToRmb
        : HKD_TO_RMB_RATE,
    claimScenarioId: lead.proposalCart?.claimScenarioId || 'HOSPITAL_MIN_INVASIVE',
    hospitalDeductibleHkd: lead.proposalCart?.hospitalDeductibleHkd ?? 0,
    medicalInflationRatePct:
      lead.proposalCart?.medicalInflationRatePct === 5 ||
      lead.proposalCart?.medicalInflationRatePct === 7
        ? lead.proposalCart.medicalInflationRatePct
        : 0,
    medicalProjectionYears:
      lead.proposalCart?.medicalProjectionYears === 10 ||
      lead.proposalCart?.medicalProjectionYears === 20
        ? lead.proposalCart.medicalProjectionYears
        : 15,
  };
}

export function ensureLeadCartDefaults(lead: ClientLead): ClientLead {
  const schemeMeta = getSchemeMeta(lead.targetSchemeId);
  return {
    ...lead,
    annualBudgetHkd: lead.annualBudgetHkd ?? Math.max(36000, schemeMeta.baseAnnualPremiumHkd),
    familyStage: lead.familyStage || 'CHILDCARE_NUCLEAR',
    occupationRiskClass: lead.occupationRiskClass || 'CLASS_1_OFFICE',
    targetSchemeId: lead.targetSchemeId || 'FAMILY_COMPREHENSIVE',
    clientNotes: typeof lead.clientNotes === 'string' ? lead.clientNotes : '',
    followUpTasks: Array.isArray(lead.followUpTasks) ? lead.followUpTasks : [],
    existingPolicies: Array.isArray(lead.existingPolicies) ? lead.existingPolicies : [],
    householdMembers: Array.isArray(lead.householdMembers) ? lead.householdMembers : [],
    savedSnapshots: Array.isArray(lead.savedSnapshots) ? lead.savedSnapshots : [],
    proposalCart: buildDefaultProposalCartForLead(lead),
  };
}

/**
 * Restores a client lead to its canonical factory preset (if one of the seed profiles)
 * or clean baseline defaults (for user-created custom clients), resetting auto-saved edits.
 */
export function resetLeadToFactoryDefault(
  currentLead: ClientLead,
  seedPresets: ClientLead[]
): ClientLead {
  const matchedSeed = seedPresets.find((s) => s.id === currentLead.id);
  if (matchedSeed) {
    return ensureLeadCartDefaults({
      ...matchedSeed,
      clientNotes: matchedSeed.clientNotes ?? '',
      clientNotesUpdatedAtIso: matchedSeed.clientNotesUpdatedAtIso,
      followUpTasks: [...(matchedSeed.followUpTasks || [])],
      existingPolicies: [...(matchedSeed.existingPolicies || [])],
      householdMembers: [...(matchedSeed.householdMembers || [])],
      contingentOwnerName: matchedSeed.contingentOwnerName,
      beneficiaryAllocations: matchedSeed.beneficiaryAllocations
        ? { ...matchedSeed.beneficiaryAllocations }
        : undefined,
      savedSnapshots: currentLead.savedSnapshots || [],
      lastContactIso: new Date().toISOString(),
    });
  }

  const defaultScheme = getSchemeMeta('FAMILY_COMPREHENSIVE');
  return ensureLeadCartDefaults({
    ...currentLead,
    age: 35,
    annualBudgetHkd: 48000,
    isSmoker: false,
    familyStage: currentLead.residency === 'MCV' ? 'HNW_CROSSBORDER' : 'CHILDCARE_NUCLEAR',
    occupationRiskClass: 'CLASS_1_OFFICE',
    targetSchemeId: 'FAMILY_COMPREHENSIVE',
    existingSummaryNote: '待盤點現有保單明細，建議優先補足私家半私家房及多重危疾現金池',
    priorityGoalNote: defaultScheme.lockedSummaryZh,
    clientNotes: '',
    clientNotesUpdatedAtIso: undefined,
    followUpTasks: [],
    existingPolicies: [],
    proposalCart: undefined,
    lastContactIso: new Date().toISOString(),
  });
}

/**
 * Computes incremental 6-dimension HKD protection coverage contributed by modular riders
 * selected in Stage 03, so Stage 01 Gap Radar & Stage 04 Deck update live when riders change.
 */
export function computeRiderDimensionBoostsHkd(
  selectedRiderIds: string[]
): Record<ProtectionDimensionId, number> {
  const boosts: Record<ProtectionDimensionId, number> = {
    LIFE_MORTGAGE: 0,
    PRIVATE_HOSPITAL: 0,
    CRITICAL_ILLNESS: 0,
    CANCER_TARGETED: 0,
    ACCIDENT_INCOME: 0,
    RETIREMENT_DEMENTIA: 0,
  };

  for (const spec of MODULAR_RIDER_OPTIONS) {
    if (!selectedRiderIds.includes(spec.id)) continue;
    for (const [dimKey, val] of Object.entries(spec.dimensionBoostsHkd)) {
      const k = dimKey as ProtectionDimensionId;
      boosts[k] = (boosts[k] || 0) + (val || 0);
    }
  }
  return boosts;
}

export interface ScenarioComparisonItem {
  scenarioId: ClaimScenarioId;
  titleEn: string;
  titleZh: string;
  totalClaimCostHkd: number;
  existingPayoutHkd: number;
  newBundlePayoutHkd: number;
  outOfPocketShortfallHkd: number;
  fundedRatioPct: number;
}

export interface DealStageStepStatus {
  stageNumber: '01' | '02' | '03' | '04' | '05' | '06';
  sectionKey: 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'stage6';
  shortLabelEn: string;
  shortLabelZh: string;
  completed: boolean;
  metricBadge: string;
}

export interface UnifiedDealValuation {
  lead: ClientLead;
  cart: ProposalCartConfig;
  anchorPlan: InsurancePlan | null;
  comboSecondaryPlans: InsurancePlan[];
  comboNetSecondaryHkd: number;
  planSyncProfile: SelectedPlanSyncProfile | null;
  selectedRiderIds: BundleRiderId[];
  attachedRiderNamesZh: string[];
  attachedRiderNamesEn: string[];
  combinedDimensionBoostsHkd: Record<ProtectionDimensionId, number>;
  gapAudit: SixDimensionGapAuditResult;
  bundleSim: DualCurrencySimulationResult;
  allScenariosComparison: ScenarioComparisonItem[];
  dealStages: DealStageStepStatus[];
}

/**
 * Single Source of Truth Valuation Engine across all 6 Stages of HK InsureHub Pro.
 * Eliminates discrepancies between Stage 01 (Gap Radar), Stage 02 (Market Plans),
 * Stage 03 (Dual-FX Rider Cart), Stage 04 (Pitch Deck/Objections), and Stage 05 (STP e-Sign).
 */
export function resolveUnifiedDealCase(params: {
  lead: ClientLead;
  allPlans: InsurancePlan[];
  explicitSelectedPlanId?: string;
  applications?: PolicyApplicationRecord[];
}): UnifiedDealValuation {
  const { lead, allPlans, explicitSelectedPlanId = '', applications = [] } = params;
  const safeLead = ensureLeadCartDefaults(lead);
  const cart = safeLead.proposalCart!;

  const resolvedPlanId =
    explicitSelectedPlanId !== undefined && explicitSelectedPlanId !== ''
      ? explicitSelectedPlanId
      : cart.anchorPlanId || '';
  const anchorPlan = resolvedPlanId
    ? allPlans.find((p) => p.id === resolvedPlanId) || null
    : null;

  const planSyncProfile = derivePlanSyncProfile(anchorPlan, safeLead);

  const validRiderSet = new Set<string>(MODULAR_RIDER_OPTIONS.map((r) => r.id));
  const selectedRiderIds = cart.selectedRiderIds.filter((id) =>
    validRiderSet.has(id)
  ) as BundleRiderId[];

  const attachedRidersMeta = MODULAR_RIDER_OPTIONS.filter((r) =>
    selectedRiderIds.includes(r.id)
  );

  // Secondary Combo Base Plans (Suggestion #5)
  const comboIds = (cart.comboPlanIds || []).filter((id) => id && id !== anchorPlan?.id).slice(0, 2);
  const comboSecondaryPlans = comboIds
    .map((id) => allPlans.find((p) => p.id === id))
    .filter((p): p is InsurancePlan => Boolean(p));

  const comboBoosts: Record<ProtectionDimensionId, number> = {
    LIFE_MORTGAGE: 0,
    PRIVATE_HOSPITAL: 0,
    CRITICAL_ILLNESS: 0,
    CANCER_TARGETED: 0,
    ACCIDENT_INCOME: 0,
    RETIREMENT_DEMENTIA: 0,
  };
  let comboGrossHkd = 0;
  for (const cPlan of comboSecondaryPlans) {
    const cSync = derivePlanSyncProfile(cPlan, safeLead);
    if (cSync) {
      comboBoosts.LIFE_MORTGAGE += Math.round(cSync.dimensionCoverageBoostsHkd.LIFE_MORTGAGE * 0.65);
      comboBoosts.PRIVATE_HOSPITAL += Math.round(cSync.dimensionCoverageBoostsHkd.PRIVATE_HOSPITAL * 0.8);
      comboBoosts.CRITICAL_ILLNESS += Math.round(cSync.dimensionCoverageBoostsHkd.CRITICAL_ILLNESS * 0.7);
      comboBoosts.CANCER_TARGETED += Math.round(cSync.dimensionCoverageBoostsHkd.CANCER_TARGETED * 0.75);
      comboBoosts.ACCIDENT_INCOME += Math.round(cSync.dimensionCoverageBoostsHkd.ACCIDENT_INCOME * 0.65);
      comboBoosts.RETIREMENT_DEMENTIA += Math.round(cSync.dimensionCoverageBoostsHkd.RETIREMENT_DEMENTIA * 0.7);
    }
    // Conservative realistic secondary plan annual HKD estimate
    comboGrossHkd += Math.max(4800, Math.round(cPlan.baseRatePer1000UsdAge35Ns * 60 * 7.8 * 0.18));
  }
  const comboNetSecondaryHkd = Math.round(
    comboGrossHkd * (comboSecondaryPlans.length >= 2 ? 0.95 : comboSecondaryPlans.length === 1 ? 0.97 : 1)
  );

  // Combine Scheme/Anchor-Plan coverage boosts + Combo boosts + Rider coverage boosts
  const schemeMeta = getSchemeMeta(safeLead.targetSchemeId);
  const riderBoosts = computeRiderDimensionBoostsHkd(selectedRiderIds);

  const basePlanBoosts: Record<ProtectionDimensionId, number> = planSyncProfile
    ? planSyncProfile.dimensionCoverageBoostsHkd
    : {
        LIFE_MORTGAGE: Math.round(schemeMeta.defaultNewCoverageHkd.LIFE_MORTGAGE * 0.55),
        PRIVATE_HOSPITAL: Math.round(schemeMeta.defaultNewCoverageHkd.PRIVATE_HOSPITAL * 0.55),
        CRITICAL_ILLNESS: Math.round(schemeMeta.defaultNewCoverageHkd.CRITICAL_ILLNESS * 0.55),
        CANCER_TARGETED: Math.round(schemeMeta.defaultNewCoverageHkd.CANCER_TARGETED * 0.55),
        ACCIDENT_INCOME: Math.round(schemeMeta.defaultNewCoverageHkd.ACCIDENT_INCOME * 0.55),
        RETIREMENT_DEMENTIA: Math.round(schemeMeta.defaultNewCoverageHkd.RETIREMENT_DEMENTIA * 0.55),
      };

  const combinedDimensionBoostsHkd: Record<ProtectionDimensionId, number> = {
    LIFE_MORTGAGE: basePlanBoosts.LIFE_MORTGAGE + comboBoosts.LIFE_MORTGAGE + riderBoosts.LIFE_MORTGAGE,
    PRIVATE_HOSPITAL: basePlanBoosts.PRIVATE_HOSPITAL + comboBoosts.PRIVATE_HOSPITAL + riderBoosts.PRIVATE_HOSPITAL,
    CRITICAL_ILLNESS: basePlanBoosts.CRITICAL_ILLNESS + comboBoosts.CRITICAL_ILLNESS + riderBoosts.CRITICAL_ILLNESS,
    CANCER_TARGETED: basePlanBoosts.CANCER_TARGETED + comboBoosts.CANCER_TARGETED + riderBoosts.CANCER_TARGETED,
    ACCIDENT_INCOME: basePlanBoosts.ACCIDENT_INCOME + comboBoosts.ACCIDENT_INCOME + riderBoosts.ACCIDENT_INCOME,
    RETIREMENT_DEMENTIA: basePlanBoosts.RETIREMENT_DEMENTIA + comboBoosts.RETIREMENT_DEMENTIA + riderBoosts.RETIREMENT_DEMENTIA,
  };

  const gapAudit = evaluateSixDimensionGapAudit(
    safeLead,
    safeLead.targetSchemeId,
    combinedDimensionBoostsHkd
  );

  const activeScenarioId = (CLAIM_SCENARIO_PRESETS.some((s) => s.id === cart.claimScenarioId)
    ? cart.claimScenarioId
    : planSyncProfile?.suggestedScenarioId || 'HOSPITAL_MIN_INVASIVE') as ClaimScenarioId;

  const rawBundleSim = calculateDualCurrencyBundleSimulation({
    lead: safeLead,
    selectedPlan: anchorPlan,
    selectedRiderIds,
    paymentMode: cart.paymentMode,
    paymentTermYears: cart.paymentTermYears,
    fxRateHkdToRmb: cart.fxRateHkdToRmb,
    scenarioId: activeScenarioId,
  });

  const mergedNetAnnualHkd = rawBundleSim.netAnnualPremiumHkd + comboNetSecondaryHkd;
  const clientBudgetHkd = safeLead.annualBudgetHkd ?? 48000;
  const bundleSim: DualCurrencySimulationResult =
    comboNetSecondaryHkd > 0
      ? {
          ...rawBundleSim,
          netAnnualPremiumHkd: mergedNetAnnualHkd,
          netAnnualPremiumRmb: Math.round(mergedNetAnnualHkd * cart.fxRateHkdToRmb),
          netAnnualPremiumUsd: Math.round(mergedNetAnnualHkd / 7.8),
          monthlyEquivalentHkd: Math.round(mergedNetAnnualHkd / 12),
          monthlyEquivalentRmb: Math.round((mergedNetAnnualHkd / 12) * cart.fxRateHkdToRmb),
          effectiveAfterTaxAnnualHkd: Math.max(0, mergedNetAnnualHkd - rawBundleSim.estimatedTaxSavedHkd),
          effectiveAfterTaxAnnualRmb: Math.round(
            Math.max(0, mergedNetAnnualHkd - rawBundleSim.estimatedTaxSavedHkd) * cart.fxRateHkdToRmb
          ),
          budgetUtilizationPct: Math.round((mergedNetAnnualHkd / Math.max(1, clientBudgetHkd)) * 100),
          withinClientBudget: mergedNetAnnualHkd <= clientBudgetHkd,
        }
      : rawBundleSim;

  // Evaluate all claim scenarios simultaneously for the Stage 03 & Stage 04 Stress Comparison Chart
  const allScenariosComparison: ScenarioComparisonItem[] = CLAIM_SCENARIO_PRESETS.map((preset) => {
    const sSim =
      preset.id === activeScenarioId
        ? bundleSim
        : calculateDualCurrencyBundleSimulation({
            lead: safeLead,
            selectedPlan: anchorPlan,
            selectedRiderIds,
            paymentMode: cart.paymentMode,
            paymentTermYears: cart.paymentTermYears,
            fxRateHkdToRmb: cart.fxRateHkdToRmb,
            scenarioId: preset.id,
          });
    const out = sSim.scenarioOutcome;
    const fundedRatioPct = Math.min(
      100,
      Math.round((out.totalCoveredHkd / Math.max(1, out.totalEventCostHkd)) * 100)
    );
    return {
      scenarioId: preset.id,
      titleEn: preset.titleEn,
      titleZh: preset.titleZh,
      totalClaimCostHkd: out.totalEventCostHkd,
      existingPayoutHkd: out.existingPolicyPayoutHkd,
      newBundlePayoutHkd: out.newBundlePayoutHkd,
      outOfPocketShortfallHkd: out.clientOutOfPocketHkd,
      fundedRatioPct,
    };
  });

  const hasSignedApp = applications.some((a) => a.leadId === safeLead.id);
  const fnaReady =
    Boolean(safeLead.fnaRecord) &&
    (safeLead.residency === 'MCV'
      ? Boolean(safeLead.kycCheck.hkidVerified && safeLead.kycCheck.mcvEntrySlipVerified)
      : Boolean(safeLead.kycCheck.hkidVerified));

  const dealStages: DealStageStepStatus[] = [
    {
      stageNumber: '01',
      sectionKey: 'stage1',
      shortLabelEn: 'Client Info',
      shortLabelZh: '客戶資料',
      completed: fnaReady,
      metricBadge: `${gapAudit.overallCompletionPct}%`,
    },
    {
      stageNumber: '02',
      sectionKey: 'stage2',
      shortLabelEn: 'Compare Plans',
      shortLabelZh: '產品比較',
      completed: Boolean(anchorPlan),
      metricBadge: anchorPlan ? anchorPlan.insurerCode : '待選擇',
    },
    {
      stageNumber: '03',
      sectionKey: 'stage3',
      shortLabelEn: 'Quote & Riders',
      shortLabelZh: '保費配搭',
      completed: selectedRiderIds.length > 0,
      metricBadge: `HK$${Math.round(bundleSim.netAnnualPremiumHkd / 1000)}k`,
    },
    {
      stageNumber: '04',
      sectionKey: 'stage4',
      shortLabelEn: 'Proposal',
      shortLabelZh: '建議書',
      completed: Boolean(anchorPlan) || selectedRiderIds.length > 0,
      metricBadge: '5 頁簡報',
    },
    {
      stageNumber: '05',
      sectionKey: 'stage5',
      shortLabelEn: 'Sign & Service',
      shortLabelZh: '簽署及售後',
      completed: hasSignedApp,
      metricBadge: hasSignedApp ? '已簽署' : fnaReady ? '可簽署' : '待補件',
    },
    {
      stageNumber: '06',
      sectionKey: 'stage6',
      shortLabelEn: 'Calculators',
      shortLabelZh: '計算工具',
      completed: (safeLead.savedSnapshots?.length || 0) > 0,
      metricBadge: `${safeLead.savedSnapshots?.length || 0} 存檔`,
    },
  ];

  return {
    lead: safeLead,
    cart,
    anchorPlan,
    comboSecondaryPlans,
    comboNetSecondaryHkd,
    planSyncProfile,
    selectedRiderIds,
    attachedRiderNamesZh: attachedRidersMeta.map((r) => r.titleZh),
    attachedRiderNamesEn: attachedRidersMeta.map((r) => r.titleEn),
    combinedDimensionBoostsHkd,
    gapAudit,
    bundleSim,
    allScenariosComparison,
    dealStages,
  };
}
