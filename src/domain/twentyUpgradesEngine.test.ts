import test from 'node:test';
import assert from 'node:assert/strict';
import { HK_MARKET_PLANS, INTERMEDIARY_PROFILES } from '../data/hkMarketPlans';
import { INITIAL_CLIENT_LEADS } from '../data/initialLeads';
import { IntermediaryRole } from './types';
import {
  auditExistingPolicyDeterministically,
  buildDeterministicQrMatrix,
  buildHouseholdAndReferralTree,
  buildIamSmartVerificationHandshake,
  buildTalentAndMcvSigningConciergePack,
  buildTeamDirectorMdrtAndBackdateBoard,
  calculateGroupMedicalToVhisBridge,
  calculateHkMpfAndGbaRetirementWaterfall,
  calculateOverseasTuitionWithdrawalPlan,
  calculatePromoRebateAndPrepaidStack,
  calculateSmeKeymanAndBuySell,
  createClientMicrositeProposal,
  createWhatsAppComplianceLog,
  DEFAULT_WHITE_LABEL_CONFIG,
  evaluateGn16CohortStability,
  evaluatePersistencyAndClawbackLedger,
  evaluateSurgeonFeeBenchmark,
  simulateInsuranceTrustVsPolicySplit,
  triageLabBiomarkers,
  TWENTY_LIVE_UPGRADES_META,
} from './twentyUpgradesEngine';
import { TWENTY_APP_IMPROVEMENTS } from './clauseAndMonetizationEngine';

test('All 20 live upgrades IMP-01 through IMP-20 map 1-to-1 with TWENTY_APP_IMPROVEMENTS', () => {
  assert.equal(TWENTY_LIVE_UPGRADES_META.length, 20);
  assert.equal(TWENTY_APP_IMPROVEMENTS.length, 20);
  for (let i = 0; i < 20; i++) {
    assert.equal(TWENTY_LIVE_UPGRADES_META[i].code, TWENTY_APP_IMPROVEMENTS[i].upgradeCode);
  }
});

test('IMP-01 & IMP-16: Client Microsite generator and QR matrix produce valid projections & 13x13 grid', () => {
  const lead = INITIAL_CLIENT_LEADS[0];
  const plan = HK_MARKET_PLANS[0];
  const broker = INTERMEDIARY_PROFILES[IntermediaryRole.BROKER_TR];
  const microsite = createClientMicrositeProposal({
    lead,
    plan,
    intermediary: broker,
    whiteLabel: DEFAULT_WHITE_LABEL_CONFIG,
    currency: 'USD',
    sumAssuredUsd: 100000,
    paymentTermYears: 15,
  });

  assert.ok(microsite.id.startsWith('ms-'));
  assert.ok(microsite.projections.length >= 5);
  assert.equal(microsite.whiteLabelTitle, DEFAULT_WHITE_LABEL_CONFIG.practiceTitleZh);

  const qr = buildDeterministicQrMatrix(DEFAULT_WHITE_LABEL_CONFIG.contactChannelLabel);
  assert.equal(qr.length, 13);
  assert.equal(qr[0].length, 13);
  assert.equal(qr[0][0], true); // Top-left finder corner
});

test('IMP-02, IMP-03 & IMP-06: Legacy policy audit, Surgeon fee benchmark, and GN16 stability work accurately', () => {
  const audit = auditExistingPolicyDeterministically(
    'Policy Inception: 2013. Daily Room & Board Limit: HK$750/day. Surgeon Fee Schedule Cap: HK$45,000.'
  );
  assert.equal(audit.inceptionYearEstimate, 2013);
  assert.ok(audit.estimatedOutOfPocketShortfallHkd > 100000);

  const surgStd = evaluateSurgeonFeeBenchmark({
    benchmarkId: 'surg-coronary-ptca',
    percentile: 'P50_MEDIAN',
    planTier: 'VHIS_STANDARD',
    deductibleHkd: 0,
  });
  const surgHigh = evaluateSurgeonFeeBenchmark({
    benchmarkId: 'surg-coronary-ptca',
    percentile: 'P50_MEDIAN',
    planTier: 'HIGH_END_FULL_COVER',
    deductibleHkd: 0,
  });
  assert.ok(surgStd.clientOutOfPocketHkd > 80000);
  assert.equal(surgHigh.clientOutOfPocketHkd, 0);

  const gn16 = evaluateGn16CohortStability('FWD');
  assert.ok(gn16.meanRatioPct >= 98 && gn16.meanRatioPct <= 102);
  assert.ok(gn16.stdDevPct < 3);
});

