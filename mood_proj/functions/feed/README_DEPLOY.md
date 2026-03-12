# Mood - Appwrite Function: feed (Phase-4)

This function serves the **Home Feed** as a **backend source of truth**.

What it does:
- Stable snapshot + cursor paging (no offset paging)
- Seen-state aware suppression/penalty using `feed_events`
- Mixture-of-sources: following / recommended / trending / explore
- Diversity rerank (creator + mood)

## Deploy in Appwrite Console

1) Open **Functions → feed**
2) **Runtime**: Node.js 22 (or the latest Node runtime)
3) **Entrypoint**: `dist/main.js`
4) **Build command**: leave empty (we ship prebuilt `dist/`)
5) Upload `code.tar.gz` from this folder

## Required database collections

- `posts` (your existing posts collection)
- `follows` (with `followerId`, `followedId`, `status`)
- `feed_events` (telemetry)
- `feed_snapshots` (collection name, used for caching snapshots)

### feed_snapshots schema
Minimum required attributes:
- `userId` (string)
- `sessionId` (string)
- `snapshotId` (string)
- `itemsJson` (string)

Do **NOT** add custom `createdAt`/`expiresAt` unless you want to.
- Appwrite already provides `$createdAt`.
- Snapshot expiry is derived from `$createdAt` + TTL.

## Permissions / Scopes

The function key needs at least:
- `databases.read`, `databases.write`
- `documents.read`, `documents.write`
- `collections.read` (only if the function must discover `feed_snapshots` by name)

Optional: set env `FEED_SNAPSHOTS_COLLECTION_ID` in the Function if you want to avoid `collections.read`.
