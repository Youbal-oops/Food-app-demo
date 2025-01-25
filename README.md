# Delivr

An editorial, mobile-first food ordering demo built with React, TypeScript and Vite, with a Capacitor Android project.

Atelier 03 is a sculptural, mobile-first storefront: a custom copper-and-travertine campaign poster, three detailed Three.js food models, an ingredient inspector with animated separated layers, and an interactive 3D kitchen-to-door ordering film. Ivory paper, dimensional cards, olive accents and restrained typography give the food room to be the spectacle. Motion respects `prefers-reduced-motion`.

## Start here

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. Browse without signing in. Add a dish, open the bag, apply `HELLO20`, and place a demo order. At checkout, search for a Chandigarh location, choose a landmark, or tap the map to pin the door. The film follows receiving, prep, flame cooking, plating, handoff, a chase-camera ride and the dining table. Pause, skip scenes, replay, toss the pan, change the heat, and lift the dining cloche. Open Owner to enter the command center; its order actions and availability switches update the same local store. Use the public demo credentials `owner@delivr.demo` / `atelier`, or click **Fill demo credentials**.

## Working features

- Search, category and vegetarian filters, price/rating sorting, saved favourites, dish details and ingredient lists.
- Persistent bag, profile, address and order history, with validation when browser storage is restored.
- Quantity limits, unavailable-dish enforcement, free delivery from ₹499, and a 20% discount capped at ₹100.
- Three signature dishes: Butter Chicken, Paneer Tikka and Chicken Biryani. Open a dish to orbit its model, zoom, separate ingredient layers, or add it to your bag. Models use local procedural geometry, materials and textures; no model downloads or API keys are needed.
- A real Three.js kitchen with an animated knife, pan, flame, steam, plating, packaging and dining table. Camera framing changes with each cooking chapter; pan-toss, heat and cloche controls let you join in.
- Checkout, reorder and route-aware delivery simulation.
- An owner command center with a local demo login, period-based KPIs, inspectable revenue charts, order queues, menu availability and a keyboard command palette (`Ctrl`/`Cmd` + `K`). Metrics derive from actual local orders, including the empty state.
- Offline application caching after a successful production visit. Twelve original SVG food illustrations are bundled as fallbacks for remote Unsplash imagery. System fonts remain usable when Google Fonts is unavailable.
- Installable web manifest and branded Android icons and splash screen.

This is a **local demo**: no backend authentication, payment processing, real dispatch or cross-device synchronization. Customer ratings and food data are sample content. The owner login is a public local demo gate, not secure authentication or a protected backend. Orders and profile data stay in localStorage on the current device. Location searches are sent to Photon, route coordinates to OSRM, and visible map tiles are loaded from OpenStreetMap.

## Chandigarh journey

The kitchen starts at a fictional location near Sector 17. Search is bounded to the Chandigarh area; you can also place a precise destination pin using the map (keyboard arrows move it; Enter confirms). The address text and the chosen pin are shown separately, so check both before ordering.

