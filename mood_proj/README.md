# Mood — Social Music Network (Expo / React Native)

Mood is a mobile social network focused on sharing music: posts with track previews, comments, follows, stories, chat, and discovery.

> This repo uses **Expo SDK 54**, **TypeScript**, and **expo-router** with a feature-first architecture.

---

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Run (Expo Go)

```bash
npm start
```

### 3) If Expo Go gets stuck “loading” (recommended first fix)

```bash
npm run start:clear
```

Then fully close Expo Go (kill the app) and open the project again.

---

## Scripts

| Command               | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm start`           | Start Metro bundler                            |
| `npm run start:clear` | Start Metro with clean cache (`expo start -c`) |
| `npm run android`     | Run on Android (dev client / native)           |
| `npm run ios`         | Run on iOS (dev client / native)               |
| `npm run web`         | Run on web                                     |
| `npm run test`        | Jest watch mode                                |
| `npm run test:ci`     | Jest single run                                |
| `npm run lint`        | Lint                                           |
| `npm run typecheck`   | TypeScript check                               |
| `npm run qa:smoke`    | Lint + typecheck + tests (CI gate)             |

---

## Architecture (important)

### Routing-only `app/` (expo-router)

The `app/` folder must stay **routing-only**: each route file should be a thin wrapper that re-exports the real screen.

- See: `docs/ARCHITECTURE.md`

### Feature-first modules

All UI + logic lives in `src/`:

- `src/app/` — layout implementations and global providers used by `app/*/_layout.tsx`
- `src/features/` — screens + feature logic (home, explore, post, chat, profile, settings…)
- `src/ui/` — Design System v1 primitives (Text, Button, Card, Divider, Screen…)
- `src/design/` — semantic tokens (colors/spacing/typography), motion/haptics helpers (evolves over phases)
- `lib/appwrite/` — Appwrite client wrappers (auth, posts, users, chats, storage…)

**Hard rules (non-negotiable):**

1. **No business logic** in `app/`.
2. Prefer `src/ui/primitives/*` + `src/design/tokens.ts` for new UI (no new hardcoded spacing/colors).
3. Audio will be centralized under a single engine (see `context/AudioContext.tsx` — enforced in a later phase).

---

## Theme (System / Light / Dark)

Mood supports:

- **System**
- **Light**
- **Dark**

### Where it lives

- Provider: `src/ui/theme/ThemeProvider.tsx`
- Tokens: `src/design/tokens.ts`
- Preference storage key: `mood.theme.preference` (AsyncStorage)

### How to use in code

```ts
import { useTheme } from "@/src/ui/theme/ThemeProvider";

const { scheme, colors } = useTheme();
```

In the app, go to:
**Settings → Appearance**

---

## Backend (Appwrite)

Mood uses **Appwrite** via `react-native-appwrite`.

### Config location

`lib/appwrite/config.ts`

It contains:

- endpoint
- projectId
- databaseId
- collection ids (users, posts, comments, chats, messages, etc.)

> If you fork this project and use your own Appwrite project, update these IDs accordingly.

---

## Troubleshooting

### Expo Go loads but UI never starts

1. Clear Metro cache:

```bash
npm run start:clear
```

2. Kill Expo Go completely and reopen.
3. Ensure you have internet access (auth boot depends on the backend).

### Type errors / weird RN API mismatch

Make sure dependencies are installed from the lockfile:

```bash
npm ci
```

---

## Contributing guidelines (internal discipline)

- New screens belong in `src/features/<feature>/`.
- Shared UI belongs in `src/ui/` (primitives) or feature-local components.
- Avoid “god screens” (800+ line components). Prefer small focused modules.
- Keep animations on the UI thread (Reanimated) when performance matters.

---

## License

Private project (set your license if/when you open-source).
