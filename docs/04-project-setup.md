# 04 · Project Setup

| | |
|---|---|
| **Owner** | Mobile Platform |
| **Status** | Active — approved standard |
| **Applies to** | Both Expo and Bare React Native apps |

> Defaults with rationale — see [../SKILL.md](../SKILL.md). Versions below are floors;
> verify against the tool's current release when setting up a fresh machine.

How to get a working local build **from a clean machine**. If any step here is wrong, fix it in a PR — a broken setup doc costs every new hire a day.

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node** | current LTS (22.x+) | Use **nvm** (org standard). Pin via `.nvmrc`. |
| **Package manager** | **yarn** | Org standard; use the committed lockfile. |
| **Watchman** | latest | Recommended by RN for file watching (macOS: `brew install watchman`). |
| **Ruby + Bundler** | as in `.ruby-version` | For CocoaPods (bare / prebuilt iOS). |
| **Xcode** | latest stable | iOS builds. Install Command Line Tools. |
| **Android Studio** | latest | Android SDK, an emulator, JDK 17. |
| **Expo / EAS CLI** | latest | `npm i -g eas-cli` (Expo apps). |
| **Watchman/JDK/etc.** | — | Follow the official RN "Environment setup" for your OS. |

> ✅ Rule: **nvm** is the Node version manager standard; commit `.nvmrc` and `.ruby-version` so versions are reproducible.

> 💡 Note: Some deps are Nitro Modules (e.g. `react-native-mmkv` v4 needs `react-native-nitro-modules`). These are ordinary installs on the New Architecture — no extra setup beyond the pod/gradle sync that `prebuild`/`pod install` already runs.

---

## 2. First-time setup

### Expo (prebuild + EAS)

```bash
git clone <repo> && cd <repo>
nvm use                      # match Node version
yarn install                 # JS deps
cp .env.example .env.dev     # fill in values (see §4)
yarn expo prebuild           # generate ios/ & android/ (only if needed)
yarn ios                     # or: yarn android
```

**Standard workflow:** we distribute a shared **dev client** so most engineers never build native locally — build once (or download the team build), then just run Metro:

```bash
eas build --profile development --platform ios   # or download the shared dev client
yarn start                                        # then just run Metro
```

### Bare React Native

```bash
git clone <repo> && cd <repo>
nvm use
yarn install
cp .env.example .env.dev
bundle install               # Ruby gems (CocoaPods)
cd ios && bundle exec pod install && cd ..
yarn ios                     # or: yarn android
```

> ✅ Rule: `pod install` runs via `bundle exec` (pinned CocoaPods), never a global pod, to avoid version drift.

---

## 3. Common scripts

Every repo exposes the same script names so muscle memory transfers between projects:

| Script | Does |
|---|---|
| `yarn start` | Start Metro bundler |
| `yarn ios` / `yarn android` | Build & run on simulator/emulator |
| `yarn lint` / `yarn lint:fix` | ESLint |
| `yarn format` | Prettier write |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn test` / `yarn test:watch` | Jest |
| `yarn e2e` | Maestro/Detox E2E |
| `yarn api:generate` | Orval codegen from OpenAPI |

> ✅ Rule: These script names are standardized across all repos. Don't rename them per project.

---

## 4. Environment variables

- Config is per-environment: `.env.dev`, `.env.staging`, `.env.prod` (all **gitignored**).
- A committed **`.env.example`** documents every required key (no values).
- Access via typed config (`react-native-config` in bare, `app.config.ts` + typed helper in Expo) — never `process.env.X` scattered in feature code.

Example `.env.example`:

```dotenv
API_BASE_URL=
SENTRY_DSN=
ANALYTICS_KEY=
BRANCH_KEY=
ENVIRONMENT=dev
```

> ✅ Rule: Add every new env var to `.env.example` in the same PR that introduces it, or CI fails.
> ✅ Rule: Real `.env.*` files and secrets are never committed. See [03](./03-services-and-infra.md#4-secrets--keys).

---

## 5. API client generation

The API client is generated from the backend OpenAPI spec — do not hand-write fetch calls.

```bash
yarn api:generate       # runs Orval → src/api/generated (gitignored)
```

- Run it after pulling changes that touch the API, or when the spec updates.
- The generated folder is **gitignored**; CI regenerates it during build.

> ✅ Rule: Never edit files under `src/api/generated/` by hand. Change the spec (or Orval config) and regenerate.

---

## 6. Editor setup

- **VS Code / Cursor** with ESLint + Prettier extensions.
- Format on save; ESLint auto-fix on save.
- Recommended extensions committed in `.vscode/extensions.json`.
- TypeScript: use the workspace TS version.

---

## 7. Troubleshooting quick hits

| Symptom | Fix |
|---|---|
| Metro cache weirdness | `yarn start --reset-cache` |
| iOS build fails after dep change | `cd ios && bundle exec pod install` |
| "Unable to resolve module" | Reinstall deps, clear Metro cache |
| Stale native after config change (Expo) | `yarn expo prebuild --clean` |
| Android build cache issues | `cd android && ./gradlew clean` |

---

## Settled decisions

- **Node version manager:** nvm (`.nvmrc` committed).
- **Package manager:** yarn.
- **Dev client:** a shared Expo dev client is distributed to the team; local native builds are the exception, not the norm.
