export enum IntermediaryRole {
  BROKER_TR = 'BROKER_TR',
  TIED_AGENT = 'TIED_AGENT',
}

export enum PlanCategory {
  PARTICIPATING_SAVINGS = 'PARTICIPATING_SAVINGS',
  CRITICAL_ILLNESS = 'CRITICAL_ILLNESS',
  VHIS = 'VHIS',
  HIGH_END_MEDICAL = 'HIGH_END_MEDICAL',
  QDAP = 'QDAP',
  UNIVERSAL_LIFE = 'UNIVERSAL_LIFE',
  TERM_LIFE = 'TERM_LIFE',
  GENERAL_GI = 'GENERAL_GI',
}

export enum LeadStage {
  NEW = 'NEW',
  FNA_COMPLETED = 'FNA_COMPLETED',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  UNDERWRITING = 'UNDERWRITING',
  IN_FORCE = 'IN_FORCE',
}

export type AppLanguage = 'en' | 'zh-HK' | 'zh-CN';
export type CurrencyCode = 'USD' | 'HKD' | 'RMB';
export type ResidencyType = 'HK_RESIDENT' | 'MCV';
export type RiskTolerance = 'CONSERVATIVE' | 'MODERATE' | 'BALANCED' | 'GROWTH';
export type ProvenanceTier = 'SOURCED_BROCHURE' | 'LIVE_SEARCH_GROUNDED' | 'SYNTHETIC_MODEL';
export type CrmStandardCategory =
  | 'Savings'
  | 'Critical Illness'
  | 'Medical'
  | 'Life'
  | 'Tax Annuity'
  | 'General Insurance';

export interface IntermediaryProfile {
  id: string;
  nameEn: string;
  nameZh: string;
  iaLicenseNo: string;
  firmName: string;
  role: IntermediaryRole;
  appointedInsurers: string[]; // ['ALL'] for Broker TR; max 4 (max 2 Long-Term) for Tied Agent
  avatarUrl: string;
}

export interface InsurancePlan {
  id: string;
  insurerCode: string;
  insurerNameEn: string;
  insurerNameZh: string;
  nameEn: string;
  nameZh: string;
  category: PlanCategory;
  categoryLabelEn: string;
  categoryLabelZh: string;
  currencies: CurrencyCode[];
  fulfillmentRatio: number | null; // null for pure protection/medical
  rawProjectedIrr: number; // e.g., 0.071 for 7.1% before HKIA cap
  guaranteedIrr: number; // e.g., 0.012
  baseRatePer1000UsdAge35Ns: number;
  supportedPaymentTerms: number[];
  taxDeductibleCapHkd: number | null; // HK$8,000 for VHIS, HK$60,000 for QDAP
  waitingPeriodText: string;
  highlights?: string[];
  keyHighlightsEn: string[];
  keyHighlightsZh: string[];
  submissionChannel: 'OPEN_API_INSTANT' | 'SMART_ACROFORM_STP';
  officialUrl?: string;
  gn16ReportUrl?: string;
  brochurePdfUrl?: string;
  standardPremiumPdfUrl?: string;
  promoFlyerPdfUrl?: string;
  vhisCertificationNo?: string;
  vhisProductId?: string;
  vhisTier?: 'Standard' | 'Flexi';
  vhisWardOrLevel?: string;
  vhisEffectiveDate?: string;
  issueAge?: string;
  benefitPeriod?: string;
  crawledPromoHighlights?: string;
  crawledRetrievalDate?: string;
  crawledDataQualityNotes?: string[];
  crawledSourceMatched?: boolean;
  provenanceTier?: ProvenanceTier;
  historicalCohortNote?: string;
  crmStandardCategory?: CrmStandardCategory;
  normalizedAtIso?: string;
}

export interface FnaRecord {
  monthlyIncomeHkd: number;
  monthlyExpensesHkd: number;
  liquidAssetsHkd: number;
  dependentsCount: number;
  riskTolerance: RiskTolerance;
  primaryObjectives: string[];
  postRetirementSourceNote: string;
  signedAtIso: string;
}

export interface KycDocumentCheck {
  hkidVerified: boolean;
  hkidDocNumber: string;
  mcvEntrySlipVerified: boolean;
  mcvEntryDate?: string;
  mcvPermittedUntil?: string;
}

export type TargetProtectionSchemeId =
  | 'VHIS_HIGH_END'
  | 'MULTI_CI'
  | 'FAMILY_COMPREHENSIVE'
  | 'MULTI_FX_LEGACY';

