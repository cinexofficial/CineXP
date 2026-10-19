# CineXP

Cinematic movie and series discovery with responsive navigation, saved titles, playback progress, direct download actions and restrained display placements.

Use Node.js 24. Install with `npm ci`, then run `npm run preview` for a demo at http://127.0.0.1:3000. This preview uses sample catalog data and public movie artwork; it never connects to the production database or live advertising. Use `npm run dev` with the existing service configuration for integrated development.

Network ads are unverified by default. Read [comfortable monetization](docs/comfortable-monetization.md) before enabling placements or releasing. It documents the admin settings interface, hosting kill switch, measurement definitions, live verification limits and the first two weeks' comparison.

Checks: `npm run test:unit`, `npm run typecheck`, `npm run lint`, `npm run test:e2e`, and `npm run build`. On Windows with Edge installed, set `$env:PLAYWRIGHT_CHANNEL='msedge'` before browser tests. Stop the preview before those tests.

## Service configuration

Keep the existing database, TMDB, authentication and catalog/source configuration for integrated development. The demo preview deliberately omits the database and uses local catalog fixtures. Database-backed admin settings and third-party playback need separate integration verification.

Set `DISPLAY_ADS_ENABLED=false` to remove every placement. Network requests require an explicitly verified placement in `ADS_VERIFIED_PLACEMENTS`; leave it empty until the provider integration passes live verification. Never enable popup permissions to restore a failing placement.

See [implementation verification](docs/implementation-verification.md) for the checks performed and remaining release checks.
