import { expect, test } from "@playwright/test";

const picture =
  '<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513"><rect width="100%" height="100%" fill="#394832"/></svg>';

test.beforeEach(async ({ page, request }) => {
  await request.post('http://127.0.0.1:4010/ad-fixture-control', { data: { mode: 'rendered' } });
  await page.route("https://image.tmdb.org/**", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: picture }),
  );
  await page.route("**/api/cache-version", (route) =>
    route.fulfill({ json: { version: "0" } }),
  );
  await page.route("**/ad-fixture/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `document.body.insertAdjacentHTML('beforeend', '<a href="https://example.com/sponsor">Test advertisement</a>');`,
    }),
  );
});

test("featured titles change deliberately and link to the selected title", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Across the Stars",
  );
  await page.getByRole("button", { name: "Next featured title" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Series 1");
  await expect(
    page.getByRole("link", { name: "Explore title", exact: true }),
  ).toHaveAttribute("href", "/media/tv/201-series-1");
  await page
    .getByRole("button", { name: "Feature Across the Stars", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Across the Stars",
  );
});

test("saved titles persist across navigation and can be removed from the list", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Save Across the Stars to my list",
      exact: true,
    })
    .first()
    .click();
  await expect(
    page
      .getByRole("button", {
        name: "In my list. Remove Across the Stars from my list",
        exact: true,
      })
      .first(),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/watchlist");
  await expect(
    page.getByRole("heading", { name: "Across the Stars", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Remove Across the Stars from my list",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Good stories are worth saving." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Good stories are worth saving." }),
  ).toBeVisible();
});

test("search cancels stale results, handles empty queries, and recovers from failures", async ({
  page,
}) => {
  await page.goto("/search");
  const field = page.locator(".cx-search-field input");
  await field.fill("Across");
  await expect(
    page.getByRole("heading", { name: "Across the Stars", exact: true }),
  ).toBeVisible();
  await field.fill("not a real title");
  await expect(
    page.getByRole("heading", { name: "No plot twist here." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(
    page.getByRole("heading", { name: "Start with a story you love." }),
  ).toBeVisible();
  await page.route("**/api/tmdb/search?*", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await field.fill("Across");
  await expect(
    page.getByRole("heading", { name: "A brief intermission." }),
  ).toBeVisible();
  await page.unroute("**/api/tmdb/search?*");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Across the Stars", exact: true }),
  ).toBeVisible();
});

test("mobile navigation exposes all categories and does not overflow narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open navigation" });
  await menu.click();
  await expect(
    page
      .getByRole("navigation", { name: "Browse navigation" })
      .getByRole("link", { name: "Series", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await menu.click();
  await page
    .getByRole("navigation", { name: "Browse navigation" })
    .getByRole("link", { name: "Genres", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "What’s your kind of story?",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("download links are ready immediately and never redirect the original page to ads", async ({
  page,
}) => {
  await page.route("**/api/download/resolve?*", (route) =>
    route.fulfill({
      json: {
        url: "https://example.com/test-download",
        title: "Across the Stars",
        quality: "1080p",
        size: "2 GB",
        subtitleUrl: "https://example.com/subtitles",
      },
    }),
  );
  await page.route("https://example.com/**", (route) =>
    route.fulfill({ body: "Download fixture" }),
  );
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/download/test-token");
  await expect(
    page.getByRole("heading", { name: "Ready when you are." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Download subtitles/ }),
  ).toBeVisible();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: /Download file/ }).click();
  const popup = await popupPromise;
  await popup.close();
  await page.waitForTimeout(1800);
  await expect(page).toHaveURL(/\/download\/test-token$/);
  expect(requests.some((url) => /eagerdazzle|quge5/.test(url))).toBe(false);
});

test("display ads are labeled and isolated from the main document", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const ad = page.getByRole("complementary", {
    name: "Advertisement",
    exact: true,
  });
  await ad.scrollIntoViewIfNeeded();
  await expect(ad.getByText("Advertisement", { exact: true })).toBeVisible();
  const frame = ad.locator("iframe");
  await expect(frame).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  await expect(
    frame.contentFrame().getByText("Test advertisement"),
  ).toBeVisible();
  const before = await ad.boundingBox();
  await request.post('http://127.0.0.1:4010/ad-fixture-control', { data: { mode: 'blocked' } });
  await page.route("**/ad-fixture/**", (route) =>
    route.abort(),
  );
  await page.reload();
  await ad.scrollIntoViewIfNeeded();
  await expect(ad).toBeVisible();
  expect((await ad.boundingBox())?.height).toBe(before?.height);
});

test("reduced motion disables decorative animation and keeps controls available", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const duration = await page
    .locator(".cx-hero-content")
    .evaluate((element) =>
      parseFloat(getComputedStyle(element).animationDuration),
    );
  expect(duration).toBeLessThan(0.01);
  await page.getByRole("button", { name: "Next featured title" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Series 1");
});

test("title detail keeps playback choices accessible and opens downloads in the same tab", async ({
  page,
}) => {
  await page.route("**/api/downloads?*", (route) =>
    route.fulfill({
      json: {
        links: [
          {
            id: "fixture",
            label: "Fixture download",
            quality: "1080p",
            size: "2 GB",
            url: "https://example.com/file",
          },
        ],
        movieboxLinks: [],
        episodeLinks: [],
      },
    }),
  );
  await page.route("**/api/download/create", (route) =>
    route.fulfill({ json: { token: "fixture-token" } }),
  );
  await page.route("**/api/download/resolve?*", (route) =>
    route.fulfill({
      json: {
        url: "https://example.com/file",
        title: "Across the Stars",
        quality: "1080p",
        size: "2 GB",
      },
    }),
  );
  const popups: string[] = [];
  page.on("popup", (popup) => popups.push(popup.url()));
  await page.goto("/media/movie/101-across-the-stars");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Across the Stars",
  );
  await expect(
    page.getByRole("link", { name: "Start watching", exact: true }),
  ).toHaveAttribute("href", "#watch");
  await expect(
    page.getByRole("button", { name: "Native", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "More streaming sources" }).click();
  await expect(
    page.getByRole("button", { name: "Stream 7", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: /Fixture download/ }).click();
  await expect(page).toHaveURL(/\/download\/fixture-token$/);
  await expect(
    page.getByRole("heading", { name: "Ready when you are." }),
  ).toBeVisible();
  expect(popups).toHaveLength(0);
});

test("random discovery traps focus in a dismissible dialog", async ({
  page,
}) => {
  await page.route('**/api/tmdb/random', route => route.fulfill({ json: { id: 101, title: 'Across the Stars', media_type: 'movie', poster_path: null, url: '/media/movie/101-across-the-stars' } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Surprise me", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Leave it to chance." });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Explore title", exact: true }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Close selection" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Pick another" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("a movie and series with the same numeric id remain separate saved titles", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "cinexp_watchlist",
      JSON.stringify([
        {
          id: 101,
          type: "movie",
          title: "Saved movie",
          poster_path: null,
          backdrop_path: null,
          timestamp: 1,
        },
        {
          id: 101,
          type: "tv",
          title: "Saved series",
          poster_path: null,
          backdrop_path: null,
          timestamp: 1,
        },
      ]),
    ),
  );
  await page.goto("/watchlist");
  await page
    .getByRole("button", {
      name: "Remove Saved movie from my list",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saved movie", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Saved series", exact: true }),
  ).toBeVisible();
});

test('the trailer feed offers a useful recovery path when no clips are available', async ({ page }) => {
  await page.goto('/feed');
  await expect(page.getByRole('heading', { name: 'Find your next obsession.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore movies', exact: true })).toHaveAttribute('href', '/movies');
  await expect(page.getByRole('complementary', { name: 'Advertisement', exact: true })).toHaveCount(0);
});
