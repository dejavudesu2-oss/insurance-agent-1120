import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADVISOR_WORKFLOW_ROI_BENCHMARKS,
  CANTONESE_TUTORIAL_CHAPTERS,
  CANTONESE_TUTORIAL_TOTAL_DURATION_SEC,
  computeTutorialProgressPercent,
  computeWorkflowEfficiencySummary,
  filterTutorialChapters,
  formatTutorialTimestamp,
  getAllTutorialSubSteps,
  resolveActiveTutorialChapter,
  resolveActiveTutorialSubStep,
} from './tutorialWalkthroughConfig';

test('CANTONESE_TUTORIAL_CHAPTERS forms a contiguous 8-chapter 0..144s timeline with 24 6-second operational sub-steps', () => {
  assert.equal(CANTONESE_TUTORIAL_CHAPTERS.length, 8);
  assert.equal(CANTONESE_TUTORIAL_TOTAL_DURATION_SEC, 144);

  let expectedChapterStart = 0;
  for (const ch of CANTONESE_TUTORIAL_CHAPTERS) {
    assert.equal(ch.startSec, expectedChapterStart);
    assert.equal(ch.durationSec, 18);
    assert.equal(ch.endSec, expectedChapterStart + 18);
    assert.equal(ch.formattedStart, formatTutorialTimestamp(ch.startSec));
    assert.ok(ch.traditionalMinutes > ch.optimizedMinutes, `${ch.id} must save advisor time`);
    assert.equal(ch.subSteps.length, 3, `${ch.id} must have 3 granular operational sub-steps`);
    assert.equal(ch.actionStepsZh.length, 4);
    assert.equal(ch.actionStepsEn.length, 4);

    let expectedSubStart = ch.startSec;
    for (const sub of ch.subSteps) {
      assert.equal(sub.startSec, expectedSubStart);
      assert.equal(sub.endSec, expectedSubStart + 6);
      assert.equal(sub.formattedStart, formatTutorialTimestamp(sub.startSec));
      assert.ok(sub.uiControlZh.length > 5);
      assert.ok(sub.expectedResultZh.length > 5);
      expectedSubStart = sub.endSec;
    }
    assert.equal(expectedSubStart, ch.endSec);
    expectedChapterStart = ch.endSec;
  }

  assert.equal(expectedChapterStart, CANTONESE_TUTORIAL_TOTAL_DURATION_SEC);
  assert.equal(getAllTutorialSubSteps().length, 24);
});

test('computeWorkflowEfficiencySummary quantifies 180m -> 12m (93% time saved) accurately', () => {
  const summary = computeWorkflowEfficiencySummary(ADVISOR_WORKFLOW_ROI_BENCHMARKS);
  assert.equal(summary.totalBeforeMinutes, 180);
  assert.equal(summary.totalAfterMinutes, 12);
  assert.equal(summary.minutesSavedPerCase, 168);
  assert.equal(summary.timeSavedPercent, 93);
});

test('formatTutorialTimestamp formats seconds cleanly up to 02:24', () => {
  assert.equal(formatTutorialTimestamp(-5), '00:00');
  assert.equal(formatTutorialTimestamp(0), '00:00');
  assert.equal(formatTutorialTimestamp(54), '00:54');
  assert.equal(formatTutorialTimestamp(108), '01:48');
  assert.equal(formatTutorialTimestamp(144), '02:24');
});

test('resolveActiveTutorialChapter & resolveActiveTutorialSubStep resolve exact boundaries across 0..144s', () => {
  assert.equal(resolveActiveTutorialChapter(0).id, 'ch1');
  assert.equal(resolveActiveTutorialChapter(17.9).id, 'ch1');
  assert.equal(resolveActiveTutorialChapter(18.0).id, 'ch2');
  assert.equal(resolveActiveTutorialChapter(36.0).id, 'ch3');
  assert.equal(resolveActiveTutorialChapter(54.0).id, 'ch4');
  assert.equal(resolveActiveTutorialChapter(72.0).id, 'ch5');
  assert.equal(resolveActiveTutorialChapter(90.0).id, 'ch6');
  assert.equal(resolveActiveTutorialChapter(108.0).id, 'ch7');
  assert.equal(resolveActiveTutorialChapter(126.0).id, 'ch8');
  assert.equal(resolveActiveTutorialChapter(144.0).id, 'ch8');

  const ch4 = CANTONESE_TUTORIAL_CHAPTERS[3];
  assert.equal(resolveActiveTutorialSubStep(54.0, ch4).code, '4.1');
  assert.equal(resolveActiveTutorialSubStep(59.9, ch4).code, '4.1');
  assert.equal(resolveActiveTutorialSubStep(60.0, ch4).code, '4.2');
  assert.equal(resolveActiveTutorialSubStep(66.0, ch4).code, '4.3');
  assert.equal(resolveActiveTutorialSubStep(71.9, ch4).code, '4.3');
});

test('filterTutorialChapters filters by workflow phase and granular UI control keywords', () => {
  const comparePhase = filterTutorialChapters(CANTONESE_TUTORIAL_CHAPTERS, 'COMPARE_ACTUARIAL');
  assert.deepEqual(
    comparePhase.map((c) => c.id),
    ['ch4', 'ch5']
  );

  const policyIdSearch = filterTutorialChapters(CANTONESE_TUTORIAL_CHAPTERS, 'ALL', '77419');
  assert.deepEqual(
    policyIdSearch.map((c) => c.id),
    ['ch3']
  );

  const stressSearch = filterTutorialChapters(CANTONESE_TUTORIAL_CHAPTERS, 'ALL', '85% 壓測');
  assert.deepEqual(
    stressSearch.map((c) => c.id),
    ['ch4']
  );

  const hiborSearch = filterTutorialChapters(CANTONESE_TUTORIAL_CHAPTERS, 'ALL', 'HIBOR');
  assert.equal(hiborSearch.length, 1);
  assert.equal(hiborSearch[0].id, 'ch5');

  const hospitalSearch = filterTutorialChapters(CANTONESE_TUTORIAL_CHAPTERS, 'ALL', '養和');
  assert.ok(hospitalSearch.some((c) => c.id === 'ch6'));
});

test('computeTutorialProgressPercent clamps cleanly between 0 and 100 for 144s duration', () => {
  assert.equal(computeTutorialProgressPercent(-2, 144), 0);
  assert.equal(computeTutorialProgressPercent(72, 144), 50);
  assert.equal(computeTutorialProgressPercent(180, 144), 100);
});
