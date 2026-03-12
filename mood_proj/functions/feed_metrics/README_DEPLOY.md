# Mood — Appwrite Function: feed_metrics

**Purpose**: Aggregate `feed_events` into daily per-user metrics and store them in `feed_metrics_daily`.

## 1) Create collection: `feed_metrics_daily`
In **Databases → (your DB) → Create table**
- **ID**: `feed_metrics_daily`
- **Permissions**: allow your function API key role to `rows.write` and `rows.read`.

### Columns
Create these columns (names are exact):
- `day` (string, required, size 16) — e.g. `2026-02-06`
- `userId` (string, required, size 128) — Appwrite user doc id
- `windowStartMs` (integer, required)
- `windowEndMs` (integer, required)
- `updatedAtMs` (integer, required)
- `metricsJson` (string, required, size 100000)

### Indexes (recommended)
- `day_user` index: (day, userId)

## 2) Create function: `feed_metrics`
Runtime: **Node.js 22**

### Entry point
`dist/main.js`

### Install command
Leave empty (we ship compiled dist). No `npm i` needed.

### Environment variables (Function → Settings → Variables)
- `APPWRITE_ENDPOINT` = `https://cloud.appwrite.io/v1` (or your endpoint)
- `APPWRITE_PROJECT_ID` = your project id
- `APPWRITE_API_KEY` = API key with scopes: `databases.read`, `documents.read`, `documents.write`
- `APPWRITE_DATABASE_ID` = your database id

Optional:
- `FEED_EVENTS_COLLECTION_ID` = `feed_events`
- `FEED_METRICS_COLLECTION_ID` = `feed_metrics_daily`

## 3) Test execution (Console)
Body:
```json
{ "day": "2026-02-06" }
```

If you want only your user:
```json
{ "day": "2026-02-06", "userId": "<YOUR_USER_DOC_ID>" }
```

You’ll see logs like:
- `metrics: window=... users=... events=...`
- `upserted metrics doc ...`

## 4) Scheduling (optional)
If you want it automatic, set a schedule to run once per day (UTC) and pass:
```json
{ "day": "YYYY-MM-DD" }
```
Or just run it without a body to aggregate **today (UTC)**.