export type ProtectionDimensionId =
  | 'LIFE_MORTGAGE'
  | 'PRIVATE_HOSPITAL'
  | 'CRITICAL_ILLNESS'
  | 'CANCER_TARGETED'
  | 'ACCIDENT_INCOME'
  | 'RETIREMENT_DEMENTIA';

export type FamilyStageCode =
  | 'CHILDCARE_NUCLEAR'
  | 'SINGLE_YOUNG_PRO'
  | 'NEWLYWED_DUAL'
  | 'HNW_CROSSBORDER'
  | 'PRE_RETIREMENT';

export type OccupationRiskClass =
  | 'CLASS_1_OFFICE'
  | 'CLASS_2_SUPERVISORY'
  | 'CLASS_3_SKILLED'
  | 'CLASS_4_HIGH_RISK';

export interface ExistingPolicyAuditItem {
  id: string;
  policyNumber?: string;
  policyName: string;
  dimensionId: ProtectionDimensionId;
  coverageAmountHkd: number;
  annualPremiumHkd: number;
  limitationNote?: string;
  addedAtIso: string;
}

export interface MorningBriefingSlide {
  id: string;
  order: number;
  badgeEn: string;
  badgeZh: string;
  titleEn: string;
  titleZh: string;
  keyMetricLabelEn: string;
  keyMetricLabelZh: string;
  keyMetricValue: string;
  bulletsEn: string[];
  bulletsZh: string[];
  speakerNoteEn: string;
  speakerNoteZh: string;
}

export type HouseholdRelation = 'SPOUSE' | 'CHILD' | 'PARENT';

export interface HouseholdMember {
  id: string;
  nameZh: string;
  nameEn: string;
  relation: HouseholdRelation;
  age: number;
  isSmoker: boolean;
  vhisEligible: boolean;
  qdapEligible: boolean;
  annualPremiumHkd?: number;
  policySummaryZh?: string;
}

export type HealthImpairmentCode =
  | 'STANDARD_HEALTH'
  | 'ELEVATED_BMI'
  | 'THYROID_NODULE'
  | 'FATTY_LIVER'
  | 'HYPERTENSION_CONTROLLED'
  | 'HYPERLIPIDEMIA'
  | 'COLON_POLYP'
  | 'HEP_B_CARRIER'
  | 'BREAST_CYST_BENIGN'
  | 'PREDIABETES'
  | 'SLEEP_APNEA'
  | 'GYN_FIBROID_CYST';

export interface McvCrossBorderChecklist {
  landingSlipVerified: boolean;
  hkBankEddaReady: boolean;
  safeFxQuotaDeclared: boolean;
  onshoreHksarSigned: boolean;
}

export type MedicalInflationRatePct = 0 | 5 | 7;

export interface ProposalCartConfig {
  anchorPlanId?: string;
  comboPlanIds?: string[];
  selectedRiderIds: string[];
  paymentMode: 'ANNUAL' | 'MONTHLY';
  paymentTermYears: number;
  currency: CurrencyCode;
  sumAssuredUsd: number;
  fxRateHkdToRmb: number;
  claimScenarioId: string;
  hospitalDeductibleHkd?: 0 | 20000 | 50000;
  medicalInflationRatePct?: MedicalInflationRatePct;
  medicalProjectionYears?: 10 | 15 | 20;
}

export interface SavedToolSnapshot {
  id: string;
  toolCode: string;
  toolTitleZh: string;
  toolTitleEn: string;
  headlineMetric: string;
  summaryZh?: string;
  summaryEn?: string;
  advisorNote?: string;
  savedAtIso: string;
}

export type FollowUpTaskCategory = 'UW_DOC' | 'RENEWAL' | 'SIGNING' | 'REVIEW';

export interface ClientFollowUpTask {
  id: string;
  title: string;
  dueDateIso: string; // YYYY-MM-DD
  completed: boolean;
  category?: FollowUpTaskCategory;
}

export interface ClientLead {
  id: string;
  fullNameEn: string;
  fullNameZh: string;
  hkidNumber?: string;
  age: number;
  plannedRetirementAge: number;
  isSmoker: boolean;
  residency: ResidencyType;
  whatsappPhone: string;
  email: string;
  stage: LeadStage;
  notes: string;
  roleTagZh?: string;
  roleTagEn?: string;
  annualBudgetHkd?: number;
  familyStage?: FamilyStageCode;
  occupationRiskClass?: OccupationRiskClass;
  targetSchemeId?: TargetProtectionSchemeId;
  existingSummaryNote?: string;
  priorityGoalNote?: string;
  clientNotes?: string;
  clientNotesUpdatedAtIso?: string;
  followUpTasks?: ClientFollowUpTask[];
  contingentOwnerName?: string;
  beneficiaryAllocations?: Record<string, number>;
  existingPolicies?: ExistingPolicyAuditItem[];
  householdMembers?: HouseholdMember[];
  healthTriageCode?: HealthImpairmentCode;
  mcvChecklist?: McvCrossBorderChecklist;
  proposalCart?: ProposalCartConfig;
  savedSnapshots?: SavedToolSnapshot[];
  birthdayMonthDay?: string; // MM-DD
  fnaRecord: FnaRecord | null;
  kycCheck: KycDocumentCheck;
  lastContactIso: string;
}

