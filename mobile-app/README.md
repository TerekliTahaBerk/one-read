# OneRead iOS

Native iOS reader for the weekday OneArticle email. This directory is intentionally isolated from the root Next.js dependency tree.

## Local UI review

Requirements: Node 22.13+, Xcode with an iOS 16.4+ simulator, and npm.

```sh
npm ci
cp .env.example .env
npm run ios
```

Fixtures are enabled by default. Request a code, then enter any six digits. To use the local Next.js API, set `EXPO_PUBLIC_USE_FIXTURES=false` and `EXPO_PUBLIC_API_ORIGIN` to an origin reachable by the simulator (not `localhost` for a physical device).

## Gates

```sh
npm run lint
npm run typecheck
npm test
npx expo-doctor
```

## Builds

After completing [MANUAL_ACTIONS.md](docs/MANUAL_ACTIONS.md):

```sh
eas build --profile development --platform ios
eas build --profile preview --platform ios
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

Submission is never run automatically. Product and system decisions are recorded in [PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) and [ARCHITECTURE.md](docs/ARCHITECTURE.md).
