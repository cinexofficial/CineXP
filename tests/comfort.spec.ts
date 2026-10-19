import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const picture = '<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513"><rect width="100%" height="100%" fill="#394832"/></svg>';
test.beforeEach(async ({ page, request }) => {
  await request.post('http://127.0.0.1:4010/ad-fixture-control', { data: { mode: 'rendered' } });
  await page.route('https://image.tmdb.org/**', route => route.fulfill({ contentType: 'image/svg+xml', body: picture }));
  await page.route('**/api/cache-version', route => route.fulfill({ json: { version: '0' } }));
  await page.route('**/ad-fixture/**', route => route.fulfill({ contentType: 'application/javascript', body: `document.body.insertAdjacentHTML('beforeend', '<a href="https://example.com/sponsor">Test advertisement</a>');` }));
  await page.addInitScript(() => {
    const measurements: { event: string; properties: Record<string, unknown> }[] = [];
    Object.assign(window, { measurements });
    window.addEventListener('cinexp:measurement', event => measurements.push((event as CustomEvent).detail));
  });
});

test('home ads follow actual rendered sections and empty local rows do not count', async ({ page }) => {
  await page.goto('/');
  const slot = page.locator('[data-placement="home-primary"]');
  await expect(slot).toHaveCount(1);
  const position = await slot.evaluate(element => {
    let count = 0;
    let sibling = element.previousElementSibling;
    while (sibling) { if (sibling.matches('[data-home-section]') && sibling.querySelector('section')) count++; sibling = sibling.previousElementSibling; }
    return count;
  });
  expect(position).toBe(2);
  await expect(page.locator('[data-placement="home-secondary"]')).toHaveCount(0);
});

for (const [path, placement] of [['/movies', 'catalog-movies'], ['/tv', 'catalog-series'], ['/trending', 'catalog-trending'], ['/genres/878', 'catalog-genre']]) {
  test(`${path} has one inline placement after the results`, async ({ page }) => {
    await page.goto(path);
    const slots = page.getByRole('complementary', { name: 'Advertisement', exact: true });
    await expect(slots).toHaveCount(1);
    await expect(slots).toHaveAttribute('data-placement', placement);
    expect(await slots.evaluate(element => !!element.previousElementSibling?.classList.contains('grid'))).toBe(true);
  });
}

test('display ads cannot open popups or navigate the top page, even on click', async ({ page, request }) => {
  await request.post('http://127.0.0.1:4010/ad-fixture-control', { data: { mode: 'attack' } });
  let popups = 0;
  page.on('popup', () => popups++);
  await page.route('**/ad-fixture/**', route => route.fulfill({ contentType: 'application/javascript', body: `
    document.body.insertAdjacentHTML('beforeend', '<button id="attack">Test protection</button><a>Test ad</a>');
    function attack(){try{window.open('https://example.com/unwanted')}catch{};try{top.location.href='https://example.com/hijack'}catch{}};
    attack();document.getElementById('attack').onclick=attack;
  ` }));
  await page.goto('/');
  const slot = page.locator('[data-placement="home-primary"]');
  await slot.scrollIntoViewIfNeeded();
  const frame = slot.locator('iframe');
  await expect(frame).toHaveAttribute('sandbox', 'allow-scripts');
  await frame.contentFrame().getByRole('button', { name: 'Test protection' }).click();
  await expect(page).toHaveURL('/');
  expect(popups).toBe(0);
});

test('a stalled ad times out to the same-size house promotion', async ({ page, request }) => {
  await request.post('http://127.0.0.1:4010/ad-fixture-control', { data: { mode: 'stalled' } });
  await page.route('**/ad-fixture/**', async route => { await new Promise(resolve => setTimeout(resolve, 11000)); await route.abort().catch(() => {}); });
  await page.goto('/');
  const slot = page.locator('[data-placement="home-primary"]');
  await slot.scrollIntoViewIfNeeded();
  await expect(slot.locator('iframe')).toHaveCount(1);
  const before = await slot.boundingBox();
  await expect(slot.locator('[data-ad-state="failed"]')).toBeVisible({ timeout: 12000 });
  await expect(slot.locator('iframe')).toHaveCount(0);
  expect((await slot.boundingBox())?.height).toBe(before?.height);
  await expect(slot.getByText('CineXP · A world of stories.')).toBeVisible();
  const failures = await page.evaluate(() => (window as unknown as { measurements: { event: string }[] }).measurements.filter(item => item.event === 'ad_load_failed').length);
  expect(failures).toBe(1);
});

test('undersized placements keep the house promotion instead of clipping a creative', async ({ page, request }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  const slot = page.locator('[data-placement="home-primary"]');
  await slot.scrollIntoViewIfNeeded();
  expect((await slot.locator('.cx-ad-canvas').boundingBox())!.width).toBeLessThan(320);
  await expect(slot.locator('iframe')).toHaveCount(0);
  expect((await (await request.get('http://127.0.0.1:4010/ad-fixture-control')).json()).adRequests).toBe(0);
  const height = (await slot.boundingBox())?.height;
  await page.setViewportSize({ width: 390, height: 740 });
  await expect(slot.locator('[data-ad-state="rendered"]')).toBeVisible();
  await expect(slot.locator('iframe')).toHaveCount(1);
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(slot.locator('iframe')).toHaveCount(0);
  await expect(slot.getByText('CineXP · A world of stories.')).toBeVisible();
  expect((await slot.boundingBox())?.height).toBe(height);
});

