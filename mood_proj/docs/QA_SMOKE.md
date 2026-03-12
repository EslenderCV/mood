# QA Smoke Pack (Phase 15)

This is a minimal, practical QA gate you can run before creating an EAS build.

## 1) One-command QA

```bash
npm run qa:smoke
```

Runs:
- `expo lint`
- `tsc --noEmit`
- `jest` (CI mode)

## 2) Recommended manual smoke (5 minutes)

1. **Home**: open app → pull-to-refresh → scroll 10s → play audio → like/comment.
2. **Explore**: search → switch tabs → play a Daily Pick.
3. **Profile**: open a user profile from a post.
4. **Settings → Security → Delete account**: ensure it routes to the dedicated screen; type the confirmation word but cancel on the final alert.
5. **Offline**: toggle airplane mode and ensure the banner appears/disappears.