export interface FxRateFeedState {
  usdToHkd: number;
  hkdToRmb: number;
  usdToRmb: number;
  updatedAtIso: string;
  sourceLabel: string;
  rateLocked: boolean;
}

export interface PromoAdminOverride {
  insurerCode: string;
  archived: boolean;
  customRebatePct?: number;
  customPrepaidRatePct?: number | null;
  daysRemainingOverride?: number;
  updatedAtIso: string;
}

export interface TeamLibraryItem {
  id: string;
  kind: 'CASE_DECK' | 'OBJECTION_SCRIPT';
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  authorName: string;
  authorLicense: string;
  tags: string[];
  cloneCount: number;
  createdAtIso: string;
  slides?: MorningBriefingSlide[];
  objectionCategoryZh?: string;
  objectionPromptZh?: string;
  objectionReplyZh?: string;
  objectionReplyEn?: string;
}

export interface IdentityScanResult {
  verified: boolean;
  docType: 'HKID' | 'MCV_ENTRY_SLIP';
  residency: ResidencyType;
  fullNameEn: string;
  fullNameZh: string;
  hkidNumber: string;
  documentNumber: string;
  hkidChecksumValid: boolean | null;
  dateOfBirth: string;
  calculatedAge: number | null;
  gender: 'M' | 'F' | '';
  entryDate: string;
  permittedUntil: string;
  onshoreValid: boolean;
  rawOcrText: string;
  ocrEngine: 'google-cloud-vision' | 'gemini-vision-ocr' | 'local-ocr-fallback';
}

export interface SurrenderProjectionRow {
  policyYear: number;
  clientAge: number;
  cumulativePremiumsPaid: number;
  guaranteedCashValue: number;
  nonGuaranteedDividend: number;
  totalSurrenderValue: number;
}

export interface ActuarialQuoteResult {
  planId: string;
  currency: CurrencyCode;
  fxRateFromUsd: number;
  sumAssured: number;
  paymentTermYears: number;
  annualPremium: number;
  monthlyEquivalent: number;
  totalPremiumsPaid: number;
  rawIrrPercent: number;
  appliedHkiaIrrCapPercent: number | null;
  effectiveIllustratedIrrPercent: number;
  estimatedAnnualTaxSavedHkd: number;
  breakevenYear: number | null; // Total illustrated breakeven (Guaranteed + Non-Guaranteed)
  guaranteedBreakevenYear: number | null; // Guaranteed cash value breakeven (~Yr 16-22)
  projections: SurrenderProjectionRow[];
}

export interface ComplianceCheckResult {
  canSubmitStp: boolean;
  canCompareBenchmark: boolean;
  blockingReasons: string[];
  suitabilityWarnings: string[];
  passedChecks: string[];
}

export interface PolicyApplicationRecord {
  id: string;
  referenceNo: string;
  leadId: string;
  clientNameEn: string;
  clientNameZh: string;
  whatsappPhone: string;
  planId: string;
  insurerCode: string;
  planNameEn: string;
  planNameZh: string;
  currency: CurrencyCode;
  sumAssured: number;
  paymentTermYears: number;
  annualPremium: number;
  effectiveIrrPercent: number;
  intermediaryLicenseNo: string;
  signatureDataUrl: string;
  status: 'SUBMITTED_UNDERWRITING' | 'INSTANT_ISSUED';
  submissionChannel: 'OPEN_API_INSTANT' | 'SMART_ACROFORM_STP';
  createdAtIso: string;
  bundledRiderSummary?: string;
  driveFileId?: string;
  driveWebViewLink?: string;
}

export interface PolicyProvisionChunk {
  id: string;
  planId: string;
  insurerName: string;
  planName: string;
  clauseRef: string;
  topicTags: string[];
  contentEn: string;
  contentZh: string;
}

export interface ClauseComparisonItem {
  insurer: string;
  planName: string;
  coverageVerdict: string;
  waitingPeriod: string;
  keyDetails: string;
  exactSourceCitation: string;
}

