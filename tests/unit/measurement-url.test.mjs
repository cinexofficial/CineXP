import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMeasurement } from '../../src/lib/measurement-url.ts';

test('download tokens and query strings never go to analytics', () => {
  const event = sanitizeMeasurement({ type: 'event', url: 'https://www.cinexp.site/download/secret-token?secret=123#watch' });
  assert.equal(event.url, 'https://www.cinexp.site/download/[token]');
  assert.equal(sanitizeMeasurement({ url: 'https://www.cinexp.site/search?q=personal' }).url, 'https://www.cinexp.site/search');
});
test('admin pages and invalid analytics URLs are excluded', () => {
  assert.equal(sanitizeMeasurement({ url: 'https://www.cinexp.site/admin/settings' }), null);
  assert.equal(sanitizeMeasurement({ url: 'not a URL' }), null);
});
