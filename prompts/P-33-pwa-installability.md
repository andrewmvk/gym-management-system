Blocked by: none
Covers: NFR-7
MVP: 6
Artifacts: apps/web/src/app/manifest.ts, apps/web/src/app/{icon-192.png,icon-512.png,icon-512-maskable.png}/route.tsx, apps/web/src/app/apple-icon.tsx, apps/web/src/lib/app-icon.tsx, apps/web/src/app/layout.tsx (appleWebApp metadata, viewportFit)
Evidence: manifest served at /manifest.webmanifest with the three required icon sizes; each icon route renders the existing brand mark at the right size (maskable icon padded to the ~80% safe zone); the rendered page's <head> carries <link rel="manifest">, <link rel="apple-touch-icon">, and the mobile-web-app-capable/apple-mobile-web-app-* meta tags - all checked directly in the running stack

Task: make the member/staff web app installable to a phone's home screen as a Progressive Web App (NFR-7), reusing the existing brand mark rather than new artwork.

Context:
- NFR-7 in docs/02-requirements.md (added by this prompt, audit-log item 32): a valid web app manifest and icons, served over HTTPS, is what Chrome/Safari need to offer "Add to Home Screen" and launch the app standalone (no browser chrome). No service-worker offline caching or push notifications are required - this prompt is about installability only.
- Next.js (this project's version) supports the manifest and icons as special file conventions under app/: `app/manifest.ts` (returns a `MetadataRoute.Manifest`), `app/apple-icon.tsx` (an `ImageResponse`), and arbitrary dotted route folders like `app/icon-512.png/route.tsx` for icon URLs the manifest can reference directly.
- The brand mark already exists as `BrandMark` in `apps/web/src/components/brand.tsx` - two skewed bars in `var(--stripe)` (cobalt) and `var(--tape)` (pace yellow) on a 24x24 viewBox. `ImageResponse`/Satori does not resolve CSS custom properties, so the icon generator resolves those two tokens plus the dark `--kit` background to literal hex once (`apps/web/src/lib/app-icon.tsx`) rather than guessing new brand colors.

Permitted scope:
- Only the files in Artifacts, plus docs/02-requirements.md (NFR-7, Out of Scope), docs/07-mvp-roadmap.md (MVP 6) and docs/09-audit-log.md (the decision record) - confirmed with the developer before any doc was changed, per AGENTS.md's "Keeping docs in sync" rule, since NFR-4 and the Out of Scope list previously excluded this.
- No new npm dependencies: icons are generated with `next/og`'s `ImageResponse`, already part of Next.js.
- No service worker, no offline caching, no push notifications (explicitly out of scope, see the new Out of Scope lines) - a later prompt can add Serwist-based offline caching if ever asked for.

Functional requirements:
1. `app/manifest.ts` returns name, short_name, description, start_url "/", display "standalone", background/theme color matching the brand's dark panel color, and three icons: 192x192 and 512x512 (`purpose: "any"`) plus a 512x512 `purpose: "maskable"` variant scaled down to survive a circular/squircle OS crop.
2. The three icon sizes and the Apple touch icon (180x180) are generated from one shared helper so the mark and colors can't drift between them.
3. The root layout's metadata gains `appleWebApp: { capable: true, title: "Cadence", statusBarStyle: "black-translucent" }` and the viewport gains `viewportFit: "cover"`, so an installed iOS app launches standalone and respects the notch/home-indicator safe area.

Acceptance criteria:
- `/manifest.webmanifest` returns valid JSON with all three icons at the URLs the manifest declares.
- Each icon route renders the same two-stripe mark and dark background as the header's `BrandMark`, not placeholder art.
- The page `<head>` includes `link[rel=manifest]`, `link[rel=apple-touch-icon]`, `meta[name=mobile-web-app-capable]`, and the two `apple-mobile-web-app-*` tags.

Tests:
- No automated test framework covers generated metadata routes in this project; verified manually in the running Docker stack (rebuilt image): fetched the manifest and each icon URL directly, and inspected the rendered page's `<head>` via the browser's own DOM.

Final response:
- Files created: `apps/web/src/lib/app-icon.tsx`, `apps/web/src/app/manifest.ts`, `apps/web/src/app/apple-icon.tsx`, three `icon-*.png/route.tsx` files.
- Files changed: `apps/web/src/app/layout.tsx` (appleWebApp, viewportFit).
- Docs changed (confirmed with the developer first): `docs/02-requirements.md` (NFR-7, Out of Scope), `docs/07-mvp-roadmap.md` (MVP 6), `docs/09-audit-log.md` (item 32), `docs/08-traceability-matrix.md`, `prompts/README.md`.
- Verified manually in the running Docker stack: manifest JSON, all three icon images, and the `<head>` tags.
- Pending: MVP 6's second half (a free-tier public HTTPS deployment) - installability can't be fully exercised on a phone until the app is reachable outside `localhost`.
