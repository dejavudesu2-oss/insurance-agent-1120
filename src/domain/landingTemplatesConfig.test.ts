import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLandingActuarialSandbox,
  DEFAULT_PRODUCTION_LANDING_TEMPLATE,
  LANDING_SANDBOX_MANDATES,
  LANDING_TEMPLATES_CATALOG,
  resolveInitialLandingTemplate,
} from './landingTemplatesConfig';
import { SCOPES } from '../firebase';

test('LANDING_TEMPLATES_CATALOG exposes all 5 templates and locks Template 04 (Harbour Family Office Cinema) as default', () => {
  assert.equal(LANDING_TEMPLATES_CATALOG.length, 5);
  assert.equal(DEFAULT_PRODUCTION_LANDING_TEMPLATE, 'T4_FAMILY_OFFICE_CINEMA');
  const uniqueIds = new Set(LANDING_TEMPLATES_CATALOG.map((t) => t.id));
  assert.equal(uniqueIds.size, 5);
});

test('resolveInitialLandingTemplate defaults to T4_FAMILY_OFFICE_CINEMA and honors explicit URL overrides', () => {
  assert.equal(resolveInitialLandingTemplate('', null), 'T4_FAMILY_OFFICE_CINEMA');
  assert.equal(
    resolveInitialLandingTemplate('', 'T3_SWISS_INTERNATIONAL'),
    'T3_SWISS_INTERNATIONAL'
  );
  assert.equal(
    resolveInitialLandingTemplate('?template=t2', 'T5_SPATIAL_KINETIC_3D'),
    'T2_ARCHIVAL_BROADSHEET'
  );
  assert.equal(
    resolveInitialLandingTemplate('?template=1', null),
    'T1_DAYLIGHT_FINTECH'
  );
  assert.equal(
    resolveInitialLandingTemplate('?template=3d', null),
    'T5_SPATIAL_KINETIC_3D'
  );
});

test('computeLandingActuarialSandbox enforces HKIA GL28 cap and preserves guaranteed cash value under dividend stress', () => {
  const henry = LANDING_SANDBOX_MANDATES[0];
  const baseHkd = computeLandingActuarialSandbox(henry, 'HKD', 100);
  const stressedHkd = computeLandingActuarialSandbox(henry, 'HKD', 85);

  assert.ok(Number(baseHkd.effectiveIrrPct) <= 6.0);
  assert.equal(baseHkd.year20Guaranteed, stressedHkd.year20Guaranteed);
  assert.ok(baseHkd.year20Projected > stressedHkd.year20Projected);
});

test('src/firebase.ts configures both Google Drive appdata cloud backup and drive.file scopes', () => {
  assert.ok(SCOPES.includes('https://www.googleapis.com/auth/drive.appdata'));
  assert.ok(SCOPES.includes('https://www.googleapis.com/auth/drive.file'));
});
