import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AD_PLACEMENTS, resolveAdPolicy, placementSettingKey } from '../../src/lib/ad-policy.ts';

test('unverified placements never request the network', () => {
  const policy = resolveAdPolicy({}, { disabled: false, verified: '' });
  assert.equal(Object.keys(policy).length, Object.keys(AD_PLACEMENTS).length);
  for (const slot of Object.values(policy)) assert.deepEqual(slot, { enabled: true, networkEnabled: false });
});

test('verification is per placement and cannot override the kill switch', () => {
  const verified = Object.keys(AD_PLACEMENTS).join(',');
  for (const slot of Object.values(resolveAdPolicy({}, { disabled: true, verified }))) {
    assert.deepEqual(slot, { enabled: false, networkEnabled: false });
  }
  const policy = resolveAdPolicy({}, { disabled: false, verified: 'home-primary,unknown' });
  assert.equal(policy['home-primary'].networkEnabled, true);
  assert.equal(policy['home-secondary'].networkEnabled, false);
});

test('saved global, download and individual switches are respected', () => {
  const environment = { disabled: false, verified: 'home-primary,download-below-actions' };
  const policy = resolveAdPolicy({ ADS_DOWNLOAD_ENABLED: 'false', [placementSettingKey('home-primary')]: 'false' }, environment);
  assert.equal(policy['home-primary'].enabled, false);
  assert.equal(policy['download-below-actions'].enabled, false);
  assert.equal(policy['catalog-movies'].enabled, true);
  for (const slot of Object.values(resolveAdPolicy({ ADS_DISPLAY_ENABLED: 'false' }, environment))) assert.equal(slot.enabled, false);
});