export interface ClauseComparisonResponse {
  summaryRecommendation: string;
  planComparisons: ClauseComparisonItem[];
  regulatoryDisclaimer: string;
  sourceMode: 'gemini-live' | 'grounded-corpus';
}

export interface DriveSyncedFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
  size?: string;
}

export interface HospitalLogEntry {
  recordId: string;
  hospitalNameZh: string;
  hospitalNameEn: string;
  district: 'HK_ISLAND' | 'KOWLOON' | 'NEW_TERRITORIES';
  billingTier: 'TIER_1_CASHLESS' | 'DIRECT_BILLING';
  logDepositHkd: number;
  cashDepositRangeHkd: string;
  cashDepositMidpointHkd: number;
  preApprovalTurnaround: string;
  officialRegistryUrl: string;
  verificationStatus: 'SOURCED';
  auditNote: string;
}

export type HospitalWardTier = 'STANDARD_WARD' | 'SEMI_PRIVATE' | 'PRIVATE_ROOM';
export type HospitalDeductibleHkd = 0 | 20000 | 50000;

export interface HospitalPlanSignupOption {
  plan: InsurancePlan;
  nativeWardTier: HospitalWardTier;
  logStatus: 'FULL_CASHLESS_LOG' | 'WARD_UPGRADE_TOPUP';
  estimatedDepositRequiredHkd: number;
  depositWaivedHkd: number;
  annualPremiumHkd: number;
  monthlyPremiumHkd: number;
  irdTaxSavedHkd: number;
  netAnnualCostAfterTaxHkd: number;
  annualLimitLabelEn: string;
  annualLimitLabelZh: string;
  optionSummaryEn: string;
  optionSummaryZh: string;
}

export interface Gn16DisclosureRecord {
  recordId: string;
  insurerCode: string;
  insurerNameZh: string;
  insurerNameEn: string;
  productSeriesZh: string;
  productSeriesEn: string;
  inceptionCohorts: number[];
  illustrativeBandText: string;
  officialUrl: string;
  reportingCycle: string;
  sourceCoveragePct: number;
  auditNote: string;
}

export interface GroundedWebSource {
  title: string;
  uri: string;
}

export interface LiveMarketSearchResponse {
  query: string;
  marketSummary: string;
  discoveredPlans: InsurancePlan[];
  sources: GroundedWebSource[];
  sourceMode: 'google-search-live' | 'curated-hk-index';
}

export interface IrdTaxReliefResult {
  filingStatus: 'SINGLE' | 'MARRIED_JOINT';
  marginalRatePercent: number;
  eligibleQdapDeductionHkd: number;
  eligibleVhisDeductionHkd: number;
  totalEligibleDeductionHkd: number;
  annualTaxSavedHkd: number;
  statutoryReference: string;
}

export interface PracticeBreakEvenResult {
  advisorProNetPerSeatHkd: number;
  advisorProLeanBreakEvenSeats: number;
  advisorProFullBreakEvenSeats: number;
  agencyTeamNetPerUnitHkd: number;
  agencyTeamLeanBreakEvenUnits: number;
  agencyTeamFullBreakEvenUnits: number;
  monthlyChurnReplacementSeats: number;
}

export interface AgentWorkflowActionStep {
  id: string;
  title: string;
  rationale: string;
  estimatedMinutesSaved: number;
  targetAction: 'OPEN_FNA' | 'OPEN_OCR' | 'LAUNCH_STP' | 'ENABLE_SAFE_MODE' | 'OPEN_HOSPITAL_LOG';
}

export interface ClientPredictedQuestion {
  id: string;
  question: string;
  concernCategory: string;
  compliantAnswer: string;
  citationOrRule: string;
}

export interface AppImprovementItem {
  id: string;
  sourceSubAgent: 'AGENT_EFFICIENCY' | 'CLIENT_EXPERIENCE';
  moduleTarget: string;
  title: string;
  problemSolved: string;
  impactMetric: string;
}

export interface DualSubAgentResponse {
  agentSubAgent: {
    personaTitle: string;
    readinessScoreLabel: string;
    executiveBrief: string;
    workflowSteps: AgentWorkflowActionStep[];
    readyPitchScript: string;
    appImprovements: AppImprovementItem[];
  };
  clientSubAgent: {
    personaTitle: string;
    psychologySummary: string;
    predictedQuestions: ClientPredictedQuestion[];
    appImprovements: AppImprovementItem[];
  };
  sourceMode: 'gemini-dual-subagents' | 'deterministic-hk-subagents';
  generatedAtIso: string;
}