test('search and saved lists make no ad requests', async ({ page, request }) => {
  let requests = 0;
  page.on('request', request => { if (/highperformanceformat|ad-fixture/.test(request.url())) requests++; });
  for (const path of ['/search', '/watchlist', '/feed']) {
    await page.goto(path);
    await expect(page.getByRole('complementary', { name: 'Advertisement', exact: true })).toHaveCount(0);
  }
  expect(requests).toBe(0);
  expect((await (await request.get('http://127.0.0.1:4010/ad-fixture-control')).json()).adRequests).toBe(0);
});

test('embedded providers stay sandboxed and ignore spoofed playback messages', async ({ page }) => {
  await page.route('**/api/downloads?*', route => route.fulfill({ json: { links: [], episodeLinks: [] } }));
  await page.route('https://vidfast.pro/**', route => route.fulfill({ contentType: 'text/html', body: `<button onclick="parent.postMessage({type:'PLAYER_EVENT',data:{event:'playing'}},'*')">Confirm playback</button><script>try{window.open('https://example.com/ads')}catch{};try{top.location='https://example.com/ads'}catch{}</script>` }));
  await page.goto('/media/movie/101-across-the-stars?stream=vidfast');
  const frame = page.getByTitle('Streaming player', { exact: true });
  await expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-presentation');
  await page.evaluate(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://vidfast.pro', data: { type: 'PLAYER_EVENT', data: { event: 'playing' } } })));
  expect(await page.evaluate(() => (window as unknown as { measurements: { event: string }[] }).measurements.filter(item => item.event === 'playback_started').length)).toBe(0);
  await frame.contentFrame().getByRole('button', { name: 'Confirm playback' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { measurements: { event: string }[] }).measurements.filter(item => item.event === 'playback_started').length)).toBe(1);
  await expect(page).toHaveURL(/\/media\/movie\/101-across-the-stars/);
});

test('native player survives menu changes and recovers through a fresh retry', async ({ page }) => {
  await page.route('**/api/downloads?*', route => route.fulfill({ json: { links: [{ id: 'native', label: 'Test stream', quality: '1080p', size: '', url: '/test-stream.mp4', isMoviebox: true }], episodeLinks: [] } }));
  await page.route('**/test-stream.mp4*', route => route.fulfill({ contentType: 'video/mp4', body: 'invalid test media' }));
  await page.goto('/media/movie/101-across-the-stars');
  const video = page.locator('.stream-player video');
  await expect(video).toHaveCount(1);
  await video.evaluate(element => { element.setAttribute('data-player-instance', 'original'); });
  await page.getByRole('button', { name: 'More streaming sources' }).click();
  await expect(video).toHaveAttribute('data-player-instance', 'original');
  await expect(page.getByRole('button', { name: 'Retry stream' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry stream' }).click();
  await expect(video).not.toHaveAttribute('data-player-instance', 'original');
});

test('download failure is recoverable and file actions carry no signed URL in measurement', async ({ page }) => {
  await page.route('**/api/download/resolve?*', route => route.fulfill({ status: 503, json: { error: 'Temporarily unavailable' } }));
  await page.goto('/download/private-token');
  await expect(page.getByRole('alert').filter({ hasText: 'Temporarily unavailable' })).toBeVisible();
  await page.route('**/api/download/resolve?*', route => route.fulfill({ json: { title: 'Fixture', url: 'https://example.com/file?secret=123', subtitleUrl: 'https://example.com/sub', quality: '1080p' } }));
  await page.getByRole('button', { name: 'Retry download' }).click();
  await page.route('https://example.com/**', route => route.fulfill({ body: 'Fixture' }));
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: /Download subtitles/ }).click();
  await (await popupPromise).close();
  const events = await page.evaluate(() => (window as unknown as { measurements: { event: string; properties: Record<string, unknown> }[] }).measurements.filter(item => item.event === 'download_link_action'));
  expect(events).toHaveLength(1);
  expect(events[0].properties.kind).toBe('subtitles');
  expect(JSON.stringify(events)).not.toContain('private-token');
  expect(JSON.stringify(events)).not.toContain('secret');
});

for (const path of ['/', '/search', '/genres', '/watchlist']) {
  test(`${path} has no automated accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations).toEqual([]);
  });
}

test('mobile browse stays open and zoom is allowed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Browse categories', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Browse navigation' })).toBeVisible();
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toMatch(/user-scalable=no|maximum-scale=1/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Browse categories', exact: true })).toHaveAttribute('aria-expanded', 'false');
});
