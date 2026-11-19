import test from 'node:test';
import assert from 'node:assert/strict';
import { HK_MARKET_PLANS, INTERMEDIARY_PROFILES } from '../data/hkMarketPlans';
import { INITIAL_CLIENT_LEADS } from '../data/initialLeads';
import {
  calculateDualCurrencyBundleSimulation,
  createDefaultMorningBriefingDeck,
  evaluateSixDimensionGapAudit,
  getDefaultRidersForScheme,
} from './clientGapEngine';
import {
  buildExecutiveSummaryPdfModel,
  tokenizeMixedCjkText,
} from './executiveSummaryPdfModel';
import { IntermediaryRole, LeadStage } from './types';

test('tokenizeMixedCjkText splits CJK characters individually while preserving Latin words', () => {
  const tokens = tokenizeMixedCjkText('補強養和 HK$ 4,000,000 半私家房 Semi-Private');
  assert.ok(tokens.length > 6);
  assert.ok(tokens.some((t) => t.trim() === 'HK$'));
  assert.ok(tokens.some((t) => t.trim() === 'Semi-Private'));
  assert.ok(tokens.includes('補'));
  assert.ok(tokens.includes('強'));
});

test('buildExecutiveSummaryPdfModel constructs 5-slide executive summary model and preserves live slide edits', () => {
  const lead = INITIAL_CLIENT_LEADS[0];
  const intermediary = INTERMEDIARY_PROFILES[IntermediaryRole.BROKER_TR];
  const anchorPlan = HK_MARKET_PLANS.find((p) => p.id === 'AIA_GPMCP3') || HK_MARKET_PLANS[0];

  const gapAudit = evaluateSixDimensionGapAudit(lead, lead.targetSchemeId);
  const bundleSim = calculateDualCurrencyBundleSimulation({
    lead,
    selectedPlan: anchorPlan,
    selectedRiderIds: getDefaultRidersForScheme(lead.targetSchemeId),
    paymentMode: 'ANNUAL',
    paymentTermYears: 10,
    fxRateHkdToRmb: 0.92,
    scenarioId: 'HOSPITAL_MIN_INVASIVE',
  });

  const baseSlides = createDefaultMorningBriefingDeck({
    lead,
    intermediary,
    plan: anchorPlan,
  });

  assert.equal(baseSlides.length, 5);

  const editedSlides = baseSlides.map((s, idx) =>
    idx === 0
      ? {
          ...s,
          titleZh: '【自訂簡報標題】陳冠宇家庭全方位高管摘要',
          titleEn: '[Custom Executive Slide] Daniel Chan Family Strategy',
          bulletsZh: [...s.bulletsZh, '新增自訂要點：鎖定養和半私家房免找數預批'],
          bulletsEn: [...s.bulletsEn, 'Custom bullet: Lock HKSH cashless LOG pre-approval'],
        }
      : s
  );

  const zhModel = buildExecutiveSummaryPdfModel({
    lead,
    plan: anchorPlan,
    intermediary,
    slides: editedSlides,
    gapAudit,
    bundleSim,
    lang: 'zh-HK',
    issuedDateIso: '2026-11-13',
  });

  assert.equal(zhModel.fileName, 'Executive_Summary_Deck_Daniel_Chan_Kwun_Yu.pdf');
  assert.equal(zhModel.slides.length, 5);
  assert.equal(zhModel.kpis.length, 4);
  assert.equal(zhModel.dimensionItems.length, 6);
  assert.equal(zhModel.waterfallItems.length, 4);
  assert.equal(zhModel.claimVisual.bars.length, 3);
  assert.equal(zhModel.readinessItems.length, 4);
  assert.equal(zhModel.slides[0].title, '【自訂簡報標題】陳冠宇家庭全方位高管摘要');
  assert.ok(
    zhModel.slides[0].bullets.includes('新增自訂要點：鎖定養和半私家房免找數預批')
  );
  assert.ok(zhModel.anchorPlanLine.includes(anchorPlan.insurerCode));

  const enModel = buildExecutiveSummaryPdfModel({
    lead: { ...lead, stage: LeadStage.IN_FORCE },
    plan: null,
    intermediary,
    slides: editedSlides,
    gapAudit,
    bundleSim,
    lang: 'en',
    issuedDateIso: '2026-11-13',
  });

  assert.equal(enModel.slides[0].title, '[Custom Executive Slide] Daniel Chan Family Strategy');
  assert.ok(enModel.slides[0].bullets.includes('Custom bullet: Lock HKSH cashless LOG pre-approval'));
  assert.ok(enModel.anchorPlanLine.includes('Target Protection Architecture'));
  assert.equal(enModel.readinessItems[3].done, true);
  assert.equal(enModel.readinessItems[3].statusTag, 'ISSUED');
});
