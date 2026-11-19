/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Menu,
  QrCode,
  Share2,
  ShieldAlert,
  X,
} from 'lucide-react';
import { ActivePlanContextBar } from './components/ActivePlanContextBar';
import { AdvancedActuarialLabPanel } from './components/AdvancedActuarialLabPanel';
import { AgencyLeaderCoachingView } from './components/AgencyLeaderCoachingView';
import { AutoPolicyStpView } from './components/AutoPolicyStpView';
import { ClientInsightsView } from './components/ClientInsightsView';
import {
  ClientMicrositeView,
  ScannableProposalQrSvg,
} from './components/ClientMicrositeView';
import { ClientPresentationLockOverlay } from './components/ClientPresentationLockOverlay';
import { ClientProfileGapView } from './components/ClientProfileGapView';
import { ConfirmModal } from './components/ConfirmModal';
import { DualCurrencySimulatorView } from './components/DualCurrencySimulatorView';
import { QrReadIntentAlertsPanel } from './components/QrReadIntentAlertsPanel';
import { ExecutiveLandingPage3D } from './components/ExecutiveLandingPage3D';
import { AdvisoryFunctionCode } from './components/FeatureLabView';
import { GlobalCommandPaletteModal } from './components/GlobalCommandPaletteModal';
import { GoogleDriveGuideView } from './components/GoogleDriveGuideView';
import { InteractiveWalkthroughCoach } from './components/InteractiveWalkthroughCoach';
import { LeadCrmView } from './components/LeadCrmView';
import { IntelTab, MarketIntelView } from './components/MarketIntelView';
import { MarketPlansView } from './components/MarketPlansView';
import {
  MemberAuthModal,
  type MemberModalInitialTab,
} from './components/MemberAuthModal';
import { MobileSummaryPosterModal } from './components/MobileSummaryPosterModal';
import { MorningPresentationView } from './components/MorningPresentationView';
import { PolicyCopilotView } from './components/PolicyCopilotView';
import { PostSaleAndComplianceHub } from './components/PostSaleAndComplianceHub';
import { PromoAndFxConsoleModal } from './components/PromoAndFxConsoleModal';
import { ShareProposalActionButton } from './components/ShareProposalActionButton';
import { OfflineIndicator } from './components/PwaControls';
import { SidebarNav, WorkspaceSection } from './components/SidebarNav';
import { SubAgentsStudioView } from './components/SubAgentsStudioView';
import {
  ActiveClassifiedToolSelection,
  UnifiedAdvisoryToolsHub,
} from './components/UnifiedAdvisoryToolsHub';
import { PowerPackToolId } from './domain/advisorSixPowerPackEngine';
import { GuidedStepFooter } from './components/GuidedStepFooter';
import { applyCrawledEnrichmentToPlans } from './data/hkCrawledEnrichment';
import { HK_MARKET_PLANS, INTERMEDIARY_PROFILES } from './data/hkMarketPlans';
import {
  evaluateGuidedStepGate,
  resolveAgentCompanyOption,
} from './domain/guidedWorkflowEngine';
import { INITIAL_CLIENT_LEADS } from './data/initialLeads';
import { copyTextSafe, scrollWindowToTop } from './utils/clipboardAndDom';
import { generateScannableQrPngDataUrl } from './utils/qrCodeGenerator';
import {
  MASTER_GUIDE_FILENAME,
  MASTER_GUIDE_MARKDOWN,
} from './data/masterGuideContent';
import { INITIAL_POLICY_PROVISIONS } from './data/policyProvisionsCorpus';
import {
  calculateCompliantQuote,
  evaluateHkiaCompliance,
} from './domain/actuarialEngine';
import type { NeedContextHint } from './domain/clauseAndMonetizationEngine';
import {
  ensureLeadCartDefaults,
  migrateWorkspaceLeadsV3,
  resolveUnifiedDealCase,
  WORKSPACE_SCHEMA_VERSION,
} from './domain/dealCaseEngine';
import {
  LanguageContext,
  pickLangText,
  toSimplifiedChinese,
} from './domain/i18n';
import {
  ClientMicrositeRecord,
  createClientMicrositeProposal,
  DEFAULT_WHITE_LABEL_CONFIG,
  TwentyUpgradeCode,
  WhatsAppComplianceLogEntry,
  WhiteLabelBrandConfig,
} from './domain/twentyUpgradesEngine';
import {
  DEFAULT_THREE_COMPARE_PLAN_IDS,
  MAX_COMPARED_PLANS,
  resolveVerifiedPlanUrls,
  setComparisonSlotPlan,
  toggleThreePlanComparison,
} from './domain/planLinksAndOffersEngine';
import {
  DEFAULT_LIVE_FX_FEED,
  formatFxRateStamp,
  INITIAL_TEAM_LIBRARY_ITEMS,
  toggleComboSecondaryPlan,
} from './domain/proEnhancementsEngine';
import {
  INITIAL_AGENCY_HANDOVERS,
  INITIAL_CLAIM_CASES,
  INITIAL_CPD_ENTRIES,
  INITIAL_ENDORSEMENT_REQUESTS,
  INITIAL_IN_FORCE_POLICIES,
} from './domain/lifecycleAndComplianceEngine';
import {
  AgencyHandoverItem,
  AgentWorkflowActionStep,
  AppLanguage,
  ClaimConciergeCase,
  ClientLead,
  CurrencyCode,
  DriveSyncedFile,
  FxRateFeedState,
  HkiaCpdCourseEntry,
  InForcePolicyRecord,
  InsurancePlan,
  IntermediaryRole,
  LeadStage,
  MorningBriefingSlide,
  PlanCategory,
  PolicyApplicationRecord,
  PolicyEndorsementRequest,
  PolicyProvisionChunk,
  PromoAdminOverride,
  SavedToolSnapshot,
  TeamLibraryItem,
} from './domain/types';
import {
  buildGoogleSsoMemberProfile,
  type MemberAccountProfile,
  toIntermediaryProfileFromMember,
} from './domain/memberAuthEngine';
import type { TutorialTargetSubTab } from './domain/tutorialWalkthroughConfig';
import {
  getAccessToken,
  googleSignIn,
  initAuth,
  logoutGoogle,
} from './services/googleAuth';
import {
  logoutAdvisorMember,
  persistMemberSession,
  readPersistedMemberSession,
  verifyServerMemberSession,
} from './services/memberAuthService';
import {
  APPDATA_WORKSPACE_BACKUP_FILENAME,
  deleteInsureHubDriveFile,
  ensureInsureHubFolder,
  findAppDataBackupFile,
  findExistingDriveFileByName,
  listInsureHubDriveFiles,
  restoreWorkspaceFromAppDataFolder,
  saveWorkspaceToAppDataFolder,
  uploadToGoogleDrive,
} from './services/googleDriveService';
import { generateStpPolicyPdfBytes } from './services/pdfGenerator';

function isJsonApiResponse(res: Response): boolean {
  return res.ok && Boolean(res.headers.get('content-type')?.includes('application/json'));
}

const LOCAL_STORAGE_WORKSPACE_KEY = 'hk_insurehub_workspace_v3';
const LEGACY_LOCAL_STORAGE_WORKSPACE_KEY = 'hk_insurehub_workspace_v1';
const LOCAL_STORAGE_LANG_KEY = 'hk_insurehub_lang_v1';
const LOCAL_STORAGE_MICROSITES_KEY = 'hk_insurehub_microsites_v1';

const VALID_STAGES: WorkspaceSection[] = [
  'stage1',
  'stage2',
  'stage3',
  'stage4',
  'stage5',
  'stage6',
];

interface PersistedWorkspacePayload {
  schemaVersion?: number;
  leads?: ClientLead[];
  customPlans?: InsurancePlan[];
  provisions?: PolicyProvisionChunk[];
  applications?: PolicyApplicationRecord[];
  intermediaryRole?: IntermediaryRole;
  selectedLeadId?: string;
  selectedPlanId?: string;
  currency?: CurrencyCode;
  sumAssuredUsd?: number;
  paymentTermYears?: number;
  comparedPlanIds?: string[];
  clientSafeMode?: boolean;
  fulfillmentStressPercent?: number;
  adoptedImprovementIds?: string[];
  prioritizedRoadmapIds?: string[];
  whiteLabelConfig?: WhiteLabelBrandConfig;
  whatsappAuditLogs?: WhatsAppComplianceLogEntry[];
  morningBriefingDecks?: Record<string, MorningBriefingSlide[]>;
  expressMeetingMode?: boolean;
  planUrlOverrides?: Record<string, { officialUrl?: string; gn16ReportUrl?: string }>;
  inForcePolicies?: InForcePolicyRecord[];
  claimCases?: ClaimConciergeCase[];
  endorsements?: PolicyEndorsementRequest[];
  cpdEntries?: HkiaCpdCourseEntry[];
  agencyHandovers?: AgencyHandoverItem[];
}

interface PendingOverwriteAction {
  fileName: string;
  existingFileId: string;
  mimeType: string;
  content: string | Uint8Array;
  onSuccess?: (uploaded: DriveSyncedFile) => void;
}

function resolveInitialRouteFromParam(rawSection: string | null): {
  stage: WorkspaceSection;
  s1Tab: 'profile' | 'crm' | 'insights' | 'team_coaching';
  s2Tab: 'market' | 'clauses' | 'actuarial_lab';
  s3Tab: 'cart' | 'hospital';
  s4Tab: 'deck' | 'objections' | 'microsite';
  s5Tab: 'stp' | 'drive' | 'servicing' | 'compliance';
} {
  const defaults = {
    stage: 'stage1' as WorkspaceSection,
    s1Tab: 'profile' as const,
    s2Tab: 'market' as const,
    s3Tab: 'cart' as const,
    s4Tab: 'deck' as const,
    s5Tab: 'stp' as const,
  };
  if (!rawSection) return defaults;
  if (VALID_STAGES.includes(rawSection as WorkspaceSection)) {
    return { ...defaults, stage: rawSection as WorkspaceSection };
  }
  switch (rawSection) {
    case 'profile':
      return { ...defaults, stage: 'stage1', s1Tab: 'profile' };
    case 'crm':
      return { ...defaults, stage: 'stage1', s1Tab: 'crm' };
    case 'insights':
      return { ...defaults, stage: 'stage1', s1Tab: 'insights' };
    case 'team_coaching':
      return { ...defaults, stage: 'stage1', s1Tab: 'team_coaching' };
    case 'market':
      return { ...defaults, stage: 'stage2', s2Tab: 'market' };
    case 'copilot':
      return { ...defaults, stage: 'stage2', s2Tab: 'clauses' };
    case 'actuarial_lab':
      return { ...defaults, stage: 'stage2', s2Tab: 'actuarial_lab' };
    case 'calculator':
      return { ...defaults, stage: 'stage3', s3Tab: 'cart' };
    case 'intel':
      return { ...defaults, stage: 'stage3', s3Tab: 'hospital' };
    case 'morning_briefing':
      return { ...defaults, stage: 'stage4', s4Tab: 'deck' };
    case 'subagents':
      return { ...defaults, stage: 'stage4', s4Tab: 'objections' };
    case 'stp':
      return { ...defaults, stage: 'stage5', s5Tab: 'stp' };
    case 'drive':
      return { ...defaults, stage: 'stage5', s5Tab: 'drive' };
    case 'servicing':
      return { ...defaults, stage: 'stage5', s5Tab: 'servicing' };
    case 'compliance':
      return { ...defaults, stage: 'stage5', s5Tab: 'compliance' };
    case 'monetization':
    case 'roadmap':
      return { ...defaults, stage: 'stage6' };
    default:
      return defaults;
  }
}

