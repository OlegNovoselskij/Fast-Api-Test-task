# 08 · CI/CD & Delivery

| | |
|---|---|
| **Owner** | Mobile Platform |
| **Status** | Active — approved standard |
| **Applies to** | Both Expo and Bare React Native apps |

> Defaults with rationale — see [../SKILL.md](../SKILL.md).

How code goes from a merged PR to users' devices: continuous integration checks, builds, signing, store submission, and OTA updates.

---

## 1. Pipeline overview

```
PR opened ──▶ CI checks ──▶ merge to main ──▶ build (staging) ──▶ QA ──▶ promote to prod ──▶ store review / OTA
             (lint, types,                     (EAS/Fastlane)                (staged rollout)
              tests, build)
```

| Stage | Trigger | What runs |
|---|---|---|
| **CI** | every PR | lint, typecheck, unit/component tests, a build sanity check |
| **Staging build** | merge to `main` | full build for QA + E2E, upload to internal track/TestFlight |
| **Prod release** | tag / manual promote | signed store build + staged rollout |
| **OTA** | tag / manual | JS-only update to a channel (hotfixes) |

> ✅ Rule: Nothing ships to users without passing CI. `main` is only ever built from green commits.

---

## 2. CI (every PR)

Runs on **GitHub Actions** (org standard CI provider; native release builds delegated to EAS/Fastlane).

Jobs:
1. Install deps with a **frozen lockfile**.
2. `yarn lint`
3. `yarn typecheck`
4. `yarn test` (with coverage)
5. Build sanity (JS bundle builds; optionally a debug native build).

- Cache node_modules / Pods / Gradle to keep it fast.
- Fail fast; surface logs in the PR.

---

## 3. Builds

### Expo — EAS Build

- Profiles in `eas.json` per environment (`development`, `preview/staging`, `production`).
- Cloud builds — no local Xcode/Gradle needed for release.
- `eas submit` uploads to App Store Connect / Play Console.

```jsonc
// eas.json (shape)
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "staging":     { "distribution": "internal", "channel": "staging" },
    "production":  { "channel": "production" }
  }
}
```

### Bare — Fastlane

- Lanes per platform/env (`beta`, `release`).
- Signing: **match** (iOS) for shared certs; Gradle signing config + Play upload key (Android).
- Build + upload to TestFlight / Play tracks from CI.

> ✅ Rule: Release builds are produced by CI, not from an engineer's laptop, so they're reproducible and signed consistently.

---

## 4. Signing & credentials

- **iOS:** managed by EAS credentials (Expo) or **match** (bare). Certs/profiles stored in the secure store, never in the repo.
- **Android:** upload keystore in CI secrets; Play App Signing enabled.
- Rotate on compromise; document who holds the keys ([03](./03-services-and-infra.md#5-ownership)).

> ✅ Rule: No signing assets (`.p12`, keystores, provisioning profiles) in git.

---

## 5. Environments → tracks

| Env | Build profile | Distribution |
|---|---|---|
| dev | development | Dev client / simulator |
| staging | staging/preview | TestFlight (internal) / Play internal track |
| prod | production | App Store / Play production (staged rollout) |

> ✅ Rule: Prod releases use a **staged rollout** (e.g. Play % rollout / phased iOS release), watched via Sentry ([09](./09-quality-and-monitoring.md)).

---

## 6. OTA updates

We use **EAS Update** for both flavors. In bare RN it's wired up through the `expo-updates` package.

| | Expo | Bare |
|---|---|---|
| Tool | **EAS Update** | **EAS Update** (via `expo-updates`) |
| Scope | JS + assets only | JS + assets only |
| Channel per env | yes | yes |

Rules:
- OTA channel must match the **runtime/native version** — never push a JS bundle expecting native code it doesn't have.
- Use OTA for **hotfixes and low-risk JS changes**, with staged rollout + a fast rollback.
- Native changes (new native module, permission, SDK bump) **require a store build**.

> ✅ Rule: OTA is not a way to bypass review of risky features. Same PR/review bar applies; it just changes the delivery channel.

> **Note:** App Center CodePush was retired (Mar 2025) and its reload path fails under Bridgeless (RN 0.76+) — it is not used. If EAS Update can't meet a hard constraint, the fallbacks (self-hosted OTA server, or a third-party service like Stallion / hot-updater / Pushy) are a recorded decision in [03](./03-services-and-infra.md#32-ota-updates), not a default.

---

## 7. Versioning & release notes

- App **version** (`x.y.z`) is human-decided; **build number** auto-increments in CI.
- Changelog generated from Conventional Commits (07-git-workflow, if present).
- Tag releases (`vX.Y.Z`); the tag drives the prod build.

> **Decision:** **Manual semver version bump + auto-incrementing build number.** We do not use full `semantic-release` for app versioning — marketing/version decisions stay human, while build numbers are automated in CI. The changelog is still generated from Conventional Commits.

---

## 8. Rollback

- **OTA:** roll back to the previous update on the channel (fastest).
- **Native:** halt the staged rollout; ship a fixed build. You cannot un-release a binary, so staged rollout is the safety net.
- Every release notes its rollback path.

> ✅ Rule: Never start a 100% rollout immediately. Ramp and watch crash-free rate first.

---

## 9. Upgrade cadence

- RN / Expo SDK upgrades on a **scheduled cadence: within 6 weeks** of a stable release, not ad hoc.
- Dependency bumps via **Renovate** (batched, automated PRs), reviewed like any change.

---

## Settled decisions

- **CI provider:** GitHub Actions.
- **OTA:** EAS Update (`expo-updates`) for both flavors; CodePush not used (retired).
- **Versioning:** manual semver + auto build number (no semantic-release).
- **Dependency bot:** Renovate.
- **Upgrade cadence:** RN/Expo SDK within 6 weeks of a stable release.
- **Releases:** tag-driven from `main`; staged rollout on prod.
