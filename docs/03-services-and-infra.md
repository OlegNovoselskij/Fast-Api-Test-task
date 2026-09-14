# 03 · Services & Infrastructure

| | |
|---|---|
| **Owner** | Mobile Platform |
| **Status** | Active — approved standard |
| **Applies to** | Both Expo and Bare React Native apps |

> Defaults with rationale — see [../SKILL.md](../SKILL.md) for when to deviate.
> Vendor choices here are org-specific: if you adopt this in a different project,
> swap PostHog/Branch/etc. for your actual services rather than asserting these.

This document maps **every external service** we rely on: what it does, why we chose it, and where its config lives. New engineers should be able to answer "which tool handles X?" from this table alone.

---

## 1. Service map at a glance

| Category | Service | Purpose | Bare vs Expo notes |
|---|---|---|---|
| Builds & release | **EAS Build/Submit** / **Fastlane** | Compile, sign, submit to stores | EAS for Expo; Fastlane for bare |
| OTA updates | **EAS Update** (`expo-updates`) | Ship JS-only fixes without a store review | Works in both Expo and bare |
| Crash & perf | **Sentry** | Crashes, ANRs, performance tracing | Same SDK both |
| Analytics | **PostHog** | Product events, funnels | Same both |
| Push notifications | **FCM** (Android) + **APNs** (iOS), via **expo-notifications** / **Notifee** | Deliver push | Expo wraps both; Notifee for rich bare |
| Deep linking | **Branch** (deferred) + native Universal/App Links | Attribution + deferred deep links | Config plugin (Expo) / manual (bare) |
| Feature flags | **PostHog** | Toggle features, gradual rollout | Same both |
| Auth / identity | **Backend-issued JWT** (access + refresh) | Login, sessions, refresh | Same both |
| Secrets/config | Env files + CI secrets store | Per-env configuration | react-native-config / app.config.ts |
| Backend API | **OpenAPI**-described service | App data | Consumed via Orval-generated client |

> ✅ Rule: There is exactly **one** service per category. Adding a second (e.g. a second analytics tool) requires a decision recorded here with a migration/removal plan.

---

## 2. Environments

We run three environments. Each has its own bundle id / app id, backend URL, and service keys.

| Env | Purpose | Distribution | Backend |
|---|---|---|---|
| **dev** | Local development | Simulator / dev client | dev API |
| **staging** | QA & internal testing | TestFlight / Internal track | staging API |
| **prod** | Live users | App Store / Play Store | prod API |

> ✅ Rule: Never point a staging/dev build at the prod backend. Environment is selected at build time, not at runtime toggle in release builds.

---

## 3. Service details

### 3.1 Builds & release
- **Expo:** EAS Build (cloud) + EAS Submit. Profiles per env in `eas.json`.
- **Bare:** Fastlane lanes per platform/env; signing via match/Gradle.
- Details: [08-ci-cd-delivery](./08-ci-cd-delivery.md).

### 3.2 OTA updates
- **EAS Update** for both flavors — publish JS bundles to a channel matching the env. In bare RN it's wired up via the `expo-updates` package (Expo's install-into-bare path).
- Only **JS/asset** changes ship OTA. Native changes require a store build.
- **Note:** App Center CodePush was retired (Mar 2025) and its reload path fails under Bridgeless (RN 0.76+); it is not an option. If EAS Update doesn't fit a constraint, the alternatives are a self-hosted OTA server or a third-party service (Stallion, hot-updater, Pushy) — but that's a decision to record here, not a default.

> ✅ Rule: OTA is for hotfixes and low-risk JS changes, gated by staged rollout — not a way to bypass review of risky features. The update's runtime version must match the installed native build.

### 3.3 Crash & performance — Sentry
- Captures JS + native crashes, ANRs, and performance traces.
- Upload **source maps / debug symbols** in CI so stack traces are readable.
- Release + dist tags must match the build so issues group correctly.
- Details: [09-quality-and-monitoring](./09-quality-and-monitoring.md).

### 3.4 Analytics
- Central `analytics` service wraps the vendor SDK — features call our interface, not the vendor directly.
- Event names follow a documented taxonomy (see [09](./09-quality-and-monitoring.md)).
- **Vendor: PostHog** — chosen because it covers product analytics **and** feature flags in one tool, self-host-able, and privacy-friendly. (Amplitude and Firebase Analytics considered; PostHog wins on the analytics+flags combo and data ownership.)

### 3.5 Push notifications
- Tokens registered on login, unregistered on logout.
- Handle foreground, background, and quit states; deep-link from a notification tap into a typed route.
- **Validate the notification payload** before routing on it (untrusted input — see [01](./01-architecture.md#5-navigation-architecture)).

### 3.6 Deep linking
- **Branch** for attribution + deferred deep links (install → first open routing).
- Native Universal Links (iOS) / App Links (Android) for direct URLs.
- One linking config maps URLs → typed routes ([01](./01-architecture.md#5-navigation-architecture)); **params are validated at the boundary** before use.

### 3.7 Feature flags
- Wrap the vendor behind a `featureFlags` service. Flags are typed constants, not raw strings scattered in code.
- **Vendor: PostHog** feature flags (same account as analytics), enabling flag-based gradual rollout tied to the same event data.

---

## 4. Secrets & keys

- Secrets live in the **CI secrets store** and local `.env.*` files (gitignored).
- **Never** commit API keys, signing certs, or service credentials.
- Client-embedded keys (e.g. analytics write keys) are not truly secret — treat truly sensitive operations as server-side.
- See [04-project-setup](./04-project-setup.md) for the env-var contract.

> ✅ Rule: A committed secret = rotate immediately + incident note. Pre-commit + CI secret scanning is enabled.

---

## 5. Ownership

| Service | Owner |
|---|---|
| EAS / Fastlane | Mobile Platform |
| Sentry | Mobile Platform |
| Analytics & flags (PostHog) | Mobile Platform |
| Push (FCM/APNs) | Mobile Platform |
| Branch / deep links | Mobile Platform |
| Auth (JWT backend) | Backend + Mobile Platform |

> 💡 Tip: Each service account has a named billing owner in the internal ops sheet; keep it current when membership changes.

---

## Settled decisions

- **OTA:** EAS Update (`expo-updates`) for both flavors; CodePush not used (retired).
- **Analytics + feature flags:** PostHog (single vendor).
- **Auth:** backend-issued JWT (access + refresh); tokens in secure storage; refresh handled by the API-client interceptor.
- **Crash/perf:** Sentry. **Deep linking:** Branch + native links. **Push:** FCM + APNs.
