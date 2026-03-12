# Mood - Appwrite Function: weekly_vibe_generate (MVP)

Genera el **Weekly Vibe** para usuarios activos y envía:
- Push notification (Expo)
- Notificación in-app (colección `notifications`)

## Deploy (Appwrite Console)

1) Functions → **Create function** → Name: `weekly_vibe_generate`
2) Runtime: **Node.js 22**
3) Entrypoint: `dist/main.js`
4) Build command: *(vacío)*
5) Upload el `code.tar.gz` de esta carpeta (o sube la carpeta completa si tu consola lo permite).
6) Permissions/Scopes requeridos (API key del function):
   - `databases.read`
   - `databases.write`

## Schedule

Programar para **Domingo 8:00 PM** (tu zona horaria).
- Cron sugerido (si tu Appwrite usa timezone local configurado): `0 20 * * 0`
- Si tu Appwrite usa UTC, ajusta a tu UTC local.

## Requisitos de DB

Colección: `weekly_vibes` (ID = `weekly_vibes`)
Atributos mínimos existentes:
- `userId` (string)
- `weekStart` (datetime o string ISO)
- `topMood` (string)
- `topArtist` (string)
- `totalPosts` (integer)
- `vibeColor` (string)

Atributos nuevos (para lifecycle):
- `seenAt` (datetime, opcional)
- `consumedAt` (datetime, opcional)
- `consumedAction` (string, opcional)

> Nota: el window de 24h se calcula por `$createdAt` (no necesitas `publishedAt/expiresAt` para el MVP).

Recomendado (index):
- `userId` + `$createdAt`
- `userId` + `weekStart`

## Qué hace

- Calcula la semana como: `now - 7 días` → `now`
- Cuenta posts por usuario en ese rango (campo `datePosted`)
- Saca:
  - `topMood` desde `songData.mood.emoji` (si no existe: 🎵)
  - `topArtist` desde `songData.artist` (si no existe: "—")
  - `totalPosts`
- Crea un doc en `weekly_vibes` con TTL de **24h**
- Envía push: `"/home?weeklyVibe=1"`