test('IMP-04, IMP-07, IMP-08, IMP-09, IMP-10: Concierge, Family Tree, Persistency, Trust & SME Keyman', () => {
  const pack = buildTalentAndMcvSigningConciergePack({
    clientName: 'Lin Xiaomei',
    visaCategory: 'TOP_TALENT_TTPS',
    arrivalHub: 'WEST_KOWLOON_HSR',
    preferredBank: 'HSBC_HK',
    signingDistrict: 'TST_CANTON_RD',
    lang: 'zh-HK',
  });
  assert.equal(pack.schedule.length, 4);
  assert.ok(pack.copyCardText.includes('HK$8,000'));

  const tree = buildHouseholdAndReferralTree(INITIAL_CLIENT_LEADS[0]);
  assert.ok(tree.nodes.length >= 4);
  assert.ok(tree.sharedVhisTaxCapHkd >= 24000);

  const persistencyBefore = evaluatePersistencyAndClawbackLedger({ savedPoliciesCount: 0 });
  const persistencyAfter = evaluatePersistencyAndClawbackLedger({ savedPoliciesCount: 2 });
  assert.ok(persistencyAfter.projected13mPersistencyPct > persistencyBefore.projected13mPersistencyPct);
  assert.ok(persistencyAfter.totalClawbackExposureHkd < persistencyBefore.totalClawbackExposureHkd);

  const smallEstate = simulateInsuranceTrustVsPolicySplit({ deathBenefitUsd: 800000, payoutYears: 20 });
  const jumboEstate = simulateInsuranceTrustVsPolicySplit({ deathBenefitUsd: 5000000, payoutYears: 20 });
  assert.equal(smallEstate.recommendPrivateTrust, false);
  assert.equal(jumboEstate.recommendPrivateTrust, true);

  const keyman = calculateSmeKeymanAndBuySell({
    companyValuationHkd: 20000000,
    keymanGrossProfitContributionHkd: 3000000,
    recoveryYears: 3,
    shareholderCount: 3,
    founderEquityPct: 30,
    policyStructure: 'PURE_TERM_KEYMAN',
  });
  assert.equal(keyman.isDipn28Deductible, true);
  assert.ok(keyman.profitsTaxSavedHkd > 0);
});

test('IMP-11, IMP-12, IMP-13, IMP-15, IMP-18, IMP-19, IMP-20: Bridge, Tuition, Labs, Promo, MDRT, GBA & iAM Smart', () => {
  const bridge = calculateGroupMedicalToVhisBridge({
    currentAge: 36,
    plannedExitAge: 55,
    employerSurgicalLimitHkd: 40000,
    selectedDeductibleHkd: 25000,
  });
  assert.equal(bridge.outOfPocketBridgeGapHkd, 0);
  assert.ok(bridge.cumulativePremiumSavedBeforeExitHkd > 50000);

  const tuition = calculateOverseasTuitionWithdrawalPlan({
    destination: 'UK_GBP',
    childCurrentAge: 4,
  });
  assert.equal(tuition.degreeYears, 3);
  assert.ok(tuition.totalRequiredHkd > 1800000);

  const labClean = triageLabBiomarkers({ bmi: 22.5, systolicBp: 118, hba1cPct: 5.3, altUl: 28 });
  assert.equal(labClean.tier, 'STANDARD_LIKELY');

  const promo = calculatePromoRebateAndPrepaidStack({
    annualPremiumUsd: 20000,
    firstYearRebatePct: 18,
    prepaidGuaranteedRatePct: 4.6,
    prepayFull5Years: true,
  });
  assert.ok(promo.netOutOfPocket5YrUsd < promo.gross5YrUsd);
  assert.ok(promo.yr15AdvantageOverBankTdUsd > 0);

  const mdrtBoard = buildTeamDirectorMdrtAndBackdateBoard(INITIAL_CLIENT_LEADS);
  assert.equal(mdrtBoard.teamMembers.length, 4);
  assert.ok(mdrtBoard.ageBackdateLeads.length > 0);

  const gba = calculateHkMpfAndGbaRetirementWaterfall({
    venue: 'GBA_SHENZHEN_ZHUHAI_WELLNESS',
    mpfProjectedAt65Hkd: 2800000,
    monthlyAnnuityAndQdapHkd: 6500,
    monthlyParticipatingWithdrawalHkd: 8000,
  });
  assert.equal(gba.isFullyFunded, true);

  const waLog = createWhatsAppComplianceLog({
    clientName: 'Chan Tai Man',
    advisorLicenseNo: 'FB1928',
    channel: 'WHATSAPP',
    summaryTopic: 'FWD MaxFocus Yr-20 Surrender Illustration',
  });
  assert.ok(waLog.auditFingerprint.startsWith('HKIA-SHA-'));

  const iamSmart = buildIamSmartVerificationHandshake(INITIAL_CLIENT_LEADS[0]);
  assert.equal(iamSmart.verified, true);
  assert.ok(iamSmart.iamSmartRefId.startsWith('IAMS-HK-'));
});
