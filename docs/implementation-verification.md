# Implementation verification

Validated locally on Windows with Node.js 24 and Microsoft Edge on 19 October 2026. This is a working-tree implementation and local preview, not a production release.

## Implemented scope

The public routes use the charcoal, warm-white and lime design system, manual featured-title controls, responsive discovery, labeled mobile navigation and reduced-motion support. Homepage ordering, visibility and preferred-source inputs remain connected to the existing configuration. Existing URL formats, watchlist keys and viewing-progress storage are preserved.

Global advertising scripts, forced download advertising redirects, download countdowns and trailer-feed ad slides are removed. Eight stable display placements use independent lazy-loading frames, bounded timeouts and reserved responsive dimensions. Persistent settings use the existing settings API/table, with per-placement controls and a global environment kill switch. Unverified placements show house promotions; no live vendor placement is enabled by this implementation.

Streaming and trailer frames receive a shared fixed sandbox without popup or top-page navigation permission. Trailer frames are restricted before insertion, then attached to the YouTube API using its existing-frame interface. The main player preserves its instance during menu interactions, remounts on retry and prevents the previous episode from remaining active while new sources resolve. Downloads expose separate immediate file and subtitle actions.

Selected UI, playback and regression work was reused from `codex/cinexp-redesign`. The branch's broader backend, database migrations, signing-secret changes and deployment requirements were not merged.

## Evidence

- The mobile browser suite passed all 30 cases. Six targeted desktop regressions also passed. These cover ad failures/timeouts, navigation cleanup, player retries, source identity, episode changes, direct downloads, saved titles, keyboard focus, narrow layouts, reduced motion and automated accessibility checks.
- Final focused desktop/mobile checks passed saved-list persistence and a returning homepage with both ad placements. That homepage also passes Axe with populated local history and a missing-artwork recommendation.
- Four final player-policy checks passed across desktop/mobile: trusted main-player messages and pre-restricted trailer frames, including attempted popups and top-page navigation. The trailer check uses a local YouTube API stub, not live YouTube playback.
- Six final ad checks passed across desktop/mobile for popup protection, timeout stability and resizing between 320px/390px. Narrow slots make no network request until the creative fits and return to the house promotion when resized smaller.
- Visual captures at 1440px desktop and 390px mobile were inspected. A separate 320px layout check confirms no horizontal overflow and that the primary hero action clears the fixed navigation. The preview makes no live ad requests.
- Five unit checks passed for ad-policy overrides and measurement URL redaction.
- Lint over all 71 changed/new code files passed with zero errors and 30 warnings. Full-application lint still has errors in untouched backend/admin code; it is not reported as clean.
- The final production build passed, including TypeScript and generation of 33 static pages. The build intentionally omitted database/catalog credentials and verified network placements; missing-TMDB and sitemap database-fallback messages are expected in this isolated check. It does not establish live catalog, sitemap or database integration.
- `git diff --check` passed. Build-generated service-worker files were restored to their tracked versions; normal builds regenerate them.

Browser tests use local catalog, ad and player fixtures. The early interrupted desktop run is not represented as a complete desktop-suite pass. Browser traces and logs are local ignored artifacts under `.cache` / `test-results`.

## Integration checks before release

1. Verify authenticated admin toggle persistence against a disposable database with the existing schema, including reloads and global/download overrides. The local demo does not connect to the production database.
2. Check actual catalog sources, native playback, embedded providers, subtitles, episode changes and progress restoration on supported browsers. A fixture load or an iframe `load` event does not establish successful live playback.
3. Keep `ADS_VERIFIED_PLACEMENTS` empty until each provider-supported integration passes recognized delivery/viewability and supported test-click checks without relaxing the sandbox. Strict isolation may make the current network incompatible. Disable incompatible placements.
4. Confirm that hosting analytics accepts the custom events and sanitized URLs. Use network-reported impressions and revenue, together with comparable session counts, for the 14-day analysis in [comfortable monetization](comfortable-monetization.md).

No deployment, live ad-click exercise, production settings change or recurring task was performed. Revenue and retention effects remain unmeasured.
