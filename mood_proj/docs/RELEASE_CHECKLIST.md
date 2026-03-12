# Mood — Checklist de Release (App Store / Play Store)

Esta guía es el paso-a-paso para generar builds **Preview** y **Production** con EAS.

## 1) Antes de build (obligatorio)
1. Instala dependencias: `npm install`
2. Limpiar cache: `npm run start:clear`
3. QA Smoke (recomendado):
   - `npm run qa:smoke`

> También puedes correr por separado:
> - `npm run lint`
> - `npm run typecheck`
> - `npm run test:ci`

## 2) Builds EAS

### Preview (APK/IPA internos)
`npm run build:preview`

### Producción (Store)
`npm run build:prod`

> Nota: el perfil **production** usa `autoIncrement` para incrementar `buildNumber` (iOS) y `versionCode` (Android).

## 3) Subir a stores

### iOS
`npm run submit:ios`

### Android
`npm run submit:android`

## 4) Checklist de revisión (Apple)
- Login funcional.
- Feed carga sin “cortes” ni pantallas en blanco.
- Audio: play/pausa funciona en post + mini player.
- Eliminar cuenta: disponible dentro de Settings → Security.
- Política de privacidad: accesible desde Settings.
