# SpendTrackX PWA

Minimal PWA to track food spending using React + Vite + TypeScript + Firebase (Auth + Firestore with offline persistence).

## Development

Install deps and run dev server:

1. `npm install`
2. `npm run dev`

## Build & Deploy (Firebase Hosting)

1. `npm run build`
2. `firebase deploy --only hosting`

## Tech Notes / Decisions

- Firebase modular SDK with manual chunk splitting (see `vite.config.ts`) to reduce initial bundle.
- Firestore `Tx` documents validated strictly by security rules (see `firestore.rules`).
- Strong typing via Firestore data converter (`src/lib/converters.ts`).
- Basic service worker provides runtime caching; consider Workbox for hashed asset precache later.
- Keys in config are client-exposed by design; restrict project via Firebase security rules.

## Next Improvements

- Add precache of build assets (Workbox) for true offline-first first-load.
- Add ESLint/Prettier + tests.
- Add pagination for large transaction lists.