export interface PlanSpecialOffer {
  offerCode: string;
  headlineZh: string;
  headlineEn: string;
  firstYearRebatePct: number;
  prepaidGuaranteedRatePct: number | null;
  prepaidTermYears: number | null;
  daysRemaining: number;
  conditionNoteZh: string;
  conditionNoteEn: string;
}

export type LinkVerificationStatus =
  | 'VERIFIED_200'
  | 'WAF_BROWSER_ONLY'
  | 'SOFT_404'
  | 'DEAD_OR_TIMEOUT'
  | 'NOT_APPLICABLE';

export interface PlanLinkProbeItem {
  kind: 'OFFICIAL_PRODUCT' | 'GN16_FULFILLMENT';
  testedUrl: string;
  finalResolvedUrl: string;
  httpStatus: number | null;
  status: LinkVerificationStatus;
  pageTitle: string;
  recommendedUrl: string;
  statusSummaryZh: string;
  statusSummaryEn: string;
}

export interface PlanLinkAuditResult {
  planId: string;
  insurerCode: string;
  insurerNameZh: string;
  insurerNameEn: string;
  planNameZh: string;
  planNameEn: string;
  officialProbe: PlanLinkProbeItem;
  gn16Probe: PlanLinkProbeItem;
  hkiaCentralPortalUrl: string;
  aiReviewVerdictZh: string;
  aiReviewVerdictEn: string;
  groundedSources: GroundedWebSource[];
  sourceMode: 'gemini-search-link-subagent' | 'http-probe-and-registry';
  auditedAtIso: string;
}

// ============================================================================
// POST-SALE SERVICING, RENEWAL CALENDAR, CLAIMS LOG KANBAN & HKIA GOVERNANCE
// ============================================================================

export type InForceRenewalStatus = 'ACTIVE' | 'DUE_SOON' | 'GRACE_PERIOD';

export interface InForcePolicyRecord {
  id: string;
  policyId: string;
  leadId: string;
  clientNameZh: string;
  clientNameEn: string;
  insurerCode: string;
  planNameZh: string;
  planNameEn: string;
  currency: CurrencyCode;
  annualPremium: number;
  nextDueDateIso: string; // YYYY-MM-DD
  graceEndsIso: string; // YYYY-MM-DD (30 days after due date)
  status: InForceRenewalStatus;
  fxRateLocked: boolean;
  splitEligible: boolean;
}

export type ClaimKanbanStage =
  | 'LOG_PREAPPROVAL'
  | 'DOCTOR_REPORT'
  | 'INSURER_ASSESSMENT'
  | 'SETTLED';

export interface ClaimChecklistItem {
  id: string;
  itemZh: string;
  itemEn: string;
  done: boolean;
}

export interface ClaimConciergeCase {
  id: string;
  claimNumber: string;
  policyId: string;
  leadId: string;
  clientNameZh: string;
  clientNameEn: string;
  hospitalNameZh: string;
  hospitalNameEn: string;
  diagnosisZh: string;
  diagnosisEn: string;
  estimatedClaimHkd: number;
  cashlessLogApproved: boolean;
  stage: ClaimKanbanStage;
  checklist: ClaimChecklistItem[];
  updatedAtIso: string;
}

export type PolicyEndorsementType =
  | 'CURRENCY_SWITCH'
  | 'POLICY_SPLIT'
  | 'CHANGE_INSURED'
  | 'CONTINGENT_OWNER'
  | 'BENEFICIARY_CHANGE';

export interface PolicyEndorsementRequest {
  id: string;
  referenceNo: string;
  policyId: string;
  leadId: string;
  clientNameZh: string;
  clientNameEn: string;
  endorsementType: PolicyEndorsementType;
  detailSummaryZh: string;
  detailSummaryEn: string;
  effectiveDateIso: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
}

export type HkiaCpdCategory = 'ETHICS_REGULATION' | 'TECHNICAL_ACTUARIAL';

export interface HkiaCpdCourseEntry {
  id: string;
  titleZh: string;
  titleEn: string;
  provider: string;
  hours: number;
  category: HkiaCpdCategory;
  completedDateIso: string;
  certificateRef: string;
}

export type AgencyTeamRole = 'ADVISOR' | 'UW_ASSISTANT' | 'COMPLIANCE_OFFICER';

export interface AgencyHandoverItem {
  id: string;
  leadId: string;
  clientNameZh: string;
  clientNameEn: string;
  policyOrRefId: string;
  fromRole: AgencyTeamRole;
  toRole: AgencyTeamRole;
  taskSummaryZh: string;
  taskSummaryEn: string;
  priority: 'NORMAL' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  updatedAtIso: string;
}