Road geometry comes from [OSRM](https://project-osrm.org/docs/v5.5.1/api/); address lookup uses [Photon](https://github.com/komoot/photon). Both are public demo services with no availability guarantee. If routing is unavailable, the customer must explicitly choose an illustrated direct path. That path is labelled and never presented as road navigation. Map tiles follow the [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/), display attribution, load only the current viewport and are excluded from service-worker precaching. Search and new road routing require an internet connection; saved route geometry and locally bundled scenes work offline.

The chase camera follows the saved route, with distance-weighted movement and procedural, stylised streets. Buildings are scenery, not a surveyed 3D reconstruction. Speed, cooking and delivery progress are a simulation. For a public high-traffic deployment, configure dedicated geocoding, routing and tile services.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on :5173 (LAN-reachable for phone testing) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (jsdom, Testing Library); tests live in `src/**/*.test.ts(x)` |
| `npm run build` | Typecheck + production bundle in `web-dist/` |
| `npm run cap:sync` | Build, then copy `web-dist/` into the Android project |
| `npm run android:doctor` | Report whether JDK / Android SDK are available locally |
| `npm run android:debug` | Build + sync + `gradlew assembleDebug`, copies APK to `release/delivr-debug.apk` |
| `npm run android:open` | Open the project in Android Studio |

## Android APK

Config: `capacitor.config.ts` (appId `app.delivr.food`, webDir `web-dist`). The native project is committed under `android/`.

**Locally** you need Node 22+, JDK 21, and the Android SDK (platform 36, build-tools) with `ANDROID_HOME` set, then `npm run android:debug`.

**Without a local toolchain**: the GitHub Actions workflow `.github/workflows/android-apk.yml` runs typecheck, tests, build, and `assembleDebug`, then uploads the `delivr-debug-apk` artifact (Actions run → Artifacts). It runs on pushes to `main`, pull requests, and manual dispatch. The workflow must be pushed to GitHub before it can run.

The debug APK is signed with the debug keystore and is for sideloading/testing only. A Play Store release needs a release keystore and `assembleRelease`/`bundleRelease`.

**Current validation:** 141 tests pass, TypeScript checks pass, and the production bundle builds. All 32 service-worker precache files exist. Automated checks cover the state model, customer ordering, owner metrics and controls, journey sequencing, food geometry and GPU-resource disposal. Run the commands below for the current result. No APK was compiled in this workspace: JDK and Android SDK are absent. The local Capacitor sync attempt also encounters an OS user-info error from its terminal helper. The CI workflow has not been executed. Browser visual QA and on-device Android QA remain to be run. Live Photon/OSRM requests could not be exercised in this sandbox (network EACCES); geocoder/routing responses, failures, pin validation and fallback are covered with controlled test responses.

## Checks

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Tests cover corrupted storage, quantity bounds, discounts, availability, checkout snapshots, status transitions, search/filter composition, favourites across reloads, dialogs, profile editing, delivery simulation and kitchen integration.

Three.js uses capped pixel ratios, offscreen/document visibility pausing, local illustrated fallbacks if WebGL is unavailable, and explicit geometry/material/texture cleanup. The three menu viewers unmount while a dish inspector is open to keep mobile GPU usage bounded.

Manual visual checks: 320px, 390px, tablet and desktop widths; orbit/explode each food model; all 3D cooking phases; WebGL fallback; keyboard focus and Escape in dialogs; reduced-motion preference; offline reload after a production visit; Android safe areas and back navigation.

## Layout

- `index.html` - Vite entry, loads `/src/main.tsx`
- `src/App.tsx` - storefront, accessible dialogs, bag, account and delivery UI
- `src/CinematicHero.tsx`, `src/atelier.css` - editorial poster, responsive storefront and dimensional surfaces
- `src/food-models.ts`, `src/FoodSculpture.tsx`, `src/DishInspector.tsx` - procedural Three.js dishes, accessible viewer and ingredient annotations
- `src/OrderJourney.tsx`, `src/KitchenTheater.tsx`, `src/DriverScene.tsx` - sequenced kitchen and delivery film
- `src/ChandigarhMap.tsx`, `src/journey.ts` - pin selection, geocoding, routing and geographic validation
- `src/domain.ts` - typed state reducer, totals and persistence validation
- `src/Admin.tsx` - lazy-loaded owner login, metrics, commands and operations
- `src/styles.css`, `src/admin.css` - responsive design and motion
- `src/*.test.ts(x)` - domain and user-flow regression tests
- `public/` - bundled artwork, icons and web manifest
- `android/` - Capacitor Android project (build output ignored)
- `scripts/` - APK helper, offline build plugin, deterministic artwork/icon generators, test setup

The original wireframe entry and tracked compiled files were removed. `web-dist/` is generated and ignored; always build before syncing Android assets.