export default function App() {
  const initialSearchParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const proposalQueryId = initialSearchParams.get('proposal') || '';

  const [lang, setLangState] = useState<AppLanguage>(() => {
    if (typeof window === 'undefined') return 'zh-HK';
    const saved = window.localStorage.getItem(LOCAL_STORAGE_LANG_KEY);
    if (saved === 'en' || saved === 'zh-HK' || saved === 'zh-CN') return saved;
    return 'zh-HK';
  });

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_STORAGE_LANG_KEY, next);
    }
  }, []);

  const t = useCallback(
    (en: string, zhHk: string, zhCn?: string) =>
      pickLangText(lang, en, zhHk, zhCn),
    [lang]
  );

  // 6-Stage Workbench Navigation + Sub-Stage Tabs
  const rawSectionParam = initialSearchParams.get('section');
  const initialRoute = useMemo(
    () => resolveInitialRouteFromParam(rawSectionParam),
    [rawSectionParam]
  );

  const [activeSection, setActiveSection] = useState<WorkspaceSection>(
    initialRoute.stage
  );
  const [stage1Tab, setStage1Tab] = useState<
    'profile' | 'crm' | 'insights' | 'team_coaching'
  >(initialRoute.s1Tab);
  const [stage2Tab, setStage2Tab] = useState<'market' | 'clauses' | 'actuarial_lab'>(
    initialRoute.s2Tab
  );
  const [stage3Tab, setStage3Tab] = useState<'cart' | 'hospital'>(
    initialRoute.s3Tab
  );
  const [stage4Tab, setStage4Tab] = useState<'deck' | 'objections' | 'microsite'>(
    initialRoute.s4Tab
  );
  const [stpSubTab, setStpSubTab] = useState<
    'stp' | 'drive' | 'servicing' | 'compliance'
  >(initialRoute.s5Tab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState<boolean>(() => {
    if (proposalQueryId || rawSectionParam) return false;
    if (initialSearchParams.get('autostart') === '1') return false;
    if (initialSearchParams.get('landing') === '0') return false;
    return true;
  });
  const [guidedCoachOpen, setGuidedCoachOpen] = useState<boolean>(false);
  const [guidedCoachChapterId, setGuidedCoachChapterId] = useState<string>('ch1');
  const [ipadClientLockOpen, setIpadClientLockOpen] = useState<boolean>(false);

  const [crmInitialModal, setCrmInitialModal] = useState<{
    type: 'fna' | 'ocr';
    leadId: string;
  } | null>(null);
  const [intelInitialTab, setIntelInitialTab] = useState<IntelTab>('hospitals');
  const [activeToolSelection, setActiveToolSelection] =
    useState<ActiveClassifiedToolSelection>(() =>
      rawSectionParam === 'roadmap'
        ? { engine: 'FN', code: 'FN-01' }
        : { engine: 'IMP', code: 'IMP-01' }
    );
  const [activePowerPackToolId, setActivePowerPackToolId] =
    useState<PowerPackToolId>('PRE_UW');
  const [stage6ForceMode, setStage6ForceMode] = useState<
    'powerpack' | 'workbench' | 'roi' | null
  >(rawSectionParam === 'roadmap' ? 'workbench' : null);
  const [morningBriefingDecks, setMorningBriefingDecks] = useState<
    Record<string, MorningBriefingSlide[]>
  >({});

  // Core Canonical Workspace State (v3)
  const [leads, setLeads] = useState<ClientLead[]>(() =>
    INITIAL_CLIENT_LEADS.map((l) => ensureLeadCartDefaults(l))
  );
  const [customPlans, setCustomPlans] = useState<InsurancePlan[]>([]);
  const [provisions, setProvisions] = useState<PolicyProvisionChunk[]>(
    INITIAL_POLICY_PROVISIONS
  );
  const [applications, setApplications] = useState<PolicyApplicationRecord[]>([]);
  const [intermediaryRole, setIntermediaryRole] = useState<IntermediaryRole>(
    IntermediaryRole.BROKER_TR
  );
  const [selectedLeadId, setSelectedLeadIdState] = useState<string>(
    INITIAL_CLIENT_LEADS[0].id
  );
  const [selectedPlanId, setSelectedPlanIdState] = useState<string>('');
  const [currency, setCurrency] = useState<CurrencyCode>('HKD');
  const [sumAssuredUsd, setSumAssuredUsd] = useState<number>(100000);
  const [paymentTermYears, setPaymentTermYears] = useState<number>(10);
  const [comparedPlanIds, setComparedPlanIds] = useState<string[]>(
    DEFAULT_THREE_COMPARE_PLAN_IDS
  );
  const [planUrlOverrides, setPlanUrlOverrides] = useState<
    Record<string, { officialUrl?: string; gn16ReportUrl?: string }>
  >({});
  const [clientSafeMode, setClientSafeMode] = useState<boolean>(false);
  const [expressMeetingMode, setExpressMeetingMode] = useState<boolean>(false);
  const [agentCompanyCode, setAgentCompanyCode] = useState<string | null>('AIA');
  const [step1ConfirmedByLead, setStep1ConfirmedByLead] = useState<Record<string, boolean>>({});
  const [step3ConfirmedByLead, setStep3ConfirmedByLead] = useState<Record<string, boolean>>({});
  const [step4ConfirmedByLead, setStep4ConfirmedByLead] = useState<Record<string, boolean>>({});
  const [posterModalOpen, setPosterModalOpen] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [promoFxModalOpen, setPromoFxModalOpen] = useState<boolean>(false);
  const [fxFeed, setFxFeed] = useState<FxRateFeedState>(DEFAULT_LIVE_FX_FEED);
  const [promoOverrides, setPromoOverrides] = useState<
    Record<string, PromoAdminOverride>
  >({});
  const [teamLibraryItems, setTeamLibraryItems] = useState<TeamLibraryItem[]>(
    INITIAL_TEAM_LIBRARY_ITEMS
  );
  const [micrositeValidityDays, setMicrositeValidityDays] = useState<7 | 14 | 30>(14);
  const [fulfillmentStressPercent, setFulfillmentStressPercent] =
    useState<number>(100);
  const [adoptedImprovementIds, setAdoptedImprovementIds] = useState<string[]>([
    'imp-agent-1',
    'imp-client-1',
  ]);
  const [prioritizedRoadmapIds, setPrioritizedRoadmapIds] = useState<string[]>([
    'roadmap-fn-01',
    'roadmap-fn-02',
  ]);
  const [whiteLabelConfig, setWhiteLabelConfig] =
    useState<WhiteLabelBrandConfig>(DEFAULT_WHITE_LABEL_CONFIG);
  const [microsites, setMicrosites] = useState<ClientMicrositeRecord[]>([]);
  const [whatsappAuditLogs, setWhatsappAuditLogs] = useState<
    WhatsAppComplianceLogEntry[]
  >([]);
  const [inForcePolicies, setInForcePolicies] = useState<InForcePolicyRecord[]>(
    INITIAL_IN_FORCE_POLICIES
  );
  const [claimCases, setClaimCases] =
    useState<ClaimConciergeCase[]>(INITIAL_CLAIM_CASES);
  const [endorsements, setEndorsements] = useState<PolicyEndorsementRequest[]>(
    INITIAL_ENDORSEMENT_REQUESTS
  );
  const [cpdEntries, setCpdEntries] =
    useState<HkiaCpdCourseEntry[]>(INITIAL_CPD_ENTRIES);
  const [agencyHandovers, setAgencyHandovers] = useState<AgencyHandoverItem[]>(
    INITIAL_AGENCY_HANDOVERS
  );
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);

  // Standalone Proposal Microsite state (when ?proposal=<id> is present)
  const [standaloneMicrosite, setStandaloneMicrosite] =
    useState<ClientMicrositeRecord | null>(null);
  const [standaloneLoading, setStandaloneLoading] = useState<boolean>(
    Boolean(proposalQueryId)
  );

  // Advisor Member Authentication & Session State
  const [activeMember, setActiveMember] = useState<MemberAccountProfile | null>(() =>
    readPersistedMemberSession()
  );
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberModalTab, setMemberModalTab] =
    useState<MemberModalInitialTab>('SIGN_IN');

  // Google OAuth & Drive state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveSyncedFile[]>([]);
  const [appDataBackupFile, setAppDataBackupFile] =
    useState<DriveSyncedFile | null>(null);

  // Confirmation modals & toast feedback
  const [pendingDeleteFile, setPendingDeleteFile] =
    useState<DriveSyncedFile | null>(null);
  const [pendingOverwrite, setPendingOverwrite] =
    useState<PendingOverwriteAction | null>(null);
  const [pendingAppDataOverwrite, setPendingAppDataOverwrite] = useState<{
    existingFileId: string;
    accessToken: string;
  } | null>(null);
  const [pendingAppDataRestore, setPendingAppDataRestore] =
    useState<DriveSyncedFile | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: 'success' | 'warning';
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback(
    (message: string, tone: 'success' | 'warning' = 'success') => {
      setToast({ message, tone });
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 4500);
    },
    []
  );

  // Verify persisted member token with backend on initial mount
  useEffect(() => {
    let cancelled = false;
    verifyServerMemberSession().then((verified) => {
      if (cancelled) return;
      if (verified) {
        setActiveMember(verified);
        setIntermediaryRole(verified.role);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenMemberModal = useCallback(
    (tab: MemberModalInitialTab = 'SIGN_IN') => {
      setMemberModalTab(tab);
      setMemberModalOpen(true);
    },
    []
  );

  const handleMemberAuthenticated = useCallback(
    (member: MemberAccountProfile, isNewRegistration: boolean) => {
      setActiveMember(member);
      setIntermediaryRole(member.role);
      showToast(
        isNewRegistration
          ? t(
              `Advisor account created: ${member.fullNameEn} (HKIA Lic ${member.iaLicenseNo}).`,
              `顧問會員註冊成功：${member.fullNameZh || member.fullNameEn}（保監牌照 ${member.iaLicenseNo}）。`
            )
          : t(
              `Welcome back, ${member.fullNameEn} (HKIA Lic ${member.iaLicenseNo}).`,
              `歡迎登入，${member.fullNameZh || member.fullNameEn}（保監牌照 ${member.iaLicenseNo}）。`
            )
      );
    },
    [showToast, t]
  );

  const handleMemberProfileUpdated = useCallback(
    (member: MemberAccountProfile) => {
      setActiveMember(member);
      setIntermediaryRole(member.role);
      showToast(
        t(
          `Updated advisor profile: ${member.fullNameEn} · ${member.iaLicenseNo}`,
          `已更新顧問帳戶資料：${member.fullNameZh || member.fullNameEn} · ${member.iaLicenseNo}`
        )
      );
    },
    [showToast, t]
  );

  const handleLogoutMember = useCallback(async () => {
    await logoutAdvisorMember();
    if (googleUser) {
      await logoutGoogle().catch(() => {});
      setGoogleUser(null);
      setDriveConnected(false);
      setAppDataBackupFile(null);
    }
    setActiveMember(null);
    showToast(
      t(
        'Signed out of your Advisor Member account.',
        '已安全登出您的顧問會員帳戶。'
      )
    );
  }, [googleUser, showToast, t]);

  const intermediary = useMemo(
    () =>
      toIntermediaryProfileFromMember(
        activeMember,
        INTERMEDIARY_PROFILES[intermediaryRole]
      ),
    [activeMember, intermediaryRole]
  );

  const advisorWorkspaceKey = useMemo(
    () =>
      activeMember?.email ||
      googleUser?.email ||
      activeMember?.iaLicenseNo ||
      intermediary.iaLicenseNo ||
      'default',
    [activeMember?.email, activeMember?.iaLicenseNo, googleUser?.email, intermediary.iaLicenseNo]
  );

  const isUserLoggedIn = Boolean(activeMember || googleUser || driveConnected);

  useEffect(() => {
    if (!isUserLoggedIn && stpSubTab === 'drive') {
      setStpSubTab('stp');
    }
  }, [isUserLoggedIn, stpSubTab]);

  const fxRateStamp = useMemo(() => formatFxRateStamp(fxFeed), [fxFeed]);

  // Global Cmd/Ctrl + K keyboard shortcut listener (#3)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const allPlans = useMemo(() => {
    const baseEnriched = applyCrawledEnrichmentToPlans(HK_MARKET_PLANS);
    const merged = [...customPlans, ...baseEnriched];
    const seen = new Set<string>();
    const deduped: InsurancePlan[] = [];
    for (const p of merged) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const resolvedUrls = resolveVerifiedPlanUrls(p, planUrlOverrides);
      deduped.push({
        ...p,
        officialUrl: resolvedUrls.officialUrl,
        gn16ReportUrl: resolvedUrls.gn16ReportUrl,
        brochurePdfUrl: resolvedUrls.brochurePdfUrl,
        standardPremiumPdfUrl: resolvedUrls.standardPremiumPdfUrl,
        promoFlyerPdfUrl: resolvedUrls.promoFlyerPdfUrl,
      });
    }
    return deduped;
  }, [customPlans, planUrlOverrides]);

  const totalInsurersCount = useMemo(() => {
    return new Set(allPlans.map((p) => p.insurerCode)).size;
  }, [allPlans]);

  const activeLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || leads[0],
    [leads, selectedLeadId]
  );

  //Synchronized Client & Plan Selection Helpers (Backed by ActiveDealCase Cart)
  const handleSelectLeadId = useCallback(
    (nextLeadId: string) => {
      setSelectedLeadIdState(nextLeadId);
      setLeads((currLeads) => {
        const target = currLeads.find((l) => l.id === nextLeadId);
        if (target) {
          const cartAnchor = target.proposalCart?.anchorPlanId || '';
          setSelectedPlanIdState(cartAnchor);
        }
        return currLeads;
      });
    },
    []
  );

  const handleSelectPlanId = useCallback(
    (nextPlanId: string) => {
      setSelectedPlanIdState(nextPlanId);
      setLeads((currLeads) =>
        currLeads.map((l) => {
          if (l.id !== selectedLeadId) return l;
          const safe = ensureLeadCartDefaults(l);
          return {
            ...safe,
            proposalCart: {
              ...safe.proposalCart!,
              anchorPlanId: nextPlanId,
            },
          };
        })
      );
    },
    [selectedLeadId]
  );

  const handleToggleComboPlan = useCallback(
    (targetPlanId: string) => {
      setLeads((currLeads) =>
        currLeads.map((l) => {
          if (l.id !== selectedLeadId) return l;
          const safe = ensureLeadCartDefaults(l);
          const anchorId =
            safe.proposalCart?.anchorPlanId || selectedPlanId || '';
          const nextCombo = toggleComboSecondaryPlan(
            safe.proposalCart?.comboPlanIds || [],
            anchorId,
            targetPlanId
          );
          return {
            ...safe,
            proposalCart: {
              ...safe.proposalCart!,
              comboPlanIds: nextCombo,
            },
          };
        })
      );
    },
    [selectedLeadId, selectedPlanId]
  );

  // Single Source of Truth Valuation Engine across Stages 01–06
  const unifiedDeal = useMemo(
    () =>
      resolveUnifiedDealCase({
        lead: activeLead,
        allPlans,
        explicitSelectedPlanId: selectedPlanId,
        applications,
      }),
    [activeLead, allPlans, selectedPlanId, applications]
  );

  const handleNavigateStage = useCallback((nextSection: WorkspaceSection) => {
    setActiveSection(nextSection);
    scrollWindowToTop();
  }, []);

  const handleToggleExpressMode = useCallback(() => {
    setExpressMeetingMode((prev) => {
      const next = !prev;
      if (next) {
        setActiveSection((curr) => {
          if (curr === 'stage2' || curr === 'stage6') return 'stage3';
          if (curr === 'stage4') return 'stage5';
          return curr;
        });
        showToast(
          t(
            'Simple 3-Step Mode ON: 01 Client Profile → 03 Riders & Premium → 05 E-Sign.',
            '已開啟「簡易 3 步模式（01 客戶資料 ➔ 03 保費配搭 ➔ 05 簽署投保）」'
          )
        );
      } else {
        showToast(
          t(
            'Full 6-Step Mode ON: All comparison, clause, presentation & calculator tools shown.',
            '已切換回「完整 6 步模式（顯示全部比較及計算工具）」'
          )
        );
      }
      return next;
    });
  }, [showToast, t]);

  // Legacy jump router mapping old module keys -> 6-stage workbench + sub-tab
  const jumpToLegacyModule = useCallback(
    (
      legacySec:
        | 'profile'
        | 'crm'
        | 'market'
        | 'copilot'
        | 'calculator'
        | 'intel'
        | 'morning_briefing'
        | 'subagents'
        | 'stp'
        | 'drive'
        | 'monetization'
    ) => {
      switch (legacySec) {
        case 'profile':
          setStage1Tab('profile');
          setActiveSection('stage1');
          break;
        case 'crm':
          setStage1Tab('crm');
          setActiveSection('stage1');
          break;
        case 'market':
          setStage2Tab('market');
          setActiveSection('stage2');
          break;
        case 'copilot':
          setStage2Tab('clauses');
          setActiveSection('stage2');
          break;
        case 'calculator':
          setStage3Tab('cart');
          setActiveSection('stage3');
          break;
        case 'intel':
          setStage3Tab('hospital');
          setActiveSection('stage3');
          break;
        case 'morning_briefing':
          setStage4Tab('deck');
          setActiveSection('stage4');
          break;
        case 'subagents':
          setStage4Tab('objections');
          setActiveSection('stage4');
          break;
        case 'stp':
          setStpSubTab('stp');
          setActiveSection('stage5');
          break;
        case 'drive':
          setStpSubTab(isUserLoggedIn ? 'drive' : 'stp');
          setActiveSection('stage5');
          break;
        case 'monetization':
          setActiveSection('stage6');
          break;
      }
      scrollWindowToTop();
    },
    [isUserLoggedIn]
  );

  // Apply persisted workspace helper with v3 migration
  const applyWorkspaceSnapshot = useCallback((data: PersistedWorkspacePayload) => {
    const resolvedLeads = migrateWorkspaceLeadsV3(
      data.leads,
      INITIAL_CLIENT_LEADS,
      data.schemaVersion
    );
    setLeads(resolvedLeads);

    if (Array.isArray(data.customPlans)) setCustomPlans(data.customPlans);
    if (Array.isArray(data.provisions) && data.provisions.length > 0) {
      setProvisions(data.provisions);
    }
    if (Array.isArray(data.applications)) setApplications(data.applications);
    if (
      data.intermediaryRole === IntermediaryRole.BROKER_TR ||
      data.intermediaryRole === IntermediaryRole.TIED_AGENT
    ) {
      setIntermediaryRole(data.intermediaryRole);
    }

    let chosenLead = resolvedLeads[0];
    if (typeof data.selectedLeadId === 'string' && data.selectedLeadId) {
      const found = resolvedLeads.find((l) => l.id === data.selectedLeadId);
      if (found) chosenLead = found;
    }
    setSelectedLeadIdState(chosenLead.id);

    if (typeof data.selectedPlanId === 'string') {
      setSelectedPlanIdState(data.selectedPlanId);
    } else if (chosenLead.proposalCart?.anchorPlanId) {
      setSelectedPlanIdState(chosenLead.proposalCart.anchorPlanId);
    }

    if (data.currency === 'USD' || data.currency === 'HKD' || data.currency === 'RMB') {
      setCurrency(data.currency);
    }
    if (typeof data.sumAssuredUsd === 'number' && data.sumAssuredUsd > 0) {
      setSumAssuredUsd(data.sumAssuredUsd);
    }
    if (typeof data.paymentTermYears === 'number' && data.paymentTermYears > 0) {
      setPaymentTermYears(data.paymentTermYears);
    }
    if (Array.isArray(data.comparedPlanIds) && data.comparedPlanIds.length > 0) {
      const validKnownIds = new Set([
        ...HK_MARKET_PLANS.map((p) => p.id),
        ...(Array.isArray(data.customPlans) ? data.customPlans.map((p) => p.id) : []),
      ]);
      const sanitized = data.comparedPlanIds
        .map((id) => (id === 'AIA_GLOBAL_POWER' ? 'AIA_GPMCP3' : id))
        .filter((id, idx, arr) => validKnownIds.has(id) && arr.indexOf(id) === idx)
        .slice(0, MAX_COMPARED_PLANS);
      const isLegacyTwoDefault =
        sanitized.length === 2 &&
        sanitized[0] === 'FWD_MAXFOCUS_SIG' &&
        sanitized[1] === 'AIA_GPMCP3';
      setComparedPlanIds(
        isLegacyTwoDefault
          ? DEFAULT_THREE_COMPARE_PLAN_IDS
          : sanitized.length > 0
          ? sanitized
          : DEFAULT_THREE_COMPARE_PLAN_IDS
      );
    }
    if (data.planUrlOverrides && typeof data.planUrlOverrides === 'object') {
      setPlanUrlOverrides(data.planUrlOverrides);
    }
    if (typeof data.clientSafeMode === 'boolean') {
      setClientSafeMode(data.clientSafeMode);
    }
    if (
      typeof data.fulfillmentStressPercent === 'number' &&
      data.fulfillmentStressPercent >= 50
    ) {
      setFulfillmentStressPercent(data.fulfillmentStressPercent);
    }
    if (Array.isArray(data.adoptedImprovementIds)) {
      setAdoptedImprovementIds(data.adoptedImprovementIds);
    }
    if (Array.isArray(data.prioritizedRoadmapIds)) {
      setPrioritizedRoadmapIds(data.prioritizedRoadmapIds);
    }
    if (data.whiteLabelConfig) {
      setWhiteLabelConfig(data.whiteLabelConfig);
    }
    if (Array.isArray(data.whatsappAuditLogs)) {
      setWhatsappAuditLogs(data.whatsappAuditLogs);
    }
    if (data.morningBriefingDecks && typeof data.morningBriefingDecks === 'object') {
      setMorningBriefingDecks(data.morningBriefingDecks);
    }
    if (typeof data.expressMeetingMode === 'boolean') {
      setExpressMeetingMode(data.expressMeetingMode);
    }
    if (Array.isArray(data.inForcePolicies) && data.inForcePolicies.length > 0) {
      setInForcePolicies(data.inForcePolicies);
    }
    if (Array.isArray(data.claimCases) && data.claimCases.length > 0) {
      setClaimCases(data.claimCases);
    }
    if (Array.isArray(data.endorsements) && data.endorsements.length > 0) {
      setEndorsements(data.endorsements);
    }
    if (Array.isArray(data.cpdEntries) && data.cpdEntries.length > 0) {
      setCpdEntries(data.cpdEntries);
    }
    if (Array.isArray(data.agencyHandovers) && data.agencyHandovers.length > 0) {
      setAgencyHandovers(data.agencyHandovers);
    }
  }, []);

  // Hydrate workspace, microsites, live FX feed, promos & team library on mount / member change
  useEffect(() => {
    let cancelled = false;
    const scopedLocalKey = `${LOCAL_STORAGE_WORKSPACE_KEY}::${advisorWorkspaceKey}`;
    const readLocalWorkspaceFallback = () => {
      if (typeof window === 'undefined') return null;
      return (
        window.localStorage.getItem(scopedLocalKey) ||
        window.localStorage.getItem(LOCAL_STORAGE_WORKSPACE_KEY) ||
        window.localStorage.getItem(LEGACY_LOCAL_STORAGE_WORKSPACE_KEY)
      );
    };
    const hydrate = async () => {
      try {
        const res = await fetch(
          `/api/workspace?advisorKey=${encodeURIComponent(advisorWorkspaceKey)}`
        );
        if (isJsonApiResponse(res)) {
          const json = await res.json();
          if (!cancelled && json?.exists && json?.data) {
            applyWorkspaceSnapshot(json.data);
          } else if (!cancelled) {
            const localRaw = readLocalWorkspaceFallback();
            if (localRaw) applyWorkspaceSnapshot(JSON.parse(localRaw));
          }
        } else if (!cancelled) {
          const localRaw = readLocalWorkspaceFallback();
          if (localRaw) applyWorkspaceSnapshot(JSON.parse(localRaw));
        }
      } catch {
        if (!cancelled) {
          try {
            const localRaw = readLocalWorkspaceFallback();
            if (localRaw) applyWorkspaceSnapshot(JSON.parse(localRaw));
          } catch {
            // ignore corrupted local cache
          }
        }
      }

      try {
        const [msRes, fxRes, prRes, tlRes, hoRes] = await Promise.all([
          fetch('/api/microsites'),
          fetch('/api/market/fx-rates'),
          fetch('/api/market/promos'),
          fetch('/api/team-library'),
          fetch('/api/agency/handovers'),
        ]);
        if (isJsonApiResponse(msRes)) {
          const msJson = await msRes.json();
          if (!cancelled && Array.isArray(msJson?.items)) {
            setMicrosites(msJson.items);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(
                LOCAL_STORAGE_MICROSITES_KEY,
                JSON.stringify(msJson.items)
              );
            }
          }
        } else if (!cancelled && typeof window !== 'undefined') {
          const cachedMs = window.localStorage.getItem(LOCAL_STORAGE_MICROSITES_KEY);
          if (cachedMs) setMicrosites(JSON.parse(cachedMs));
        }
        if (isJsonApiResponse(fxRes)) {
          const fxJson = await fxRes.json();
          if (!cancelled && fxJson?.feed) {
            setFxFeed(fxJson.feed);
          }
        }
        if (isJsonApiResponse(prRes)) {
          const prJson = await prRes.json();
          if (!cancelled && prJson?.overrides) {
            setPromoOverrides(prJson.overrides);
          }
        }
        if (isJsonApiResponse(tlRes)) {
          const tlJson = await tlRes.json();
          if (!cancelled && Array.isArray(tlJson?.items) && tlJson.items.length > 0) {
            setTeamLibraryItems(tlJson.items);
          }
        }
        if (isJsonApiResponse(hoRes)) {
          const hoJson = await hoRes.json();
          if (!cancelled && Array.isArray(hoJson?.items) && hoJson.items.length > 0) {
            setAgencyHandovers(hoJson.items);
          }
        }
      } catch {
        if (!cancelled && typeof window !== 'undefined') {
          try {
            const cachedMs = window.localStorage.getItem(LOCAL_STORAGE_MICROSITES_KEY);
            if (cachedMs) setMicrosites(JSON.parse(cachedMs));
          } catch {
            // ignore
          }
        }
      }

      if (!cancelled) setWorkspaceHydrated(true);
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [applyWorkspaceSnapshot, advisorWorkspaceKey]);

  // Load standalone proposal microsite if ?proposal=<id>
  useEffect(() => {
    if (!proposalQueryId) return;
    let cancelled = false;
    const loadStandalone = async () => {
      setStandaloneLoading(true);
      try {
        const res = await fetch(
          `/api/microsites/${encodeURIComponent(proposalQueryId)}`
        );
        if (isJsonApiResponse(res)) {
          const data = await res.json();
          if (!cancelled && data?.item) {
            setStandaloneMicrosite(data.item);
            setStandaloneLoading(false);
            return;
          }
        }
      } catch {
        // Fallback below
      }

      if (!cancelled && typeof window !== 'undefined') {
        try {
          const cachedRaw = window.localStorage.getItem(LOCAL_STORAGE_MICROSITES_KEY);
          if (cachedRaw) {
            const list: ClientMicrositeRecord[] = JSON.parse(cachedRaw);
            const found = list.find((m) => m.id === proposalQueryId);
            if (found) {
              setStandaloneMicrosite(found);
              setStandaloneLoading(false);
              return;
            }
          }
        } catch {
          // ignore
        }
      }

      if (!cancelled) {
        const fallbackProposal = createClientMicrositeProposal({
          lead: INITIAL_CLIENT_LEADS[0],
          plan: HK_MARKET_PLANS[0],
          intermediary: INTERMEDIARY_PROFILES[IntermediaryRole.BROKER_TR],
          currency: 'USD',
          sumAssuredUsd: 100000,
          paymentTermYears: 10,
          whiteLabel: DEFAULT_WHITE_LABEL_CONFIG,
        });
        setStandaloneMicrosite({ ...fallbackProposal, id: proposalQueryId });
        setStandaloneLoading(false);
      }
    };
    loadStandalone();
    return () => {
      cancelled = true;
    };
  }, [proposalQueryId]);

  const workspacePayload = useMemo<PersistedWorkspacePayload>(
    () => ({
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      leads,
      customPlans,
      provisions,
      applications,
      intermediaryRole,
      selectedLeadId,
      selectedPlanId,
      currency,
      sumAssuredUsd,
      paymentTermYears,
      comparedPlanIds,
      clientSafeMode,
      fulfillmentStressPercent,
      adoptedImprovementIds,
      prioritizedRoadmapIds,
      whiteLabelConfig,
      whatsappAuditLogs,
      morningBriefingDecks,
      expressMeetingMode,
      planUrlOverrides,
      inForcePolicies,
      claimCases,
      endorsements,
      cpdEntries,
      agencyHandovers,
    }),
    [
      leads,
      customPlans,
      provisions,
      applications,
      intermediaryRole,
      selectedLeadId,
      selectedPlanId,
      currency,
      sumAssuredUsd,
      paymentTermYears,
      comparedPlanIds,
      clientSafeMode,
      fulfillmentStressPercent,
      adoptedImprovementIds,
      prioritizedRoadmapIds,
      whiteLabelConfig,
      whatsappAuditLogs,
      morningBriefingDecks,
      expressMeetingMode,
      planUrlOverrides,
      inForcePolicies,
      claimCases,
      endorsements,
      cpdEntries,
      agencyHandovers,
    ]
  );

  // Debounced persist workspace to server + localStorage
  useEffect(() => {
    if (!workspaceHydrated) return;
    if (typeof window !== 'undefined') {
      try {
        const serialized = JSON.stringify(workspacePayload);
        window.localStorage.setItem(LOCAL_STORAGE_WORKSPACE_KEY, serialized);
        window.localStorage.setItem(
          `${LOCAL_STORAGE_WORKSPACE_KEY}::${advisorWorkspaceKey}`,
          serialized
        );
      } catch {
        // ignore quota errors
      }
    }
    const timer = window.setTimeout(() => {
      fetch(`/api/workspace?advisorKey=${encodeURIComponent(advisorWorkspaceKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workspacePayload),
      }).catch(() => {
        // Offline PWA mode relies on localStorage gracefully
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [workspaceHydrated, workspacePayload, advisorWorkspaceKey]);

  const workspaceBackupJsonString = useMemo(
    () => JSON.stringify(workspacePayload, null, 2),
    [workspacePayload]
  );

  // Initialize Firebase Google Auth & Drive File Listing
  const handleRefreshDriveFiles = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setDriveConnected(false);
      return;
    }
    setDriveBusy(true);
    setDriveError(null);
    try {
      await ensureInsureHubFolder(token);
      const [files, existingAppData] = await Promise.all([
        listInsureHubDriveFiles(token),
        findAppDataBackupFile(token).catch(() => null),
      ]);
      setDriveFiles(files);
      setAppDataBackupFile(existingAppData);
      setDriveConnected(true);
    } catch (err: any) {
      setDriveError(err?.message || 'Unable to list Google Drive files.');
    } finally {
      setDriveBusy(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, _token) => {
        setGoogleUser(user);
        setDriveConnected(true);
        if (user.email) {
          setActiveMember((prev) => {
            if (prev && prev.authProvider === 'MEMBER_CREDENTIALS') return prev;
            const ssoProfile = buildGoogleSsoMemberProfile({
              uid: user.uid,
              email: user.email!,
              displayName: user.displayName,
              fallbackRole: intermediaryRole,
              existingMember: prev,
            });
            persistMemberSession(ssoProfile);
            return ssoProfile;
          });
        }
        handleRefreshDriveFiles();
      },
      () => {
        setGoogleUser(null);
        setDriveConnected(false);
        setAppDataBackupFile(null);
        setActiveMember((prev) => {
          if (prev?.authProvider === 'GOOGLE_SSO') {
            persistMemberSession(null);
            return null;
          }
          return prev;
        });
      }
    );
    return () => unsubscribe();
  }, [handleRefreshDriveFiles, intermediaryRole]);

  const handleSignInGoogle = async () => {
    setIsSigningIn(true);
    setDriveError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setDriveConnected(true);
        await handleRefreshDriveFiles();
        showToast(
          t(
            'Connected to Google Drive ("HK InsureHub Pro" folder ready).',
            '已連接 Google Drive（「HK InsureHub Pro」專用資料夾已就緒）。'
          )
        );
      }
    } catch (err: any) {
      setDriveError(err?.message || 'Google Sign-In failed or cancelled.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAuthAndCloudBackup = async ({
    user,
    accessToken,
  }: {
    user: User;
    accessToken: string;
  }) => {
    setGoogleUser(user);
    setDriveConnected(true);
    setDriveBusy(true);
    setDriveError(null);
    try {
      const existingAppData = await findAppDataBackupFile(accessToken);
      if (existingAppData) {
        setAppDataBackupFile(existingAppData);
        setPendingAppDataOverwrite({
          existingFileId: existingAppData.id,
          accessToken,
        });
        setDriveBusy(false);
        return;
      }
      const created = await saveWorkspaceToAppDataFolder({
        accessToken,
        jsonContent: workspaceBackupJsonString,
      });
      setAppDataBackupFile(created);
      await handleRefreshDriveFiles();
      showToast(
        t(
          `Backed up advisor workspace to Google Drive Cloud Vault (${APPDATA_WORKSPACE_BACKUP_FILENAME}).`,
          `已成功將完整顧問工作區備份至 Google Drive 專屬雲端空間（${APPDATA_WORKSPACE_BACKUP_FILENAME}）。`
        )
      );
    } catch (err: any) {
      const message =
        err?.message ||
        t('Cloud backup failed.', 'Google Drive 雲端備份失敗。');
      setDriveError(message);
      showToast(message, 'warning');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleConfirmAppDataOverwrite = async () => {
    if (!pendingAppDataOverwrite) return;
    setDriveBusy(true);
    setDriveError(null);
    try {
      const updated = await saveWorkspaceToAppDataFolder({
        accessToken: pendingAppDataOverwrite.accessToken,
        jsonContent: workspaceBackupJsonString,
        existingFileId: pendingAppDataOverwrite.existingFileId,
      });
      setAppDataBackupFile(updated);
      setPendingAppDataOverwrite(null);
      await handleRefreshDriveFiles();
      showToast(
        t(
          'Updated your private Google Drive Cloud Backup.',
          '已成功更新您的 Google Drive 專屬雲端備份。'
        )
      );
    } catch (err: any) {
      const message =
        err?.message || t('Failed to update cloud backup.', '更新雲端備份失敗。');
      setDriveError(message);
      showToast(message, 'warning');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleRequestRestoreAppData = async () => {
    if (!appDataBackupFile) return;
    setPendingAppDataRestore(appDataBackupFile);
  };

  const handleConfirmRestoreAppData = async () => {
    if (!pendingAppDataRestore) return;
    const token = await getAccessToken();
    if (!token) return;
    setDriveBusy(true);
    setDriveError(null);
    try {
      const restoredData = await restoreWorkspaceFromAppDataFolder(
        token,
        pendingAppDataRestore.id
      );
      if (restoredData && typeof restoredData === 'object') {
        applyWorkspaceSnapshot(restoredData as Partial<PersistedWorkspacePayload>);
        setPendingAppDataRestore(null);
        showToast(
          t(
            'Restored advisor CRM & compliance workspace from Google Drive Cloud Backup.',
            '已成功從 Google Drive 雲端備份還原顧問客戶管線及合規工作區。'
          )
        );
      }
    } catch (err: any) {
      const message =
        err?.message || t('Failed to restore cloud backup.', '還原雲端備份失敗。');
      setDriveError(message);
      showToast(message, 'warning');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleSignOutGoogle = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setDriveConnected(false);
    setDriveFiles([]);
    setAppDataBackupFile(null);
  };

  const uploadWithOverwritePrompt = async (params: {
    fileName: string;
    mimeType: string;
    content: string | Uint8Array;
    onSuccess?: (uploaded: DriveSyncedFile) => void;
  }) => {
    const token = await getAccessToken();
    if (!token) {
      setDriveError(
        t(
          'Please connect Google Drive first in Stage 05B (Cloud Sync tab).',
          '請先於第 05B 步（Google Drive 雲端同步分頁）連接帳戶。'
        )
      );
      setStpSubTab('drive');
      setActiveSection('stage5');
      return;
    }
    setDriveBusy(true);
    setDriveError(null);
    try {
      const folderId = await ensureInsureHubFolder(token);
      const existing = await findExistingDriveFileByName(
        token,
        params.fileName,
        folderId
      );
      if (existing) {
        setPendingOverwrite({
          fileName: params.fileName,
          existingFileId: existing.id,
          mimeType: params.mimeType,
          content: params.content,
          onSuccess: params.onSuccess,
        });
        setDriveBusy(false);
        return;
      }
      const uploaded = await uploadToGoogleDrive({
        accessToken: token,
        fileName: params.fileName,
        mimeType: params.mimeType,
        content: params.content,
        folderId,
      });
      await handleRefreshDriveFiles();
      params.onSuccess?.(uploaded);
      showToast(
        t(
          `Saved "${params.fileName}" to Google Drive.`,
          `已成功備份「${params.fileName}」至 Google Drive。`
        )
      );
    } catch (err: any) {
      setDriveError(err?.message || 'Google Drive upload failed.');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleConfirmOverwrite = async () => {
    if (!pendingOverwrite) return;
    const token = await getAccessToken();
    if (!token) return;
    setDriveBusy(true);
    try {
      const folderId = await ensureInsureHubFolder(token);
      const uploaded = await uploadToGoogleDrive({
        accessToken: token,
        fileName: pendingOverwrite.fileName,
        mimeType: pendingOverwrite.mimeType,
        content: pendingOverwrite.content,
        folderId,
        existingFileId: pendingOverwrite.existingFileId,
      });
      await handleRefreshDriveFiles();
      pendingOverwrite.onSuccess?.(uploaded);
      showToast(
        t(
          `Updated "${pendingOverwrite.fileName}" in Google Drive.`,
          `已更新 Google Drive 檔案「${pendingOverwrite.fileName}」。`
        )
      );
      setPendingOverwrite(null);
    } catch (err: any) {
      setDriveError(err?.message || 'Failed to overwrite file in Drive.');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleConfirmDeleteDriveFile = async () => {
    if (!pendingDeleteFile) return;
    const token = await getAccessToken();
    if (!token) return;
    setDriveBusy(true);
    try {
      await deleteInsureHubDriveFile(token, pendingDeleteFile.id);
      await handleRefreshDriveFiles();
      showToast(
        t(
          `Deleted "${pendingDeleteFile.name}" from Google Drive.`,
          `已從 Google Drive 刪除「${pendingDeleteFile.name}」。`
        )
      );
      setPendingDeleteFile(null);
    } catch (err: any) {
      setDriveError(err?.message || 'Failed to delete Drive file.');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleSaveProposalPdfToDrive = async (
    fileName: string,
    pdfBytes: Uint8Array
  ) => {
    await uploadWithOverwritePrompt({
      fileName,
      mimeType: 'application/pdf',
      content: pdfBytes,
    });
  };

  const handleSavePolicyPdfToDrive = async (
    appRecord: PolicyApplicationRecord,
    pdfBytes: Uint8Array
  ) => {
    const fileName = `${appRecord.referenceNo}_${appRecord.clientNameEn.replace(/\s+/g, '_')}.pdf`;
    await uploadWithOverwritePrompt({
      fileName,
      mimeType: 'application/pdf',
      content: pdfBytes,
      onSuccess: (uploaded) => {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === appRecord.id
              ? {
                  ...a,
                  driveFileId: uploaded.id,
                  driveWebViewLink: uploaded.webViewLink,
                }
              : a
          )
        );
      },
    });
  };

  const handleSaveMasterGuideToDrive = async () => {
    await uploadWithOverwritePrompt({
      fileName: MASTER_GUIDE_FILENAME,
      mimeType: 'text/markdown',
      content: MASTER_GUIDE_MARKDOWN,
    });
  };

  const handleSaveWorkspaceBackupToDrive = async () => {
    await uploadWithOverwritePrompt({
      fileName: 'HK_InsureHub_Pro_Workspace_Backup.json',
      mimeType: 'application/json',
      content: workspaceBackupJsonString,
    });
  };

  const handleSaveBundleToDrive = async () => {
    await uploadWithOverwritePrompt({
      fileName: MASTER_GUIDE_FILENAME,
      mimeType: 'text/markdown',
      content: MASTER_GUIDE_MARKDOWN,
    });
    await uploadWithOverwritePrompt({
      fileName: 'HK_InsureHub_Pro_Workspace_Backup.json',
      mimeType: 'application/json',
      content: workspaceBackupJsonString,
    });
    if (applications.length > 0) {
      const latestApp = applications[0];
      const matchedLead =
        leads.find((l) => l.id === latestApp.leadId) || activeLead;
      const matchedPlan =
        allPlans.find((p) => p.id === latestApp.planId) || allPlans[0];
      if (matchedLead && matchedPlan) {
        const quote = calculateCompliantQuote({
          plan: matchedPlan,
          age: matchedLead.age,
          isSmoker: matchedLead.isSmoker,
          currency: latestApp.currency,
          sumAssuredInSelectedCurrency: latestApp.sumAssured,
          paymentTermYears: latestApp.paymentTermYears,
        });
        const compliance = evaluateHkiaCompliance({
          intermediary,
          lead: matchedLead,
          plan: matchedPlan,
          quote,
        });
        const pdfBytes = await generateStpPolicyPdfBytes({
          referenceNo: latestApp.referenceNo,
          intermediary,
          lead: matchedLead,
          plan: matchedPlan,
          quote,
          compliance,
          signatureDataUrl: latestApp.signatureDataUrl,
        });
        await handleSavePolicyPdfToDrive(latestApp, pdfBytes);
      }
    }
  };

  // CRM & Plan Handlers
  const handleAddLead = (newLead: ClientLead) => {
    const normalized = ensureLeadCartDefaults(newLead);
    setLeads((prev) => [normalized, ...prev]);
    setSelectedLeadIdState(normalized.id);
    setSelectedPlanIdState(normalized.proposalCart?.anchorPlanId || '');
  };

  const handleUpdateLead = (
    leadId: string,
    updater: (prev: ClientLead) => ClientLead
  ) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? ensureLeadCartDefaults(updater(lead)) : lead
      )
    );
  };

  const handleDeleteLead = (leadId: string) => {
    setLeads((prev) => {
      if (prev.length <= 1) return prev;
      const remaining = prev.filter((l) => l.id !== leadId);
      if (selectedLeadId === leadId && remaining.length > 0) {
        setSelectedLeadIdState(remaining[0].id);
        setSelectedPlanIdState(remaining[0].proposalCart?.anchorPlanId || '');
      }
      return remaining;
    });
    showToast(
      t('Deleted saved client from workspace.', '已從工作區移除該建檔客戶。')
    );
  };

  const handleVerifyIamSmartLead = (leadId: string) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              kycCheck: {
                ...l.kycCheck,
                hkidVerified: true,
                hkidDocNumber:
                  l.kycCheck.hkidDocNumber || l.hkidNumber || 'A839201(6)',
              },
            }
          : l
      )
    );
    showToast(
      t(
        'iAM Smart HKSAR e-KYC handshake verified & logged.',
        '已透過香港政府「智方便 (iAM Smart)」完成實名核身並寫入合規紀錄。'
      )
    );
  };

  const handleToggleComparePlan = (planId: string) => {
    setComparedPlanIds((prev) => toggleThreePlanComparison(prev, planId));
  };

  const handleSetCompareSlotPlan = (slotIndex: 0 | 1 | 2, planId: string) => {
    setComparedPlanIds((prev) => setComparisonSlotPlan(prev, slotIndex, planId));
  };

  const handleApplyVerifiedPlanUrls = (
    planId: string,
    officialUrl: string,
    gn16ReportUrl?: string
  ) => {
    setPlanUrlOverrides((prev) => ({
      ...prev,
      [planId]: {
        officialUrl,
        gn16ReportUrl: gn16ReportUrl || undefined,
      },
    }));
    showToast(
      t(
        'Applied AI-verified official product & GN16 links to workspace.',
        '已套用子代理核實之官方「產品專頁」與「GN16」有效網址並同步儲存。'
      )
    );
  };

  const handleApplyBatchVerifiedPlanUrls = (
    batch: Record<string, { officialUrl?: string; gn16ReportUrl?: string }>
  ) => {
    setPlanUrlOverrides((prev) => ({
      ...prev,
      ...batch,
    }));
  };

  const handleImportDiscoveredPlan = (plan: InsurancePlan) => {
    setCustomPlans((prev) => [plan, ...prev.filter((p) => p.id !== plan.id)]);
    handleSelectPlanId(plan.id);
    setComparedPlanIds((prev) =>
      prev.includes(plan.id) ? prev : [plan.id, ...prev.slice(0, 2)]
    );
    showToast(
      t(
        `Added ${plan.insurerNameEn} — ${plan.nameEn} to your active catalog.`,
        `已將 ${plan.insurerNameZh} — ${plan.nameZh} 加入您的全市場產品庫。`
      )
    );
  };

  const handleImportBatchDiscoveredPlans = (plansToAdd: InsurancePlan[]) => {
    if (plansToAdd.length === 0) return;
    setCustomPlans((prev) => {
      const nextMap = new Map(prev.map((p) => [p.id, p]));
      for (const p of plansToAdd) {
        nextMap.set(p.id, p);
      }
      return Array.from(nextMap.values());
    });
    handleSelectPlanId(plansToAdd[0].id);
    showToast(
      t(
        `Imported ${plansToAdd.length} audited HK plans into your live catalog!`,
        `已一鍵入庫 ${plansToAdd.length} 款通過 GL28 及連結審核之香港保險計劃！`
      )
    );
  };

  const handleOpenPowerPackTool = (toolId: PowerPackToolId, planId?: string) => {
    if (planId) {
      handleSelectPlanId(planId);
    }
    setActivePowerPackToolId(toolId);
    setStage6ForceMode('powerpack');
    handleNavigateStage('stage6');
  };

  const handleUpsertNormalizedPlans = (plansToAdd: InsurancePlan[]) => {
    setCustomPlans((prev) => {
      const nextMap = new Map(prev.map((p) => [p.id, p]));
      for (const p of plansToAdd) {
        nextMap.set(p.id, p);
      }
      return Array.from(nextMap.values());
    });
    showToast(
      t(
        `Standardized and imported ${plansToAdd.length} plan(s) into CRM catalog.`,
        `已標準化並匯入 ${plansToAdd.length} 項保險計劃至顧問工作區。`
      )
    );
  };

  const handleRecordApplication = (
    appRecord: PolicyApplicationRecord,
    updatedStage: LeadStage
  ) => {
    setApplications((prev) => [appRecord, ...prev]);
    const matchedLead = leads.find((l) => l.id === appRecord.leadId);
    const matchedPlan = allPlans.find((p) => p.id === appRecord.planId);
    const nextDueDate = new Date();
    nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
    const graceEndDate = new Date(nextDueDate.getTime() + 30 * 86400000);
    const newInForce: InForcePolicyRecord = {
      id: `ifp-${Date.now().toString(36)}`,
      policyId: appRecord.referenceNo,
      leadId: appRecord.leadId,
      clientNameEn: appRecord.clientNameEn,
      clientNameZh:
        appRecord.clientNameZh ||
        matchedLead?.fullNameZh ||
        appRecord.clientNameEn,
      insurerCode: appRecord.insurerCode || matchedPlan?.insurerCode || 'AIA',
      planNameZh: appRecord.planNameZh || matchedPlan?.nameZh || appRecord.planNameEn,
      planNameEn: appRecord.planNameEn,
      currency: appRecord.currency,
      annualPremium: appRecord.annualPremium,
      nextDueDateIso: nextDueDate.toISOString().slice(0, 10),
      graceEndsIso: graceEndDate.toISOString().slice(0, 10),
      status: 'ACTIVE',
      fxRateLocked: fxFeed.rateLocked,
      splitEligible: matchedPlan?.category === PlanCategory.PARTICIPATING_SAVINGS,
    };
    setInForcePolicies((prev) => [
      newInForce,
      ...prev.filter((p) => p.policyId !== newInForce.policyId),
    ]);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === appRecord.leadId
          ? {
              ...l,
              stage: updatedStage,
              lastContactIso: new Date().toISOString(),
            }
          : l
      )
    );
    showToast(
      t(
        `STP application ${appRecord.referenceNo} recorded & stage updated.`,
        `電子投保申請 ${appRecord.referenceNo} 已記錄，客戶狀態同步更新。`
      )
    );
  };

  // Microsite handlers (Stage 04C & IMP-01)
  const handleCreateMicrosite = async (record: ClientMicrositeRecord) => {
    setMicrosites((prev) => {
      const updated = [record, ...prev.filter((m) => m.id !== record.id)].slice(
        0,
        30
      );
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          LOCAL_STORAGE_MICROSITES_KEY,
          JSON.stringify(updated)
        );
      }
      return updated;
    });

    try {
      const res = await fetch('/api/microsites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record }),
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.items)) setMicrosites(json.items);
      }
    } catch {
      // Offline mode safely uses localStorage copy
    }

    showToast(
      t(
        `Interactive client microsite ${record.id} created.`,
        `客戶專屬互動建議書微網頁 ${record.id} 已建立。`
      )
    );
  };

  const handleLogMicrositeRead = async (
    id: string,
    inspectedPolicyYear: number
  ) => {
    const localReceipt = {
      id: `rcpt-${Date.now().toString(36)}`,
      openedAtIso: new Date().toISOString(),
      viewerLabel: 'Client Mobile Safari',
      inspectedPolicyYear,
      dwellSeconds: 42,
    };

    setMicrosites((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              readReceipts: [localReceipt, ...(m.readReceipts || [])].slice(
                0,
                20
              ),
            }
          : m
      )
    );

    if (standaloneMicrosite && standaloneMicrosite.id === id) {
      setStandaloneMicrosite((prev) =>
        prev
          ? {
              ...prev,
              readReceipts: [localReceipt, ...(prev.readReceipts || [])].slice(
                0,
                20
              ),
            }
          : prev
      );
    }

    try {
      await fetch(`/api/microsites/${encodeURIComponent(id)}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspectedPolicyYear,
          dwellSeconds: 42,
          viewerLabel: 'Client Mobile Safari',
        }),
      });
    } catch {
      // ignore offline
    }
  };

  const handleSubmitMicrositeFeedback = async (
    id: string,
    feedback: {
      preferredPaymentMode: 'ANNUAL' | 'MONTHLY';
      preferredSigningSlot: string;
      clientQuestion: string;
    }
  ) => {
    const savedFeedback = {
      ...feedback,
      submittedAtIso: new Date().toISOString(),
    };
    setMicrosites((prev) => {
      const exists = prev.some((m) => m.id === id);
      const baseList = exists ? prev : [activeStage4Microsite, ...prev];
      const updated = baseList.map((m) =>
        m.id === id ? { ...m, clientFeedback: savedFeedback } : m
      );
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            LOCAL_STORAGE_MICROSITES_KEY,
            JSON.stringify(updated)
          );
        } catch {
          // ignore
        }
      }
      return updated;
    });
    if (standaloneMicrosite && standaloneMicrosite.id === id) {
      setStandaloneMicrosite((prev) =>
        prev ? { ...prev, clientFeedback: savedFeedback } : prev
      );
    }
    try {
      await fetch(`/api/microsites/${encodeURIComponent(id)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback),
      });
    } catch {
      // offline fallback
    }
    showToast(
      t(
        'Client interactive feedback saved & synced to Advisor CRM!',
        '客戶互動意向回覆已即時同步至顧問 CRM 工作區！'
      )
    );
  };

  const handleSyncAgencyHandovers = async (nextItems: AgencyHandoverItem[]) => {
    setAgencyHandovers(nextItems);
    try {
      await fetch('/api/agency/handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: nextItems }),
      });
    } catch {
      // offline fallback
    }
  };

  const handleSaveSnapshotToActiveLead = (snapshot: SavedToolSnapshot) => {
    handleUpdateLead(activeLead.id, (prev) => ({
      ...prev,
      savedSnapshots: [
        snapshot,
        ...(prev.savedSnapshots || []).filter((s) => s.id !== snapshot.id),
      ].slice(0, 20),
    }));
  };

  const handleAppendWhatsappAuditLog = (entry: WhatsAppComplianceLogEntry) => {
    setWhatsappAuditLogs((prev) => [entry, ...prev].slice(0, 50));
  };

  // FX Rate-Lock, Promo Governance & Agency Team Library Handlers (#18, #19, #20)
  const handleSaveFxFeed = async (nextFeed: FxRateFeedState) => {
    setFxFeed(nextFeed);
    setLeads((curr) =>
      curr.map((l) => {
        if (l.id !== selectedLeadId) return l;
        const safe = ensureLeadCartDefaults(l);
        return {
          ...safe,
          proposalCart: {
            ...safe.proposalCart!,
            fxRateHkdToRmb: Number(nextFeed.hkdToRmb.toFixed(3)),
          },
        };
      })
    );
    try {
      await fetch('/api/market/fx-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feed: nextFeed }),
      });
    } catch {
      // offline fallback
    }
    showToast(
      t(
        `Applied FX rate stamp: ${formatFxRateStamp(nextFeed)}`,
        `已套用並同步全站匯率簽章：${formatFxRateStamp(nextFeed)}`
      )
    );
  };

  const handleSavePromoOverrides = async (
    nextOverrides: Record<string, PromoAdminOverride>
  ) => {
    setPromoOverrides(nextOverrides);
    try {
      await fetch('/api/market/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: nextOverrides }),
      });
    } catch {
      // offline fallback
    }
    showToast(
      t(
        'Saved quarterly insurer promo & countdown rules.',
        '已更新保司季度首年回贈與倒數自動下架規則。'
      )
    );
  };

  const handleCloneTeamLibraryItem = async (item: TeamLibraryItem) => {
    setTeamLibraryItems((prev) =>
      prev.map((x) =>
        x.id === item.id ? { ...x, cloneCount: x.cloneCount + 1 } : x
      )
    );
    try {
      await fetch(`/api/team-library/${encodeURIComponent(item.id)}/clone`, {
        method: 'POST',
      });
    } catch {
      // offline fallback
    }
    showToast(
      t(
        `Applied team template from ${item.authorName}!`,
        `已成功套用「${item.authorName}」團隊王牌範本！`
      )
    );
  };

  const handlePublishTeamLibraryItem = async (
    partial: Omit<TeamLibraryItem, 'id' | 'cloneCount' | 'createdAtIso'>
  ) => {
    const newItem: TeamLibraryItem = {
      ...partial,
      id: `team-${Date.now().toString(36)}`,
      cloneCount: 1,
      createdAtIso: new Date().toISOString(),
    };
    setTeamLibraryItems((prev) => [newItem, ...prev]);
    try {
      await fetch('/api/team-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: newItem }),
      });
    } catch {
      // offline fallback
    }
    showToast(
      t(
        'Published template to Agency Team Library!',
        '已成功發佈至團隊共享知識庫！'
      )
    );
  };

  // Sub-agent & cross-module routing
  const handleExecuteWorkflowAction = (
    action: AgentWorkflowActionStep['targetAction'],
    leadId: string,
    planId: string
  ) => {
    handleSelectLeadId(leadId);
    if (planId) handleSelectPlanId(planId);
    if (action === 'OPEN_FNA') {
      setCrmInitialModal({ type: 'fna', leadId });
      setStage1Tab('crm');
      handleNavigateStage('stage1');
    } else if (action === 'OPEN_OCR') {
      setCrmInitialModal({ type: 'ocr', leadId });
      setStage1Tab('crm');
      handleNavigateStage('stage1');
    } else if (action === 'LAUNCH_STP') {
      setStpSubTab('stp');
      handleNavigateStage('stage5');
    } else if (action === 'ENABLE_SAFE_MODE') {
      setClientSafeMode(true);
      setStage2Tab('market');
      handleNavigateStage('stage2');
      showToast(
        t('Enabled Client Safe Mode & opened Market Comparator.', '已開啟見客匿名鎖並跳轉至全市場比較。')
      );
    } else if (action === 'OPEN_HOSPITAL_LOG') {
      setIntelInitialTab('hospitals');
      setStage3Tab('hospital');
      handleNavigateStage('stage3');
    }
  };

  const handleOpenLiveUpgrade = (code: TwentyUpgradeCode) => {
    setActiveToolSelection({ engine: 'IMP', code });
    setStage6ForceMode('workbench');
    handleNavigateStage('stage6');
  };

  const handleLaunchLiveImprovement = (
    _improvementId: string,
    moduleTarget: string
  ) => {
    const m = moduleTarget.toLowerCase();
    if (m.includes('01')) jumpToLegacyModule('market');
    else if (m.includes('02')) jumpToLegacyModule('crm');
    else if (m.includes('03')) jumpToLegacyModule('copilot');
    else if (m.includes('04')) jumpToLegacyModule('stp');
    else if (m.includes('05')) jumpToLegacyModule('drive');
    else if (m.includes('06')) jumpToLegacyModule('intel');
    else if (m.includes('08')) {
      setActiveToolSelection({ engine: 'FN', code: 'FN-01' });
      setStage6ForceMode('workbench');
      setActiveSection('stage6');
    } else {
      setActiveToolSelection({ engine: 'IMP', code: 'IMP-01' });
      setStage6ForceMode('workbench');
      setActiveSection('stage6');
    }
  };

  const activeContextHint: NeedContextHint = useMemo(() => {
    if (activeSection === 'stage2' && stage2Tab === 'clauses') return 'CLAUSE_AUDIT';
    if (activeSection === 'stage3' && stage3Tab === 'hospital') return 'MEDICAL_LOG';
    if (activeSection === 'stage6' && activeToolSelection.engine === 'FN') {
      const fnCode: AdvisoryFunctionCode = activeToolSelection.code;
      if (fnCode === 'FN-01') return 'PROTECTION_GAP';
      if (fnCode === 'FN-02') return 'TAX_TRIO';
      if (fnCode === 'FN-03') return 'SAVINGS_LEGACY';
      if (fnCode === 'FN-04') return 'MCV_CROSS_BORDER';
      if (fnCode === 'FN-05') return 'PREMIUM_FINANCING';
      if (fnCode === 'FN-06') return 'MICRO_PROPOSAL';
      if (fnCode === 'FN-07') return 'PRE_UNDERWRITING';
      if (fnCode === 'FN-08') return 'PROCEDURE_SHORTFALL';
    }
    return 'GENERAL';
  }, [activeSection, stage2Tab, stage3Tab, activeToolSelection]);

  // Live preview microsite for Stage 04C (with 7d/14d/30d expiry & FX stamp)
  const activeStage4Microsite = useMemo(() => {
    const planForMicrosite = unifiedDeal.anchorPlan || allPlans[0];
    const existingForLead = microsites.find(
      (m) =>
        (m.leadId === activeLead.id ||
          m.clientNameZh === activeLead.fullNameZh ||
          m.clientNameEn === activeLead.fullNameEn) &&
        m.planId === planForMicrosite?.id &&
        (m.validityDays ?? 14) === micrositeValidityDays
    );
    if (existingForLead) {
      return {
        ...existingForLead,
        leadId: activeLead.id,
        fxRateStamp,
      };
    }
    return createClientMicrositeProposal({
      lead: activeLead,
      plan: planForMicrosite,
      intermediary,
      currency,
      sumAssuredUsd,
      paymentTermYears: unifiedDeal.cart.paymentTermYears,
      whiteLabel: whiteLabelConfig,
      validityDays: micrositeValidityDays,
      fxRateStamp,
    });
  }, [
    microsites,
    activeLead,
    unifiedDeal.anchorPlan,
    unifiedDeal.cart.paymentTermYears,
    allPlans,
    intermediary,
    currency,
    sumAssuredUsd,
    whiteLabelConfig,
    micrositeValidityDays,
    fxRateStamp,
  ]);

  const stage4ShareUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://hkinsurehub.pro';
    return `${origin}/?proposal=${encodeURIComponent(activeStage4Microsite.id)}`;
  }, [activeStage4Microsite.id]);

  // Auto-persist Stage 04C / Poster proposal record so scanning QR immediately opens the live record
  useEffect(() => {
    if (!workspaceHydrated) return;
    if (!(activeSection === 'stage4' && stage4Tab === 'microsite') && !posterModalOpen) {
      return;
    }
    const alreadySaved = microsites.some((m) => m.id === activeStage4Microsite.id);
    if (alreadySaved) return;

    setMicrosites((prev) => {
      const updated = [
        activeStage4Microsite,
        ...prev.filter((m) => m.id !== activeStage4Microsite.id),
      ].slice(0, 30);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            LOCAL_STORAGE_MICROSITES_KEY,
            JSON.stringify(updated)
          );
        } catch {
          // ignore
        }
      }
      return updated;
    });

    fetch('/api/microsites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record: activeStage4Microsite }),
    }).catch(() => {
      // Offline mode safely uses localStorage copy
    });
  }, [workspaceHydrated, activeSection, stage4Tab, posterModalOpen, activeStage4Microsite, microsites]);

  const contextValue = useMemo(
    () => ({ lang, setLang, t }),
    [lang, setLang, t]
  );

  // Standalone ?proposal=<id> Microsite Mode
  if (proposalQueryId) {
    const standaloneUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/?proposal=${encodeURIComponent(proposalQueryId)}`
        : `https://hkinsurehub.pro/?proposal=${encodeURIComponent(proposalQueryId)}`;
    return (
      <LanguageContext.Provider value={contextValue}>
        {standaloneLoading || !standaloneMicrosite ? (
          <div className="flex min-h-screen items-center justify-center bg-[#060D18] p-6">
            <div className="vh-harbour-panel rounded-xl px-6 py-5 text-sm font-medium text-[#F3D37A] shadow-sm">
              {t(
                'Loading Interactive Client Proposal Microsite...',
                '正在載入客戶專屬互動保險建議書微網頁...'
              )}
            </div>
          </div>
        ) : (
          <div className="min-h-screen bg-[#060D18] sm:bg-slate-100">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5 sm:px-8 sm:pt-5">
              <a
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F3D37A] sm:text-slate-700 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {t(
                    'Open Full HK InsureHub Pro Advisor Workbench',
                    '返回 HK InsureHub Pro 顧問工作區'
                  )}
                </span>
              </a>
            </div>
            <ClientMicrositeView
              record={standaloneMicrosite}
              proposalUrl={standaloneUrl}
              standaloneMode
              onLogReadReceipt={(yr) =>
                handleLogMicrositeRead(standaloneMicrosite.id, yr)
              }
              onSubmitClientFeedback={(fb) =>
                handleSubmitMicrositeFeedback(standaloneMicrosite.id, fb)
              }
            />
          </div>
        )}
      </LanguageContext.Provider>
    );
  }

  if (showLandingPage) {
    const uniqueInsurersCount = new Set(allPlans.map((p) => p.insurerCode)).size;
    return (
      <LanguageContext.Provider value={contextValue}>
        {toast && (
          <div
            role="status"
            data-testid="floating-viewport-toast"
            className={`fixed bottom-5 right-5 z-50 flex max-w-md items-start justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg ${
              toast.tone === 'warning'
                ? 'border-amber-300 bg-amber-50 text-amber-950'
                : 'border-emerald-300 bg-slate-900 text-white'
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="rounded p-1 opacity-75 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <ConfirmModal
          open={Boolean(pendingAppDataOverwrite)}
          title={t(
            'Overwrite Existing Cloud Backup?',
            '確認更新 Google Drive 現有雲端備份？'
          )}
          description={t(
            'A previous advisor workspace backup already exists in your private Google Drive appDataFolder. Replace it with your current workspace?',
            '您的 Google Drive 專屬空間（appDataFolder）中已有一份雲端備份。是否確認以目前最新的顧問工作區覆蓋更新？'
          )}
          affectedItemName={APPDATA_WORKSPACE_BACKUP_FILENAME}
          confirmLabel={t('Update Cloud Backup', '確認覆蓋備份')}
          busy={driveBusy}
          onConfirm={handleConfirmAppDataOverwrite}
          onCancel={() => setPendingAppDataOverwrite(null)}
        />
        <MemberAuthModal
          open={memberModalOpen}
          initialTab={memberModalTab}
          activeMember={activeMember}
          googleUser={googleUser}
          cloudBackupBusy={driveBusy || isSigningIn}
          onClose={() => setMemberModalOpen(false)}
          onAuthenticated={handleMemberAuthenticated}
          onProfileUpdated={handleMemberProfileUpdated}
          onLogout={handleLogoutMember}
          onGoogleAuthAndBackup={handleAuthAndCloudBackup}
          onGoogleAuthError={(msg) => showToast(msg, 'warning')}
        />
        <ExecutiveLandingPage3D
          plansCount={allPlans.length}
          insurersCount={uniqueInsurersCount}
          leadsCount={leads.length}
          inForceCount={inForcePolicies.length}
          activeMember={activeMember}
          onOpenMemberAuth={handleOpenMemberModal}
          googleUser={googleUser}
          cloudBackupBusy={driveBusy || isSigningIn}
          onGoogleAuthAndBackup={handleAuthAndCloudBackup}
          onGoogleAuthError={(msg) => showToast(msg, 'warning')}
          onEnterWorkbench={(targetStage, targetSubTab, targetLeadId, guidedChapterId) => {
            if (targetLeadId) handleSelectLeadId(targetLeadId);
            if (targetStage) setActiveSection(targetStage);
            if (targetSubTab === 'crm') setStage1Tab('crm');
            else if (targetSubTab === 'profile' || targetStage === 'stage1') setStage1Tab('profile');
            if (targetSubTab === 'market') setStage2Tab('market');
            if (targetSubTab === 'clauses') setStage2Tab('clauses');
            if (targetSubTab === 'actuarial_lab') setStage2Tab('actuarial_lab');
            if (targetSubTab === 'cart') setStage3Tab('cart');
            if (targetSubTab === 'hospital') setStage3Tab('hospital');
            if (targetSubTab === 'deck') setStage4Tab('deck');
            if (targetSubTab === 'microsite') setStage4Tab('microsite');
            if (targetSubTab === 'stp') setStpSubTab('stp');
            if (targetSubTab === 'servicing') setStpSubTab('servicing');
            if (targetSubTab === 'compliance') setStpSubTab('compliance');
            if (guidedChapterId) {
              setGuidedCoachChapterId(guidedChapterId);
              setGuidedCoachOpen(true);
            }
            setShowLandingPage(false);
            scrollWindowToTop();
          }}
        />
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      <div className="flex min-h-screen bg-[#f4f6f9] text-slate-900">
        <SidebarNav
          activeSection={activeSection}
          onSelectSection={handleNavigateStage}
          intermediary={intermediary}
          activeMember={activeMember}
          onOpenMemberAuth={handleOpenMemberModal}
          onChangeRole={(nextRole) => {
            setIntermediaryRole(nextRole);
            if (activeMember) {
              const updatedMember: MemberAccountProfile = {
                ...activeMember,
                role: nextRole,
              };
              setActiveMember(updatedMember);
              persistMemberSession(updatedMember);
            }
            showToast(
              nextRole === IntermediaryRole.TIED_AGENT
                ? t(
                    'Switched to Tied Agent (AIA Principal) — STP locked to AIA.',
                    '已切換為專屬代理人（AIA 委任）— 電子投保僅限友邦產品。'
                  )
                : t(
                    'Switched to Licensed Broker TR — Whole-market STP enabled.',
                    '已切換為持牌保險經紀代表 — 全市場產品均可直通投保。'
                  )
            );
          }}
          plansCount={allPlans.length}
          leadsCount={leads.length}
          policiesCount={applications.length}
          driveFilesCount={isUserLoggedIn ? driveFiles.length : 0}
          activeClientName={activeLead.fullNameZh}
          bundledAnnualHkd={unifiedDeal.bundleSim.netAnnualPremiumHkd}
          expressMeetingMode={expressMeetingMode}
          onToggleExpressMode={handleToggleExpressMode}
          onOpenMobilePoster={() => setPosterModalOpen(true)}
          onOpenGuidedCoach={() => setGuidedCoachOpen(true)}
          onOpenLandingPage={() => {
            setShowLandingPage(true);
            scrollWindowToTop();
          }}
          agentCompanyCode={agentCompanyCode}
          onChangeAgentCompanyCode={(nextCode) => {
            setAgentCompanyCode(nextCode);
            const opt = resolveAgentCompanyOption(nextCode);
            showToast(
              opt
                ? t(
                    `Primary insurer set to ${opt.nameEn} — own company products will appear first.`,
                    `已設定所屬公司為「${opt.nameZh}」— 產品庫將優先顯示本司計劃，再推薦其他公司參考。`
                  )
                : t(
                    'Switched to Broker All-Market ordering.',
                    '已切換為全市場獨立經紀排序模式。'
                  )
            );
          }}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Compact Mobile Header (<= 52px) — Victoria Harbour Private Wealth */}
          <header className="vh-harbour-surface sticky top-0 z-30 flex items-center justify-between border-b border-[#D4AF37]/30 px-3.5 py-2 text-white lg:hidden overflow-hidden">
            <svg
              aria-hidden="true"
              viewBox="0 0 220 44"
              className="pointer-events-none absolute right-20 bottom-0 h-10 w-44 opacity-20"
              fill="none"
            >
              <path
                d="M110 44V18H126V44M134 44V8L150 2V44M134 8L150 26M150 8L134 26M158 44V14H176V44M184 44V6H204V44"
                stroke="#D4AF37"
                strokeWidth="1.2"
              />
            </svg>
            <div className="relative z-10 flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D4AF37]/40 bg-[#0B172A] text-[#F3D37A] hover:bg-[#102038] shrink-0"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold tracking-tight text-white">
                  HK InsureHub <span className="text-[#F3D37A]">Pro</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setClientSafeMode((prev) => !prev)}
              className={`relative z-10 rounded-lg border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                clientSafeMode
                  ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#F3D37A]'
                  : 'border-slate-700 bg-[#0B172A] text-slate-200'
              }`}
            >
              {clientSafeMode
                ? t('Safe Mode On', '見客保密中')
                : t('Client Safe', '見客模式')}
            </button>
          </header>

          <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
            {/* Fixed Viewport Toast Notification — Always Visible at Any Scroll Depth */}
            {toast && (
              <div
                role="status"
                data-testid="floating-viewport-toast"
                className={`fixed bottom-5 right-5 z-50 flex max-w-md items-start justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg ${
                  toast.tone === 'warning'
                    ? 'border-amber-300 bg-amber-50 text-amber-950'
                    : 'border-emerald-300 bg-slate-900 text-white'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {toast.tone === 'warning' ? (
                    <ShieldAlert
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                      aria-hidden="true"
                    />
                  )}
                  <span className="leading-relaxed">{toast.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  aria-label="Dismiss notification"
                  className="rounded p-1 opacity-75 hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Universal 6-Stage Deal Stepper + Live Proposal Cart Bar */}
            {(() => {
              const currentStepGate = evaluateGuidedStepGate({
                activeSection,
                expressMeetingMode,
                activeLead,
                anchorPlan: unifiedDeal.anchorPlan,
                step1Confirmed: Boolean(step1ConfirmedByLead[activeLead.id]),
                step3Confirmed: Boolean(step3ConfirmedByLead[activeLead.id]),
                step4Confirmed: Boolean(step4ConfirmedByLead[activeLead.id]),
                step5Signed: applications.some((app) => app.leadId === activeLead.id),
              });
              return (
                <ActivePlanContextBar
                  activeSection={activeSection}
                  onSelectSection={handleNavigateStage}
                  leads={leads}
                  selectedLeadId={selectedLeadId}
                  onSelectLeadId={handleSelectLeadId}
                  plans={allPlans}
                  selectedPlanId={selectedPlanId}
                  onSelectPlanId={handleSelectPlanId}
                  intermediary={intermediary}
                  contextHint={activeContextHint}
                  unifiedDeal={unifiedDeal}
                  expressMeetingMode={expressMeetingMode}
                  onToggleExpressMode={handleToggleExpressMode}
                  onOpenMobilePoster={() => setPosterModalOpen(true)}
                  onOpenClientLockModal={() => setIpadClientLockOpen(true)}
                  onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                  onOpenPromoFxConsole={() => setPromoFxModalOpen(true)}
                  fxRateLocked={fxFeed.rateLocked}
                  cloudSyncLabel={isUserLoggedIn ? `已登入 · ${advisorWorkspaceKey}` : undefined}
                  agentCompanyCode={agentCompanyCode}
                  stepGate={currentStepGate}
                  onBrowseAllMarketPlans={() => {
                    setStage2Tab('market');
                    handleNavigateStage('stage2');
                  }}
                  onNotify={(msg) => showToast(msg)}
                />
              );
            })()}

            {/* ============================================================== */}
            {/* STAGE 01: CLIENT PIPELINE, KYC/FNA, INSIGHTS & MDRT COACHING    */}
            {/* ============================================================== */}
            {activeSection === 'stage1' && (
              <div className="space-y-5">
                <div
                  data-testid="stage1-subtabs"
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2.5"
                >
                  <span className="text-xs font-semibold text-slate-600">
                    {t(
                      'Stage 01 · Client Profile, Lead List, Funnel Insights & Team Progress',
                      '第 01 步 · 客戶資料、跟進名單、轉化數據分析與團隊業績'
                    )}
                  </span>
                  <div
                    role="tablist"
                    aria-label="Stage 01 sub-views"
                    className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1"
                  >
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage1-tab-profile"
                      aria-selected={stage1Tab === 'profile'}
                      onClick={() => setStage1Tab('profile')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stage1Tab === 'profile'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t('1A. Client Profile & Coverage Gaps', '1A. 客戶資料與保障缺口')}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage1-tab-crm"
                      aria-selected={stage1Tab === 'crm'}
                      onClick={() => setStage1Tab('crm')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stage1Tab === 'crm'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t(
                        `1B. Client List & ID Scan (${leads.length})`,
                        `1B. 客戶名單與證件掃描 (${leads.length})`
                      )}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage1-tab-insights"
                      aria-selected={stage1Tab === 'insights'}
                      onClick={() => setStage1Tab('insights')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stage1Tab === 'insights'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t('1C. Client Insights', '1C. 轉化數據分析 (Client Insights)')}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage1-tab-team-coaching"
                      aria-selected={stage1Tab === 'team_coaching'}
                      onClick={() => setStage1Tab('team_coaching')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stage1Tab === 'team_coaching'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t('1D. Team MDRT Progress', '1D. 團隊業績進度')}
                    </button>
                  </div>
                </div>

                {stage1Tab === 'profile' ? (
                  <ClientProfileGapView
                    leads={leads}
                    initialPresets={INITIAL_CLIENT_LEADS}
                    selectedLeadId={selectedLeadId}
                    onSelectLeadId={handleSelectLeadId}
                    onUpdateLead={handleUpdateLead}
                    onAddLead={handleAddLead}
                    onOpenClientEditor={() => setStage1Tab('crm')}
                    onJumpToSection={(sec) => jumpToLegacyModule(sec)}
                    plans={allPlans}
                    selectedPlanId={selectedPlanId}
                    onSelectPlanId={handleSelectPlanId}
                    unifiedDeal={unifiedDeal}
                    intermediary={intermediary}
                    expressMeetingMode={expressMeetingMode}
                    onDeleteSnapshot={(snapshotId) => {
                      handleUpdateLead(activeLead.id, (prev) => ({
                        ...prev,
                        savedSnapshots: (prev.savedSnapshots || []).filter(
                          (s) => s.id !== snapshotId
                        ),
                      }));
                      showToast(t('Removed saved snapshot.', '已移除該專項精算快照。'));
                    }}
                    onOpenPowerPackTool={(toolId) => handleOpenPowerPackTool(toolId)}
                    step1Confirmed={Boolean(step1ConfirmedByLead[activeLead.id])}
                    onConfirmStep1={() => {
                      setStep1ConfirmedByLead((prev) => ({
                        ...prev,
                        [activeLead.id]: true,
                      }));
                      showToast(
                        t(
                          'Step 01 confirmed — "Next Step: Select Plans" button is now unlocked.',
                          '第 01 步客戶資料已確認 —「下一步：挑選計劃」按鈕已解鎖。'
                        )
                      );
                    }}
                    stepGate={evaluateGuidedStepGate({
                      activeSection: 'stage1',
                      expressMeetingMode,
                      activeLead,
                      anchorPlan: unifiedDeal.anchorPlan,
                      step1Confirmed: Boolean(step1ConfirmedByLead[activeLead.id]),
                      step3Confirmed: Boolean(step3ConfirmedByLead[activeLead.id]),
                      step4Confirmed: Boolean(step4ConfirmedByLead[activeLead.id]),
                      step5Signed: applications.some((app) => app.leadId === activeLead.id),
                    })}
                    onGoNextStage={(nextSec) => handleNavigateStage(nextSec)}
                    onNotify={(msg) => showToast(msg)}
                  />
                ) : stage1Tab === 'crm' ? (
                  <LeadCrmView
                    leads={leads}
                    selectedLeadId={selectedLeadId}
                    onSelectLeadId={handleSelectLeadId}
                    onAddLead={handleAddLead}
                    onUpdateLead={handleUpdateLead}
                    onDeleteLead={handleDeleteLead}
                    onLaunchStpForLead={(leadId) => {
                      handleSelectLeadId(leadId);
                      setStpSubTab('stp');
                      handleNavigateStage('stage5');
                    }}
                    initialOpenModal={crmInitialModal}
                    onClearInitialModal={() => setCrmInitialModal(null)}
                    intermediaryLicenseNo={intermediary.iaLicenseNo}
                    onOpenLiveUpgrade={handleOpenLiveUpgrade}
                    onAppendWhatsappAuditLog={handleAppendWhatsappAuditLog}
                    microsites={microsites}
                    applications={applications}
                    inForcePolicies={inForcePolicies}
                  />
                ) : stage1Tab === 'insights' ? (
                  <ClientInsightsView
                    leads={leads}
                    applications={applications}
                    inForcePolicies={inForcePolicies}
                    usdToHkd={fxFeed.usdToHkd}
                    hkdToRmb={fxFeed.hkdToRmb}
                    onSelectLeadAndOpenCrm={(leadId) => {
                      handleSelectLeadId(leadId);
                      setStage1Tab('crm');
                    }}
                    onOpenCrmList={() => setStage1Tab('crm')}
                  />
                ) : (
                  <AgencyLeaderCoachingView
                    intermediary={intermediary}
                    leads={leads}
                    applications={applications}
                    micrositeReceiptsCount={microsites.reduce(
                      (acc, m) => acc + (m.readReceipts?.length || 0),
                      0
                    )}
                    teamLibraryItems={teamLibraryItems}
                    onPublishScript={(script) =>
                      handlePublishTeamLibraryItem({
                        kind: 'OBJECTION_SCRIPT',
                        titleZh: script.titleZh,
                        titleEn: script.titleZh,
                        summaryZh: script.objectionReplyZh,
                        summaryEn: script.objectionReplyZh,
                        authorName: `${intermediary.nameZh} (${intermediary.firmName})`,
                        authorLicense: intermediary.iaLicenseNo,
                        tags: ['MDRT 督導話術', '廣東話實戰'],
                        objectionPromptZh: script.objectionPromptZh,
                        objectionReplyZh: script.objectionReplyZh,
                        objectionReplyEn: script.objectionReplyZh,
                      })
                    }
                    onCloneScript={(itemId) => {
                      const found = teamLibraryItems.find((i) => i.id === itemId);
                      if (found) handleCloneTeamLibraryItem(found);
                    }}
                    onNotify={(msg) => showToast(msg)}
                  />
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* STAGE 02: WHOLE-MARKET COMPARATOR & 5-AXIS CLAUSE AI           */}
            {/* ============================================================== */}
            {activeSection === 'stage2' && (
              <div className="space-y-5">
                <div
                  data-testid="stage2-subtabs"
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2.5"
                >
                  <span className="text-xs font-semibold text-slate-600">
                    {t(
                      'Stage 02 · Product Comparison, Policy Clauses & Retirement Simulations',
                      '第 02 步 · 跨公司產品比較、保單條款查詢與退休提領計算'
                    )}
                  </span>
                  <div
                    role="tablist"
                    aria-label="Stage 02 sub-views"
                    className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1"
                  >
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage2-tab-market"
                      aria-selected={stage2Tab === 'market'}
                      onClick={() => setStage2Tab('market')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stage2Tab === 'market'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t(
                        `2A. Product Comparison (${allPlans.length} Plans)`,
                        `2A. 跨公司產品比較 (${allPlans.length} 款)`
                      )}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage2-tab-clauses"
                      aria-selected={stage2Tab === 'clauses'}
                      onClick={() => setStage2Tab('clauses')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stage2Tab === 'clauses'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t(
                        '2B. Policy Clause Lookup',
                        '2B. 保單條款比較與查詢'
                      )}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage2-tab-actuarial-lab"
                      aria-selected={stage2Tab === 'actuarial_lab'}
                      onClick={() => setStage2Tab('actuarial_lab')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stage2Tab === 'actuarial_lab'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t(
                        '2C. Retirement Withdrawal & Premium Financing',
                        '2C. 退休提領、保費融資與傳承'
                      )}
                    </button>
                  </div>
                </div>

                {stage2Tab === 'market' ? (
                  <MarketPlansView
                    plans={allPlans}
                    intermediary={intermediary}
                    leads={leads}
                    selectedLeadId={selectedLeadId}
                    onSelectLeadId={handleSelectLeadId}
                    selectedPlanId={selectedPlanId}
                    onSelectPlanId={handleSelectPlanId}
                    onJumpToPlanModule={(sec) => jumpToLegacyModule(sec)}
                    currency={currency}
                    onChangeCurrency={setCurrency}
                    sumAssuredUsd={sumAssuredUsd}
                    onChangeSumAssuredUsd={setSumAssuredUsd}
                    paymentTermYears={paymentTermYears}
                    onChangePaymentTermYears={setPaymentTermYears}
                    comparedPlanIds={comparedPlanIds}
                    onToggleComparePlan={handleToggleComparePlan}
                    onSetCompareSlotPlan={handleSetCompareSlotPlan}
                    onApplyVerifiedPlanUrls={handleApplyVerifiedPlanUrls}
                    onLaunchStpForPlan={(planId) => {
                      handleSelectPlanId(planId);
                      setStpSubTab('stp');
                      handleNavigateStage('stage5');
                    }}
                    onSaveProposalPdfToDrive={handleSaveProposalPdfToDrive}
                    driveConnected={driveConnected}
                    canShowDrive={isUserLoggedIn}
                    clientSafeMode={clientSafeMode}
                    onToggleClientSafeMode={() => setClientSafeMode((p) => !p)}
                    onImportDiscoveredPlan={handleImportDiscoveredPlan}
                    customPlans={customPlans}
                    onUpsertNormalizedPlans={handleUpsertNormalizedPlans}
                    fulfillmentStressPercent={fulfillmentStressPercent}
                    onChangeFulfillmentStressPercent={setFulfillmentStressPercent}
                    onOpenFeatureRoadmap={() => {
                      setActiveToolSelection({ engine: 'FN', code: 'FN-01' });
                      handleNavigateStage('stage6');
                    }}
                    whiteLabelConfig={whiteLabelConfig}
                    onOpenLiveUpgrade={handleOpenLiveUpgrade}
                    comboPlanIds={unifiedDeal.cart.comboPlanIds || []}
                    onToggleComboPlan={handleToggleComboPlan}
                    expressMeetingMode={expressMeetingMode}
                    promoOverrides={promoOverrides}
                    applications={applications}
                    onOpenPromoFxConsole={() => setPromoFxModalOpen(true)}
                    fxRateStamp={fxRateStamp}
                    onJumpToClientProfile={() => {
                      setStage1Tab('profile');
                      handleNavigateStage('stage1');
                    }}
                    planUrlOverrides={planUrlOverrides}
                    onApplyBatchVerifiedPlanUrls={handleApplyBatchVerifiedPlanUrls}
                    onImportBatchDiscoveredPlans={handleImportBatchDiscoveredPlans}
                    onSelectPlanAndOpenPowerPack={(planId, toolId) =>
                      handleOpenPowerPackTool(toolId || 'PRE_UW', planId)
                    }
                    agentCompanyCode={agentCompanyCode}
                    onChangeAgentCompanyCode={(nextCode) => setAgentCompanyCode(nextCode)}
                    stepGate={evaluateGuidedStepGate({
                      activeSection: 'stage2',
                      expressMeetingMode,
                      activeLead,
                      anchorPlan: unifiedDeal.anchorPlan,
                      step1Confirmed: Boolean(step1ConfirmedByLead[activeLead.id]),
                      step3Confirmed: Boolean(step3ConfirmedByLead[activeLead.id]),
                      step4Confirmed: Boolean(step4ConfirmedByLead[activeLead.id]),
                      step5Signed: applications.some((app) => app.leadId === activeLead.id),
                    })}
                    onGoNextStage={(nextSec) => handleNavigateStage(nextSec)}
                    onNotify={(msg) => showToast(msg)}
                  />
                ) : stage2Tab === 'clauses' ? (
                  <PolicyCopilotView
                    provisions={provisions}
                    onAddProvision={(chunk) => {
                      setProvisions((prev) => [chunk, ...prev]);
                      showToast(
                        t(
                          `Indexed new clause "${chunk.clauseRef}" into RAG corpus.`,
                          `已將新保單條款「${chunk.clauseRef}」加入條款比對資料庫。`
                        )
                      );
                    }}
                    plans={allPlans}
                    selectedPlanId={selectedPlanId}
                    onSelectPlanId={handleSelectPlanId}
                    activeLead={activeLead}
                    intermediary={intermediary}
                    onNotify={(msg) => showToast(msg)}
                  />
                ) : (
                  <AdvancedActuarialLabPanel
                    activeLead={activeLead}
                    anchorPlan={unifiedDeal.anchorPlan}
                    defaultCurrency={currency}
                    onUpdateLead={handleUpdateLead}
                    onSaveSnapshotToCase={handleSaveSnapshotToActiveLead}
                    onNotify={(msg) => showToast(msg)}
                  />
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* STAGE 03: DUAL-FX RIDER CART & PRIVATE HOSPITAL LOG            */}
            {/* ============================================================== */}
            {activeSection === 'stage3' && (
              <div className="space-y-5">
                <div
                  data-testid="stage3-subtabs"
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2.5"
                >
                  <span className="text-xs font-semibold text-slate-600">
                    {t(
                      'Stage 03 · Medical Riders, Claim Simulation & Private Hospital Fees',
                      '第 03 步 · 醫療附約配搭、理賠預估與私家醫院收費參考'
                    )}
                  </span>
                  <div
                    role="tablist"
                    aria-label="Stage 03 sub-views"
                    className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1"
                  >
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage3-tab-cart"
                      aria-selected={stage3Tab === 'cart'}
                      onClick={() => setStage3Tab('cart')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stage3Tab === 'cart'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t(
                        '3A. Riders & Claim Simulation',
                        '3A. 保費配搭與理賠預估'
                      )}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage3-tab-hospital"
                      aria-selected={stage3Tab === 'hospital'}
                      onClick={() => setStage3Tab('hospital')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stage3Tab === 'hospital'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t(
                        '3B. Private Hospital Cashless & Surgery Fees',
                        '3B. 私家醫院免找數與手術費'
                      )}
                    </button>
                  </div>
                </div>

                {stage3Tab === 'cart' ? (
                  <DualCurrencySimulatorView
                    leads={leads}
                    selectedLeadId={selectedLeadId}
                    onSelectLeadId={handleSelectLeadId}
                    onUpdateLead={handleUpdateLead}
                    plans={allPlans}
                    selectedPlanId={selectedPlanId}
                    onSelectPlanId={handleSelectPlanId}
                    intermediary={intermediary}
                    paymentTermYears={paymentTermYears}
                    onChangePaymentTermYears={setPaymentTermYears}
                    unifiedDeal={unifiedDeal}
                    onLaunchStp={() => {
                      const targetPlan = unifiedDeal.anchorPlan || allPlans[0];
                      if (targetPlan && targetPlan.currencies.includes('HKD')) {
                        setCurrency('HKD');
                      }
                      setStpSubTab('stp');
                      handleNavigateStage('stage5');
                    }}
                    onJumpToSection={(sec) => jumpToLegacyModule(sec)}
                    onOpenPosterModal={() => setPosterModalOpen(true)}
                    fxRateStamp={fxRateStamp}
                    onOpenPromoFxConsole={() => setPromoFxModalOpen(true)}
                    expressMeetingMode={expressMeetingMode}
                    onToggleComboPlan={handleToggleComboPlan}
                    step3Confirmed={Boolean(step3ConfirmedByLead[activeLead.id])}
                    onConfirmStep3={() => {
                      setStep3ConfirmedByLead((prev) => ({
                        ...prev,
                        [activeLead.id]: true,
                      }));
                      showToast(
                        t(
                          'Step 03 bundle & claim simulation confirmed — Next Step unlocked.',
                          '第 03 步保費配搭與理賠預估已確認 —「下一步」按鈕已解鎖。'
                        )
                      );
                    }}
                    stepGate={evaluateGuidedStepGate({
                      activeSection: 'stage3',
                      expressMeetingMode,
                      activeLead,
                      anchorPlan: unifiedDeal.anchorPlan,
                      step1Confirmed: Boolean(step1ConfirmedByLead[activeLead.id]),
                      step3Confirmed: Boolean(step3ConfirmedByLead[activeLead.id]),
                      step4Confirmed: Boolean(step4ConfirmedByLead[activeLead.id]),
                      step5Signed: applications.some((app) => app.leadId === activeLead.id),
                    })}
                    onGoNextStage={(nextSec) => handleNavigateStage(nextSec)}
                    onNotify={(msg) => showToast(msg)}
                  />
                ) : (
                  <MarketIntelView
                    clientSafeMode={clientSafeMode}
                    onToggleClientSafeMode={() => setClientSafeMode((p) => !p)}
                    totalCatalogPlansCount={allPlans.length}
                    plans={allPlans}
                    activeLead={activeLead}
                    selectedPlanId={selectedPlanId}
                    onSelectPlanId={handleSelectPlanId}
                    comparedPlanIds={comparedPlanIds}
                    onToggleComparePlan={handleToggleComparePlan}
                    onSignupPlanInStp={(planId) => {
                      handleSelectPlanId(planId);
                      setStpSubTab('stp');
                      handleNavigateStage('stage5');
                    }}
                    initialTab={intelInitialTab}
                    onNotify={(msg) => showToast(msg)}
                  />
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* STAGE 04: SVG PITCH DECK, OBJECTION STUDIO & CLIENT MICROSITE  */}
            {/* ============================================================== */}
            {activeSection === 'stage4' && (
              <div className="space-y-5">
                <div
                  data-testid="stage4-subtabs"
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2.5"
                >
                  <span className="text-xs font-semibold text-slate-600">
                    {t(
                      'Stage 04 · Proposal Slides, Client Q&A & Mobile Share Link',
                      '第 04 步 · 建議書簡報、常見問題話術與手機版建議書連結'
                    )}
                  </span>
                  <div
                    role="tablist"
                    aria-label="Stage 04 sub-views"
                    className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1"
                  >
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage4-tab-deck"
                      aria-selected={stage4Tab === 'deck'}
                      onClick={() => setStage4Tab('deck')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stage4Tab === 'deck'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t('4A. 5-Slide Proposal Deck', '4A. 5 頁建議書簡報')}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage4-tab-objections"
                      aria-selected={stage4Tab === 'objections'}
                      onClick={() => setStage4Tab('objections')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stage4Tab === 'objections'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t(
                        '4B. Client Q&A Scripts',
                        '4B. 客戶常見問題應對'
                      )}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage4-tab-microsite"
                      aria-selected={stage4Tab === 'microsite'}
                      onClick={() => setStage4Tab('microsite')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stage4Tab === 'microsite'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t('4C. Mobile Proposal Link (QR)', '4C. 手機版建議書 (QR)')}
                    </button>
                  </div>
                </div>

                {stage4Tab === 'deck' && (
                  <MorningPresentationView
                    leads={leads}
                    selectedLeadId={selectedLeadId}
                    onSelectLeadId={handleSelectLeadId}
                    plans={allPlans}
                    selectedPlanId={selectedPlanId}
                    onSelectPlanId={handleSelectPlanId}
                    intermediary={intermediary}
                    customDecksByLeadId={morningBriefingDecks}
                    unifiedDeal={unifiedDeal}
                    whiteLabelConfig={whiteLabelConfig}
                    teamLibraryItems={teamLibraryItems}
                    onCloneTeamItem={handleCloneTeamLibraryItem}
                    onPublishTeamDeck={(titleZh, summaryZh) =>
                      handlePublishTeamLibraryItem({
                        kind: 'CASE_DECK',
                        titleZh,
                        titleEn: titleZh,
                        summaryZh,
                        summaryEn: summaryZh,
                        authorName: `${intermediary.nameZh} (${intermediary.firmName})`,
                        authorLicense: intermediary.iaLicenseNo,
                        tags: ['早會實戰簡報', activeLead.residency],
                      })
                    }
                    onUpdateDeckForLead={(leadId, slides) =>
                      setMorningBriefingDecks((prev) => ({
                        ...prev,
                        [leadId]: slides,
                      }))
                    }
                    onResetDeckForLead={(leadId) => {
                      setMorningBriefingDecks((prev) => {
                        const next = { ...prev };
                        delete next[leadId];
                        return next;
                      });
                      showToast(
                        t(
                          'Synced 5-slide executive case deck with latest client & cart metrics.',
                          '已依最新客戶檔案、六軸雷達與附約保費同步重產 5 頁簡報！'
                        )
                      );
                    }}
                    onNotify={(msg, tone) => showToast(msg, tone)}
                  />
                )}

                {stage4Tab === 'objections' && (
                  <SubAgentsStudioView
                    leads={leads}
                    plans={allPlans}
                    intermediary={intermediary}
                    selectedLeadId={selectedLeadId}
                    onSelectLeadId={handleSelectLeadId}
                    selectedPlanId={selectedPlanId}
                    onSelectPlanId={handleSelectPlanId}
                    adoptedImprovementIds={adoptedImprovementIds}
                    onToggleAdoptImprovement={(impId) =>
                      setAdoptedImprovementIds((prev) =>
                        prev.includes(impId)
                          ? prev.filter((id) => id !== impId)
                          : [...prev, impId]
                      )
                    }
                    onExecuteWorkflowAction={handleExecuteWorkflowAction}
                    onLaunchLiveImprovement={handleLaunchLiveImprovement}
                    teamLibraryItems={teamLibraryItems}
                    onCloneTeamItem={handleCloneTeamLibraryItem}
                    onPublishTeamScript={(script) =>
                      handlePublishTeamLibraryItem({
                        kind: 'OBJECTION_SCRIPT',
                        titleZh: script.titleZh,
                        titleEn: script.titleZh,
                        summaryZh: script.summaryZh,
                        summaryEn: script.summaryZh,
                        authorName: `${intermediary.nameZh} (${intermediary.firmName})`,
                        authorLicense: intermediary.iaLicenseNo,
                        tags: ['個人化拆彈', activeLead.residency],
                        objectionPromptZh: script.objectionPromptZh,
                        objectionReplyZh: script.objectionReplyZh,
                        objectionReplyEn: script.objectionReplyZh,
                      })
                    }
                    onNotify={(msg) => showToast(msg)}
                  />
                )}

                {stage4Tab === 'microsite' && (
                  <div className="space-y-4">
                    {/* Stage 04C Scannable QR Code Generator & Proposal Microsite Publisher Card */}
                    <section
                      data-testid="stage4c-qr-generator-card"
                      className="vh-harbour-panel relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 420 120"
                        className="pointer-events-none absolute right-0 bottom-0 h-28 w-80 opacity-20"
                        fill="none"
                      >
                        <path
                          d="M190 120V56H216V120M230 120V26L258 10V120M230 26L258 72M258 26L230 72M230 72L258 120M258 72L230 120M274 120V42H304V120M318 120V16H352V120M366 120V60H396V120"
                          stroke="#D4AF37"
                          strokeWidth="1.5"
                        />
                      </svg>

                      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2.5 max-w-2xl">
                          <div className="inline-flex items-center gap-1.5 rounded-md border border-[#D4AF37]/40 bg-[#060D18]/80 px-2.5 py-1 font-mono text-[11px] font-bold text-[#F3D37A]">
                            <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {t(
                                'STAGE 04C · SCANNABLE PROPOSAL QR GENERATOR',
                                '04C · 客戶手機掃碼即讀建議書 QR 生成器'
                              )}
                            </span>
                          </div>
                          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                            {t(
                              `Interactive Client Microsite (${activeLead.fullNameEn}) — Scan from Screen or Print`,
                              `客戶專屬互動建議書微網（${activeLead.fullNameZh}）— 支援螢幕或列印紙本直接掃碼`
                            )}
                          </h2>
                          <p className="text-xs leading-relaxed text-slate-300">
                            {t(
                              'Encodes the published proposal link directly into an ISO/IEC 18004 QR code so clients can scan off your iPad/laptop screen or printed summary sheet to explore policy years on mobile.',
                              '已將此發佈建議書專屬連結編碼為標準高容錯 QR Code，客戶可用手機相機直接掃描您的電腦／iPad 螢幕或列印建議書，即時於手機全屏滑動檢視歷年現金價值並回傳已閱紀錄。'
                            )}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/80 bg-[#060D18]/90 px-3 py-2 font-mono text-[11px] text-[#F3D37A]">
                            <span className="truncate" data-testid="stage4c-published-url">
                              {stage4ShareUrl}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Clock className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
                              <span className="font-sans text-[11px] text-slate-300">
                                {t('Expiry:', '有效期限：')}
                              </span>
                              {([7, 14, 30] as const).map((days) => (
                                <button
                                  key={days}
                                  type="button"
                                  data-testid={`stage4c-expiry-${days}d-btn`}
                                  onClick={() => setMicrositeValidityDays(days)}
                                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                    micrositeValidityDays === days
                                      ? 'bg-[#F3D37A] text-[#060D18]'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  {days}
                                  {t('d', '日')}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              data-testid="stage4c-publish-copy-btn"
                              onClick={async () => {
                                await handleCreateMicrosite(activeStage4Microsite);
                                await copyTextSafe(stage4ShareUrl);
                                showToast(
                                  t(
                                    `Published & copied proposal link: ${stage4ShareUrl}`,
                                    `已發佈並複製建議書專屬連結：${stage4ShareUrl}`
                                  )
                                );
                              }}
                              className="vh-gold-cta inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap"
                            >
                              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{t('Publish & Copy Link', '發佈並複製建議書連結')}</span>
                            </button>

                            <ShareProposalActionButton
                              testId="stage4c-native-share-btn"
                              variant="teal"
                              shareInput={{
                                clientNameZh: activeLead.fullNameZh,
                                clientNameEn: activeLead.fullNameEn,
                                planNameZh:
                                  (unifiedDeal.anchorPlan || allPlans[0]).nameZh,
                                planNameEn:
                                  (unifiedDeal.anchorPlan || allPlans[0]).nameEn,
                                insurerNameZh:
                                  (unifiedDeal.anchorPlan || allPlans[0]).insurerNameZh,
                                insurerCode:
                                  (unifiedDeal.anchorPlan || allPlans[0]).insurerCode,
                                annualPremiumDisplay: `HK$ ${unifiedDeal.bundleSim.netAnnualPremiumHkd.toLocaleString()}`,
                                proposalUrl: stage4ShareUrl,
                                advisorNameZh: intermediary.nameZh,
                                advisorLicenseNo: intermediary.iaLicenseNo,
                                whatsappPhone: activeLead.whatsappPhone,
                              }}
                              onBeforeShare={async () => {
                                await handleCreateMicrosite(activeStage4Microsite);
                              }}
                              onNotify={(msg) => showToast(msg)}
                            />

                            <button
                              type="button"
                              data-testid="stage4c-download-qr-png-btn"
                              onClick={async () => {
                                await handleCreateMicrosite(activeStage4Microsite);
                                const qrPng = await generateScannableQrPngDataUrl(stage4ShareUrl, {
                                  width: 600,
                                });
                                const a = document.createElement('a');
                                a.href = qrPng;
                                a.download = `Proposal_QR_${activeStage4Microsite.id}.png`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                showToast(
                                  t(
                                    'Downloaded 600×600 print-ready QR code PNG!',
                                    '已下載 600×600 列印級高清建議書 QR Code 圖檔 (PNG)！'
                                  )
                                );
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/40 bg-[#060D18] px-3.5 py-2 text-xs font-semibold text-[#F3D37A] hover:bg-[#102038] whitespace-nowrap"
                            >
                              <Download className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{t('Download Print QR (PNG)', '下載列印用 QR 圖檔')}</span>
                            </button>

                            <a
                              href={stage4ShareUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap"
                            >
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{t('Open Mobile URL', '開啟獨立微網視窗')}</span>
                            </a>
                          </div>
                        </div>

                        {/* Live Scannable QR Code Card */}
                        <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-[#D4AF37]/50 bg-[#060D18]/90 p-3.5 text-center shadow-inner">
                          <ScannableProposalQrSvg
                            url={stage4ShareUrl}
                            sizePx={136}
                            ariaLabel={`Scannable QR code for proposal ${activeStage4Microsite.id}`}
                          />
                          <span className="mt-2 font-mono text-[10px] font-bold tracking-wide text-[#F3D37A]">
                            {t('SCAN TO OPEN MOBILE VIEW', '手機相機掃描即開建議書')}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            ID: {activeStage4Microsite.id}
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* Suggestion #4: Real-Time QR Microsite Read-Intent Alerts & Auto WhatsApp Follow-Up */}
                    <QrReadIntentAlertsPanel
                      activeLead={activeLead}
                      activePlan={unifiedDeal.anchorPlan || allPlans[0]}
                      onRecordReadReceipt={() =>
                        handleLogMicrositeRead(activeStage4Microsite.id, 20)
                      }
                      onLogWhatsappAudit={(_leadId, excerpt) =>
                        handleAppendWhatsappAuditLog({
                          id: `wa-intent-${Date.now()}`,
                          sentAtIso: new Date().toISOString(),
                          clientName: activeLead.fullNameZh,
                          advisorLicenseNo: intermediary.iaLicenseNo,
                          channel: 'WHATSAPP',
                          summaryTopic: excerpt,
                          guaranteedSeparatedConfirmed: true,
                          coolingOff21dDisclosed: true,
                          auditFingerprint: `GL28-QR-${Date.now().toString(36).toUpperCase()}`,
                        })
                      }
                      onNotify={(msg) => showToast(msg)}
                    />

                    <ClientMicrositeView
                      record={activeStage4Microsite}
                      proposalUrl={stage4ShareUrl}
                      onPublishProposal={() => handleCreateMicrosite(activeStage4Microsite)}
                      standaloneMode
                      hideHeroQr
                      onLogReadReceipt={(yr) =>
                        handleLogMicrositeRead(activeStage4Microsite.id, yr)
                      }
                      onSubmitClientFeedback={(fb) =>
                        handleSubmitMicrositeFeedback(activeStage4Microsite.id, fb)
                      }
                    />
                  </div>
                )}

                <GuidedStepFooter
                  gate={evaluateGuidedStepGate({
                    activeSection: 'stage4',
                    expressMeetingMode,
                    activeLead,
                    anchorPlan: unifiedDeal.anchorPlan,
                    step1Confirmed: Boolean(step1ConfirmedByLead[activeLead.id]),
                    step3Confirmed: Boolean(step3ConfirmedByLead[activeLead.id]),
                    step4Confirmed: Boolean(step4ConfirmedByLead[activeLead.id]),
                    step5Signed: applications.some((app) => app.leadId === activeLead.id),
                  })}
                  onGoNext={(nextSec) => handleNavigateStage(nextSec)}
                  onGoBack={() => handleNavigateStage('stage3')}
                  backLabelZh="返回第 03 步"
                  backLabelEn="Back to Step 03"
                  showPrimaryAction={Boolean(unifiedDeal.anchorPlan) && !step4ConfirmedByLead[activeLead.id]}
                  primaryActionLabelZh="確認客戶已閱覽簡報及建議書 → 解鎖下一步"
                  primaryActionLabelEn="Confirm Client Reviewed Presentation → Unlock Next"
                  onPrimaryAction={() => {
                    setStep4ConfirmedByLead((prev) => ({
                      ...prev,
                      [activeLead.id]: true,
                    }));
                    showToast(
                      t(
                        'Step 04 presentation confirmed — Step 05 e-Sign is now unlocked.',
                        '第 04 步見客簡報已確認 —「下一步：前往電子投保簽署」已解鎖。'
                      )
                    );
                  }}
                  testIdPrefix="stage4-guided"
                />
              </div>
            )}

            {/* ============================================================== */}
            {/* STAGE 05: HKIA COMPLIANCE GATE, BUNDLED STP e-SIGN & DRIVE     */}
            {/* ============================================================== */}
            {activeSection === 'stage5' && (
              <div className="space-y-5">
                <div
                  data-testid="stage5-subtabs"
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2.5"
                >
                  <span className="text-xs font-semibold text-slate-600">
                    {isUserLoggedIn
                      ? t(
                          'Stage 05 · Proposal Confirmation, Policy Servicing & Cloud Backup',
                          '第 05 步 · 投保確認、售後續保跟進與 Google Drive 雲端備份'
                        )
                      : t(
                          'Stage 05 · Proposal Confirmation, Policy Servicing & Compliance Records',
                          '第 05 步 · 投保確認簽署、售後續保跟進與合規紀錄'
                        )}
                  </span>
                  <div
                    role="tablist"
                    aria-label="Stage 05 STP, Servicing, Compliance and Drive views"
                    className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1"
                  >
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage5-tab-stp"
                      aria-selected={stpSubTab === 'stp'}
                      onClick={() => setStpSubTab('stp')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stpSubTab === 'stp'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t(
                        '5A. Proposal Confirmation & E-Sign',
                        '5A. 投保確認與電子簽名'
                      )}
                    </button>
                    {isUserLoggedIn && (
                      <button
                        type="button"
                        role="tab"
                        data-testid="stage5-tab-drive"
                        aria-selected={stpSubTab === 'drive'}
                        onClick={() => setStpSubTab('drive')}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                          stpSubTab === 'drive'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t('5B. Google Drive Backup', '5B. Google Drive 雲端備份')}
                      </button>
                    )}
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage5-tab-servicing"
                      aria-selected={stpSubTab === 'servicing'}
                      onClick={() => setStpSubTab('servicing')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stpSubTab === 'servicing'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t(
                        '5C. Renewal, Claims & Policy Changes',
                        '5C. 續保、理賠與保單更改'
                      )}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      data-testid="stage5-tab-compliance"
                      aria-selected={stpSubTab === 'compliance'}
                      onClick={() => setStpSubTab('compliance')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        stpSubTab === 'compliance'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t(
                        '5D. CPD Hours & Compliance Records',
                        '5D. 培訓時數 (CPD) 與合規紀錄'
                      )}
                    </button>
                  </div>
                </div>

                {stpSubTab === 'stp' ? (
                  <AutoPolicyStpView
                    intermediary={intermediary}
                    leads={leads}
                    plans={allPlans}
                    selectedLeadId={selectedLeadId}
                    onSelectLeadId={handleSelectLeadId}
                    onUpdateLead={handleUpdateLead}
                    selectedPlanId={selectedPlanId}
                    onSelectPlanId={handleSelectPlanId}
                    currency={currency}
                    onChangeCurrency={setCurrency}
                    sumAssuredUsd={sumAssuredUsd}
                    onChangeSumAssuredUsd={setSumAssuredUsd}
                    paymentTermYears={paymentTermYears}
                    onChangePaymentTermYears={setPaymentTermYears}
                    applications={applications}
                    onRecordApplication={handleRecordApplication}
                    onFixComplianceInCrm={(type, leadId) => {
                      handleSelectLeadId(leadId);
                      setCrmInitialModal({ type, leadId });
                      setStage1Tab('crm');
                      handleNavigateStage('stage1');
                    }}
                    onVerifyIamSmartLead={handleVerifyIamSmartLead}
                    onSavePolicyPdfToDrive={handleSavePolicyPdfToDrive}
                    driveConnected={driveConnected}
                    canShowDrive={isUserLoggedIn}
                    unifiedDeal={unifiedDeal}
                    fxRateStamp={fxRateStamp}
                    expressMeetingMode={expressMeetingMode}
                    onJumpToMarketPlans={() => {
                      setStage2Tab('market');
                      handleNavigateStage('stage2');
                    }}
                    onNotify={(msg, tone) => showToast(msg, tone)}
                  />
                ) : stpSubTab === 'drive' && isUserLoggedIn ? (
                  <GoogleDriveGuideView
                    googleUser={googleUser}
                    driveConnected={driveConnected}
                    isSigningIn={isSigningIn}
                    driveBusy={driveBusy}
                    driveError={driveError}
                    driveFiles={driveFiles}
                    appDataBackupFile={appDataBackupFile}
                    onSignInGoogle={handleSignInGoogle}
                    onAuthAndCloudBackup={handleAuthAndCloudBackup}
                    onRestoreFromAppData={handleRequestRestoreAppData}
                    onSignOutGoogle={handleSignOutGoogle}
                    onRefreshDriveFiles={handleRefreshDriveFiles}
                    onSaveMasterGuideToDrive={handleSaveMasterGuideToDrive}
                    onSaveWorkspaceBackupToDrive={handleSaveWorkspaceBackupToDrive}
                    onSaveBundleToDrive={handleSaveBundleToDrive}
                    onRequestDeleteDriveFile={(file) => setPendingDeleteFile(file)}
                    workspaceBackupJsonString={workspaceBackupJsonString}
                  />
                ) : (
                  <PostSaleAndComplianceHub
                    mode={stpSubTab === 'servicing' ? 'servicing' : 'compliance'}
                    activeLead={activeLead}
                    leads={leads}
                    onSelectLeadId={handleSelectLeadId}
                    intermediary={intermediary}
                    anchorPlan={unifiedDeal.anchorPlan}
                    annualPremiumHkd={unifiedDeal.bundleSim.netAnnualPremiumHkd}
                    applications={applications}
                    inForcePolicies={inForcePolicies}
                    onUpdateInForcePolicies={setInForcePolicies}
                    claimCases={claimCases}
                    onUpdateClaimCases={setClaimCases}
                    endorsements={endorsements}
                    onUpdateEndorsements={setEndorsements}
                    cpdEntries={cpdEntries}
                    onUpdateCpdEntries={setCpdEntries}
                    agencyHandovers={agencyHandovers}
                    onSyncAgencyHandovers={handleSyncAgencyHandovers}
                    whatsappAuditLogs={whatsappAuditLogs}
                    onNotify={(msg) => showToast(msg)}
                  />
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* STAGE 06: 32 PRO CALCULATORS (SAVE TO CASE) & PRACTICE ROI     */}
            {/* ============================================================== */}
            {activeSection === 'stage6' && (
              <UnifiedAdvisoryToolsHub
                intermediary={intermediary}
                totalPlansCount={allPlans.length}
                totalInsurersCount={totalInsurersCount}
                leads={leads}
                selectedLeadId={selectedLeadId}
                onSelectLeadId={handleSelectLeadId}
                activeLead={activeLead}
                onAddLead={handleAddLead}
                onUpdateLead={handleUpdateLead}
                plans={allPlans}
                selectedPlanId={selectedPlanId}
                onSelectPlanId={handleSelectPlanId}
                applications={applications}
                currency={currency}
                sumAssuredUsd={sumAssuredUsd}
                paymentTermYears={paymentTermYears}
                clientSafeMode={clientSafeMode}
                onToggleClientSafeMode={() => setClientSafeMode((p) => !p)}
                adoptedImprovementIds={adoptedImprovementIds}
                onToggleAdoptImprovement={(id) =>
                  setAdoptedImprovementIds((prev) =>
                    prev.includes(id)
                      ? prev.filter((x) => x !== id)
                      : [...prev, id]
                  )
                }
                prioritizedRoadmapIds={prioritizedRoadmapIds}
                onTogglePrioritizeRoadmap={(id) =>
                  setPrioritizedRoadmapIds((prev) =>
                    prev.includes(id)
                      ? prev.filter((x) => x !== id)
                      : [...prev, id]
                  )
                }
                activeToolSelection={activeToolSelection}
                onSelectTool={setActiveToolSelection}
                whiteLabelConfig={whiteLabelConfig}
                onChangeWhiteLabelConfig={setWhiteLabelConfig}
                microsites={microsites}
                onCreateMicrosite={handleCreateMicrosite}
                onLogMicrositeRead={handleLogMicrositeRead}
                whatsappAuditLogs={whatsappAuditLogs}
                onAppendWhatsappAuditLog={handleAppendWhatsappAuditLog}
                onJumpToSection={(sec) => jumpToLegacyModule(sec)}
                canShowDrive={isUserLoggedIn}
                fxFeed={fxFeed}
                promoOverrides={promoOverrides}
                activePowerPackToolId={activePowerPackToolId}
                onChangeActivePowerPackToolId={setActivePowerPackToolId}
                forceOpenMode={stage6ForceMode}
                onConsumeForceOpenMode={() => setStage6ForceMode(null)}
                onNotify={(msg) => showToast(msg)}
              />
            )}
          </main>

          <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500">
            <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-3">
              <span>
                © 2026 HK InsureHub Pro ·{' '}
                {t(
                  'Hong Kong Licensed Insurance Intermediary Workbench (HKIA GL16 / GL28 / GL30)',
                  lang === 'zh-CN'
                    ? toSimplifiedChinese(
                        '香港持牌保險中介人全市場工作系統（符合保監局 GL16 / GL28 / GL30 指引）'
                      )
                    : '香港持牌保險中介人全市場工作系統（符合保監局 GL16 / GL28 / GL30 指引）'
                )}
              </span>
              {isUserLoggedIn && (
                <button
                  type="button"
                  onClick={() => {
                    setStpSubTab('drive');
                    handleNavigateStage('stage5');
                  }}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                >
                  {t('Cloud Backup & Guide', '雲端備份及操作指南')}
                </button>
              )}
            </div>
          </footer>
        </div>

        {/* Confirm Modal: Overwrite existing Google Drive file */}
        <ConfirmModal
          open={Boolean(pendingOverwrite)}
          title={t(
            'Overwrite Existing Google Drive File?',
            '確認覆蓋 Google Drive 現有檔案？'
          )}
          description={t(
            'A file with this exact name already exists in your HK InsureHub Pro Google Drive folder. Replace it with the latest version?',
            '您的「HK InsureHub Pro」Google Drive 資料夾中已存在同名檔案。是否確認以最新版本覆蓋？'
          )}
          affectedItemName={pendingOverwrite?.fileName}
          confirmLabel={t('Overwrite File', '確認覆蓋')}
          busy={driveBusy}
          onConfirm={handleConfirmOverwrite}
          onCancel={() => setPendingOverwrite(null)}
        />

        {/* Confirm Modal: Permanently delete Google Drive file */}
        <ConfirmModal
          open={Boolean(pendingDeleteFile)}
          title={t(
            'Delete Google Drive File?',
            '確認刪除 Google Drive 檔案？'
          )}
          description={t(
            'This will permanently remove the selected file from your Google Drive folder.',
            '此操作將從您的 Google Drive 資料夾永久移除該檔案，無法復原。'
          )}
          affectedItemName={pendingDeleteFile?.name}
          confirmLabel={t('Delete Permanently', '永久刪除')}
          tone="danger"
          busy={driveBusy}
          onConfirm={handleConfirmDeleteDriveFile}
          onCancel={() => setPendingDeleteFile(null)}
        />

        {/* Confirm Modal: Overwrite existing Google Drive appDataFolder backup */}
        <ConfirmModal
          open={Boolean(pendingAppDataOverwrite)}
          title={t(
            'Overwrite Existing Cloud Backup?',
            '確認更新 Google Drive 現有雲端備份？'
          )}
          description={t(
            'A previous advisor workspace backup already exists in your private Google Drive appDataFolder. Replace it with your current workspace?',
            '您的 Google Drive 專屬空間（appDataFolder）中已有一份雲端備份。是否確認以目前最新的顧問工作區覆蓋更新？'
          )}
          affectedItemName={APPDATA_WORKSPACE_BACKUP_FILENAME}
          confirmLabel={t('Update Cloud Backup', '確認覆蓋備份')}
          busy={driveBusy}
          onConfirm={handleConfirmAppDataOverwrite}
          onCancel={() => setPendingAppDataOverwrite(null)}
        />

        {/* Confirm Modal: Restore workspace from Google Drive appDataFolder */}
        <ConfirmModal
          open={Boolean(pendingAppDataRestore)}
          title={t(
            'Restore Workspace from Cloud Backup?',
            '確認從雲端備份還原工作區？'
          )}
          description={t(
            'This will replace your current local CRM leads, meeting notes, and proposals with the selected Google Drive Cloud Snapshot.',
            '此操作將以您 Google Drive 雲端備份快照覆蓋目前瀏覽器內的 CRM 客戶名單、筆記及建議書資料。是否確認還原？'
          )}
          affectedItemName={pendingAppDataRestore?.name}
          confirmLabel={t('Restore Snapshot', '確認還原')}
          busy={driveBusy}
          onConfirm={handleConfirmRestoreAppData}
          onCancel={() => setPendingAppDataRestore(null)}
        />

        <MobileSummaryPosterModal
          open={posterModalOpen}
          onClose={() => setPosterModalOpen(false)}
          unifiedDeal={unifiedDeal}
          intermediary={intermediary}
          clientSafeMode={clientSafeMode}
          allPlans={allPlans}
          onSelectPlanId={handleSelectPlanId}
          onEnableVhisRider={() => {
            handleUpdateLead(activeLead.id, (prev) => {
              const safe = ensureLeadCartDefaults(prev);
              const existingRiders = safe.proposalCart!.selectedRiderIds;
              if (existingRiders.includes('RIDER_SEMI_PRIVATE_VHIS')) return safe;
              return {
                ...safe,
                proposalCart: {
                  ...safe.proposalCart!,
                  selectedRiderIds: [...existingRiders, 'RIDER_SEMI_PRIVATE_VHIS'],
                },
              };
            });
          }}
          proposalShareUrl={stage4ShareUrl}
          onNotify={(msg) => showToast(msg)}
        />

        <GlobalCommandPaletteModal
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          leads={leads}
          plans={allPlans}
          canShowDrive={isUserLoggedIn}
          onSelectCommand={(cmd) => {
            if (cmd.leadId) {
              handleSelectLeadId(cmd.leadId);
            }
            if (cmd.planId) {
              handleSelectPlanId(cmd.planId);
            }
            if (cmd.toolCode) {
              setActiveToolSelection({ engine: 'IMP', code: cmd.toolCode });
              setStage6ForceMode('workbench');
            }
            if (cmd.targetSubTab === 'PROFILE_GAP') setStage1Tab('profile');
            if (cmd.targetSubTab === 'CRM_PIPELINE') setStage1Tab('crm');
            if (cmd.targetSubTab === 'CATALOG') setStage2Tab('market');
            if (cmd.targetSubTab === 'CLAUSES') setStage2Tab('clauses');
            if (cmd.targetSubTab === 'ACTUARIAL_LAB') setStage2Tab('actuarial_lab');
            if (cmd.targetSubTab === 'DUAL_CART') setStage3Tab('cart');
            if (cmd.targetSubTab === 'HOSPITAL_LOG') setStage3Tab('hospital');
            if (cmd.targetSubTab === 'DECK') setStage4Tab('deck');
            if (cmd.targetSubTab === 'OBJECTIONS') setStage4Tab('objections');
            if (cmd.targetSubTab === 'MICROSITE') setStage4Tab('microsite');
            if (cmd.targetSubTab === 'STP_SIGN') setStpSubTab('stp');
            if (cmd.targetSubTab === 'DRIVE_VAULT') setStpSubTab('drive');
            if (cmd.targetSubTab === 'SERVICING') setStpSubTab('servicing');
            if (cmd.targetSubTab === 'COMPLIANCE') setStpSubTab('compliance');
            if (cmd.targetSection) {
              handleNavigateStage(cmd.targetSection);
            }
          }}
        />

        <PromoAndFxConsoleModal
          open={promoFxModalOpen}
          onClose={() => setPromoFxModalOpen(false)}
          fxFeed={fxFeed}
          onSaveFxFeed={handleSaveFxFeed}
          promoOverrides={promoOverrides}
          onSavePromoOverrides={handleSavePromoOverrides}
        />

        <MemberAuthModal
          open={memberModalOpen}
          initialTab={memberModalTab}
          activeMember={activeMember}
          googleUser={googleUser}
          cloudBackupBusy={driveBusy || isSigningIn}
          onClose={() => setMemberModalOpen(false)}
          onAuthenticated={handleMemberAuthenticated}
          onProfileUpdated={handleMemberProfileUpdated}
          onLogout={handleLogoutMember}
          onGoogleAuthAndBackup={handleAuthAndCloudBackup}
          onGoogleAuthError={(msg) => showToast(msg, 'warning')}
        />

        <InteractiveWalkthroughCoach
          open={guidedCoachOpen}
          activeChapterId={guidedCoachChapterId}
          onSelectChapter={(chapterId, targetStage, targetSubTab?: TutorialTargetSubTab) => {
            setGuidedCoachChapterId(chapterId);
            setActiveSection(targetStage);
            if (targetSubTab === 'crm') setStage1Tab('crm');
            else if (targetSubTab === 'profile') setStage1Tab('profile');
            if (targetSubTab === 'market') setStage2Tab('market');
            if (targetSubTab === 'clauses') setStage2Tab('clauses');
            if (targetSubTab === 'actuarial_lab') setStage2Tab('actuarial_lab');
            if (targetSubTab === 'cart') setStage3Tab('cart');
            if (targetSubTab === 'hospital') setStage3Tab('hospital');
            if (targetSubTab === 'deck') setStage4Tab('deck');
            if (targetSubTab === 'microsite') setStage4Tab('microsite');
            if (targetSubTab === 'stp') setStpSubTab('stp');
            if (targetSubTab === 'servicing') setStpSubTab('servicing');
            if (targetSubTab === 'compliance') setStpSubTab('compliance');
            scrollWindowToTop();
          }}
          onNavigateSubStep={(targetStage, targetSubTab?: TutorialTargetSubTab) => {
            setActiveSection(targetStage);
            if (targetSubTab === 'crm') setStage1Tab('crm');
            else if (targetSubTab === 'insights') setStage1Tab('insights');
            else if (targetSubTab === 'team_coaching') setStage1Tab('team_coaching');
            else if (targetSubTab === 'profile') setStage1Tab('profile');
            if (targetSubTab === 'market') setStage2Tab('market');
            if (targetSubTab === 'clauses') setStage2Tab('clauses');
            if (targetSubTab === 'actuarial_lab') setStage2Tab('actuarial_lab');
            if (targetSubTab === 'cart') setStage3Tab('cart');
            if (targetSubTab === 'hospital') setStage3Tab('hospital');
            if (targetSubTab === 'deck') setStage4Tab('deck');
            if (targetSubTab === 'microsite') setStage4Tab('microsite');
            if (targetSubTab === 'stp') setStpSubTab('stp');
            if (targetSubTab === 'servicing') setStpSubTab('servicing');
            if (targetSubTab === 'compliance') setStpSubTab('compliance');
          }}
          onClose={() => setGuidedCoachOpen(false)}
        />

        {/* Suggestion #3: iPad Landscape Client-Facing Presentation Lock Modal */}
        <ClientPresentationLockOverlay
          open={ipadClientLockOpen}
          onClose={() => setIpadClientLockOpen(false)}
          lead={activeLead}
          plan={unifiedDeal.anchorPlan || allPlans[0]}
          intermediary={intermediary}
          fxUsdToHkd={fxFeed.usdToHkd}
          fxHkdToRmb={fxFeed.hkdToRmb}
          onApplyToDeal={({ paymentTermYears: nextTerm, sumAssuredUsd: nextSa, vhisDeductibleHkd }) => {
            setPaymentTermYears(nextTerm);
            setSumAssuredUsd(nextSa);
            handleUpdateLead(activeLead.id, (prev) => ({
              ...prev,
              proposalCart: {
                ...(prev.proposalCart || unifiedDeal.cart),
                paymentTermYears: nextTerm,
                sumAssuredUsd: nextSa,
                hospitalDeductibleHkd: vhisDeductibleHkd,
              },
            }));
            showToast(
              t(
                'Applied iPad Client Presentation parameters to active proposal.',
                '已將 iPad 見客同屏互動參數同步套用至當前建議書！'
              )
            );
          }}
        />

        <OfflineIndicator />
      </div>
    </LanguageContext.Provider>
  );
}
