# Phase 3 — Server feed (Appwrite Functions)

This app can run Home feed in **server mode** (backend is the source of truth for ranking + pagination).

## Where it is configured
- `lib/appwrite/config.ts` → `serverHomeFeed`
- Optional Expo env overrides (public):
  - `EXPO_PUBLIC_SERVER_HOME_FEED=1`
  - `EXPO_PUBLIC_APPWRITE_FEED_FUNCTION_ID=...`
  - `EXPO_PUBLIC_APPWRITE_FEED_EVENTS_FUNCTION_ID=...`

See `.env.example`.

## What changes in server mode
- Home feed order is **not** reordered by the local Brain (`brainRankingHome` is forced OFF).
- The app reads the ranked pages from your deployed Function:
  - **feed**: `69851d10000d231b66b3`
- Feed events are batched and sent to:
  - **feed_events**: `6985241c000f43efd797`
- Specials/modules are still injected with the same cadence as before.

## Quick sanity test
1) Open the app and go to Home.
2) Pull to refresh.
3) Scroll down to trigger pagination.

If Functions are reachable, Home will load even if the local posts query fails.
