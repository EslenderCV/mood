# Appwrite Function: password-reset

This function updates the authenticated user's password using the **Users** API, which does **not** require knowing the old password.

## What it solves
- Your in-app OTP verification logs the user in, but `account.updatePassword(...)` requires `oldPassword`.
- After migration, you can assume `oldPassword` is `Mood.2026!` only once.
- With this function, users can reset their password multiple times without knowing the old one.

## Setup (Appwrite Console)
1. Go to **Functions** → **Create function**.
2. Runtime: **Node.js** (any recent version).
3. Deploy this folder (`index.js` and `package.json`).
4. Create an **API Key** with at least **Users.write**.
5. In the Function's **Variables**, set:
   - `APPWRITE_FUNCTION_API_KEY` = your API key
   - (Optional) if not already provided by runtime: `APPWRITE_FUNCTION_ENDPOINT`, `APPWRITE_FUNCTION_PROJECT_ID`
6. In **Function settings**, allow execution for authenticated users (e.g. Role: `users`).

## App config
Set in your app `.env`:

```
EXPO_PUBLIC_APPWRITE_PASSWORD_RESET_FUNCTION_ID=<your function id>
```

