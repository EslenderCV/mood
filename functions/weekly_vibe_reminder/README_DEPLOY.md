# Mood - Appwrite Function: weekly_vibe_reminder (MVP)

Envía un **recordatorio** si han pasado ~16h desde que se publicó el Weekly Vibe y el usuario aún no lo ha visto.

## Deploy (Appwrite Console)

1) Functions → Create function → `weekly_vibe_reminder`
2) Runtime: Node.js 22
3) Entrypoint: `dist/main.js`
4) Build command: vacío
5) Upload `code.tar.gz`

Scopes:
- databases.read
- databases.write

## Schedule

Lunes 12:00 PM (16h después del Domingo 8PM).
- Cron sugerido: `0 12 * * 1` (ajusta timezone si tu Appwrite usa UTC)

## Requisitos de DB

En `weekly_vibes`:
- `seenAt` (datetime, opcional)
- `consumedAt` (datetime, opcional)

> Nota: el timing (16h/24h) se calcula por `$createdAt`.

Lógica:
- now - publishedAt >= 16h
- now < expiresAt
- seenAt == null
- consumedAt == null
