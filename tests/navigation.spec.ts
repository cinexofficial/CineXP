import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page, request }) => {
  await request.post('http://127.0.0.1:4010/ad-fixture-control', { data: { mode: 'rendered' } });
  await page.route('https://image.tmdb.org/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513"><rect width="100%" height="100%" fill="#394832"/></svg>' }));
  await page.route('**/api/cache-version', route => route.fulfill({ json: { version: '0' } }));
});

test('the second home placement follows five rendered sections', async ({ page }) => {
  await page.addInitScript(() => {
    const item = { id: 101, type: 'movie', title: 'Across the Stars', poster_path: null, backdrop_path: null, timestamp: Date.now() };
    localStorage.setItem('cinexp_watchlist', JSON.stringify([item]));
    localStorage.setItem('cinexp_watch_history', JSON.stringify([item]));
  });
  await page.route('**/api/tmdb/recommended?*', route => route.fulfill({ json: { results: [{ id: 102, title: 'A Quiet Morning', media_type: 'movie', poster_path: null, genre_ids: [18], vote_average: 8 }] } }));
  await page.goto('/');
  const secondary = page.locator('[data-placement="home-secondary"]');
  await expect(secondary).toHaveCount(1);
  expect(await secondary.evaluate(element => {
    let count = 0;
    for (let sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      if (sibling.matches('[data-home-section]') && sibling.querySelector('section')) count++;
    }
    return count;
  })).toBe(5);
  await expect(page.locator('[data-placement^="home-"]')).toHaveCount(2);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('client navigation cancels the old ad timeout and starts the next placement independently', async ({ page, request }) => {
  await page.request.get('/movies');
  await page.addInitScript(() => {
    Object.assign(window, { failures: [] });
    window.addEventListener('cinexp:measurement', event => {
      const detail = (event as CustomEvent).detail;
      if (detail.event === 'ad_load_failed') (window as unknown as { failures: string[] }).failures.push(detail.properties.placement);
    });
  });
  await request.post('http://127.0.0.1:4010/ad-fixture-control', { data: { mode: 'stalled' } });
  await page.goto('/');
  const first = page.locator('[data-placement="home-primary"]');
  await first.scrollIntoViewIfNeeded();
  await expect(first.locator('iframe')).toHaveCount(1);
  await request.post('http://127.0.0.1:4010/ad-fixture-control', { data: { mode: 'rendered' } });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('navigation', { name: 'Browse navigation' }).getByRole('link', { name: 'Movies', exact: true }).click();
  await expect(page).toHaveURL('/movies');
  const next = page.locator('[data-placement="catalog-movies"]');
  await next.scrollIntoViewIfNeeded();
  await expect(next.locator('[data-ad-state="rendered"]')).toBeVisible();
  await page.waitForTimeout(8500);
  expect(await page.evaluate(() => (window as unknown as { failures: string[] }).failures)).not.toContain('home-primary');
  await expect(page.locator('[data-placement="home-primary"]')).toHaveCount(0);
});

test('changing episodes never plays the previous episode while new sources resolve', async ({ page }) => {
  let releaseSecond: (() => void) | undefined;
  const second = new Promise<void>(resolve => { releaseSecond = resolve; });
  await page.route('**/api/downloads?*', async route => {
    const episode = new URL(route.request().url()).searchParams.get('episode') || '1';
    if (episode === '2') await second;
    await route.fulfill({ json: { links: [], episodeLinks: [{ id: `episode-${episode}`, label: `Episode ${episode}`, quality: '1080p', size: '', url: `/episode-${episode}.mp4`, isMoviebox: true }] } });
  });
  await page.route('**/episode-*.mp4*', route => route.fulfill({ contentType: 'video/mp4', body: 'invalid fixture media' }));
  await page.goto('/media/tv/201-series-1');
  const video = page.locator('.stream-player video');
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute('src', /episode-1\.mp4/);
  await page.getByRole('combobox', { name: 'Episode', exact: true }).selectOption('2');
  await expect(video).toHaveCount(0);
  await expect(page.getByText('Loading native stream...', { exact: true })).toBeVisible();
  releaseSecond?.();
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute('src', /episode-2\.mp4/);
});

test('trailer frames receive restrictions before the YouTube API attaches', async ({ page, request }) => {
  await request.post('http://127.0.0.1:4010/ad-fixture-control', { data: { trailers: true } });
  await page.route('https://www.youtube.com/iframe_api', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.YT={PlayerState:{PLAYING:1,PAUSED:2,ENDED:0},Player:class{constructor(frame,options){
      if(!frame.getAttribute('sandbox'))throw Error('Unrestricted trailer frame');
      this.frame=frame;setTimeout(()=>options.events.onReady({target:this}),0);
    }getDuration(){return 100}getCurrentTime(){return 0}getIframe(){return this.frame}
    playVideo(){}pauseVideo(){}setPlaybackQuality(){}mute(){}unMute(){}setVolume(){}destroy(){this.frame.remove()}}};window.onYouTubeIframeAPIReady();`,
  }));
  await page.route('https://www.youtube.com/embed/**', route => route.fulfill({ contentType: 'text/html', body: `<button id="attack" onclick="try{window.open('https://example.com/unwanted')}catch{};try{top.location='https://example.com/hijack'}catch{}">Test protection</button>` }));
  const popups: string[] = [];
  page.on('popup', popup => { popups.push(popup.url()); });
  await page.goto('/feed');
  const frame = page.locator('iframe[title$=" trailer"]').first();
  await expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-presentation');
  await expect(frame).toHaveAttribute('src', /enablejsapi=1&origin=/);
  await frame.contentFrame().locator('#attack').evaluate(element => (element as HTMLButtonElement).click());
  await expect(page).toHaveURL('/feed');
  expect(popups).toEqual([]);
  await expect(page.locator('[data-placement]')).toHaveCount(0);
});
