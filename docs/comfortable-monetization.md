# CineXP cinematic experience

The public UI reuses selected components from `codex/cinexp-redesign`. This change does not import that branch's database migrations, signing-key changes, deployment requirements, or broader resolver/backend rewrite. Existing URLs, catalog credentials, homepage configuration, watchlists, and progress keys remain compatible.

## Advertising

Global popunder/social-bar scripts, forced ad redirects, countdowns, and full-screen trailer-feed advertising are removed. Public advertising uses the eight stable identifiers in `src/lib/ad-policy.ts`. The homepage counts rendered sections; empty local rows are excluded. Catalogs need at least six results before showing a slot. Search, saved lists, trailer feeds and admin have no placements.

The existing AppSettings table persists the global, download and individual placement switches. No database migration is required. Admin Settings saves all toggles in one transaction and invalidates the public layout. `DISPLAY_ADS_ENABLED=false` overrides every saved switch, including download placements. A settings-read failure prevents network delivery.

The authenticated settings API accepts `action: "update_ads"` with boolean `displayEnabled`, `downloadEnabled`, and an optional complete `placements` map keyed by those eight identifiers. Older clients may omit the map. Unknown fields/placement identifiers are rejected. GET returns saved preferences separately from effective policy so an environment override does not erase preferences. Verify persistence on a disposable database by disabling one placement, saving, reloading Settings and its public page, then checking that the global kill switch also removes download placements.

All placements initially show a quiet house promotion. Only identifiers explicitly listed in the server environment variable `ADS_VERIFIED_PLACEMENTS` request the existing network. Example after verification: `home-primary,catalog-movies`. Do not set this from a public-prefixed variable. Automated browser tests supply fixture ads and a test-only verified list; they do not contact the live ad network.

Each ad owns an opaque-origin iframe with `sandbox="allow-scripts"`, lazy loads within 250px of the viewport, and falls back after eight seconds. No popup, top-navigation, same-origin, or form permissions are granted. Responsive dimensions remain reserved on failure. Slots too narrow for the creative retain the house promotion and do not request a clipped network ad. The network adapter requires live provider approval/testing: many standard creatives require new-window click behavior that this strict sandbox blocks. Such a placement must remain a house promotion unless the network provides a compatible supported integration. Do not add popup permissions just to make a failing creative work. No ad blocker bypass or auto refresh is used.

Before verifying a placement, use network test mode to check attribution/referrer handling, recognized impressions and viewability, advertiser click behavior, mobile sizing and creative quality. No real or incentivized ad clicks should be used for QA. If any requirement fails, leave that placement unverified. The network dashboard is the authority for impressions, fill and money; detecting a rendered iframe is not an impression.

## Playback and downloads

All embedded sources use a fixed sandbox that excludes popup and top-navigation permissions. Provider restrictions never relax on retry. A failed source shows retry/source-selection recovery. Native sources are memoized so menu/share/list interactions do not reinitialize playback; a player retry remounts the Plyr boundary. Progress messages must come from the active frame and origin. Real provider/subtitle/episode compatibility still needs a live preview check.

Download URLs resolve immediately with a bounded request. File and subtitle links are separate explicit actions, and no advertising redirect follows a click. A click is recorded as an action, not a successful file transfer.

## Measurement and the first two weeks

The existing Vercel Analytics integration receives `experience_session`, `playback_attempt`, `playback_started`, `playback_failed`, `download_link_action`, `ad_request` and `ad_load_failed`. Playback start means a native `playing` event or the active trusted provider's `playing` event, never iframe/script load. Providers without supported events have unknown playback outcome. Custom-event reporting depends on the hosting account's analytics feature availability; confirm receipt before using it to make decisions.

Events include `experience=cinematic-v1`; player events use catalog ID, media type and provider, ad events use placement, and download actions use file/subtitle kind. No signed URL, token, raw search query or user ID is sent. Analytics URL middleware redacts signed download paths and removes query strings and fragments; admin events are excluded. Session measurement uses a 30-minute inactivity window and a local returning-visit flag. These are approximate browser sessions, not unique people or cross-device retention. Browser storage restrictions can reduce coverage.

Record the preceding 14 days' revenue, sessions, playback success, return visits, device and country mix if historical data is available. For the first 14 comparable days after release, compare total network revenue and `1000 × network revenue / sessions`, plus playback start/failure rates and returning-session share. Keep the denominator/source consistent. Segment by device and country to avoid attributing traffic changes to placement changes. Do not infer revenue from ad-load events or retention from raw page views. Keep initial density unchanged until sufficient comparable data exists; fix broken/abusive integrations immediately. No scheduler or production release has been created by this implementation.

## Local verification

The isolated-frame tests use the local catalog server's ad fixture/control endpoints and run with one worker. `NEXT_PUBLIC_AD_TEST_ORIGIN=http://127.0.0.1:4010` is accepted only in development; production always ignores it. Keep this flag out of deployed configuration. The fixture server controls rendered, blocked, stalled and adversarial responses without contacting the vendor.

`npm run preview` serves a representative movie catalog at http://127.0.0.1:3000 with real public poster artwork, no production database and no live advertising. The preview notice identifies demo content. Stop it with Ctrl+C before running browser tests, since Next's development build directory supports one server at a time. Production catalog and playback require the existing service configuration.

Use Node.js 24 and `npm ci`, then `npm run test:unit`, `npm run typecheck`, `npm run lint`, and `npm run build`. `PLAYWRIGHT_CHANNEL=msedge npm run test:e2e` uses an installed Edge browser on Windows; otherwise install Playwright Chromium first. The browser suite supplies its own local catalog and no production database. Full-repository lint can report pre-existing errors in untouched backend/admin code; check changed files separately. Admin persistence additionally needs a disposable database with the existing schema and a real authenticated test session. Never point tests at production.
