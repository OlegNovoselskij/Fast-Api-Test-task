# 02 · Tech Stack

| | |
|---|---|
| **Owner** | Mobile Platform |
| **Status** | Active — approved standard |
| **Applies to** | Both Expo and Bare React Native apps |

> These are **defaults with rationale**, not mandates. If a different library is
> clearly better for a specific feature, name it and the trade-off rather than
> following or overriding silently — see [../SKILL.md](../SKILL.md).
> Treat every version number below as a **floor to verify against the library's
> current docs**, not a fixed truth — majors drift.

This document lists every library we standardize on, the **minimum version**, and **why we picked it over the alternatives**. If you want to introduce a new dependency, follow §9.

---

## 1. Bare vs Expo {#bare-vs-expo}

This is the most important decision when starting a new app.

> ✅ Rule: **Default to Expo (with prebuild + EAS).** Choose Bare React Native only when a hard native constraint makes Expo impractical, and document that reason in the app's README.

### Why Expo by default

- No manual Xcode/Gradle babysitting; native code is generated from config.
- EAS Build/Submit/Update give you cloud builds, store submission, and OTA updates out of the box.
- Config plugins let you customize native code without ejecting.
- Upgrades are dramatically easier (`expo` manages compatible native versions).

### When to pick Bare

- A required native SDK has **no** Expo config plugin and can't be wrapped.
- You need deep, non-standard native modifications maintained by a native team.
- You're integrating into an **existing native app** (brownfield).

### Decision matrix

| Criterion | Expo (prebuild + EAS) | Bare RN |
|---|---|---|
| Time-to-first-build | Minutes | Hours+ |
| Native module freedom | High (plugins) but not unlimited | Unlimited |
| Upgrade effort | Low | High |
| OTA updates | Built-in (EAS Update) | EAS Update via `expo-updates` (bare-compatible) |
| CI/CD | EAS (managed) | Fastlane (self-managed) |
| Best for | 90% of apps, greenfield | Brownfield / exotic native needs |

> 💡 Tip: "Expo" no longer means "no native code." With **prebuild** you get real `ios/`/`android/` folders when you need them — you're not locked in.

---

## 2. Core

| Concern | Choice | Min version | Why / alternatives considered |
|---|---|---|---|
| Language | **TypeScript**, `strict: true` | 5.4+ | Non-negotiable. Alternatives (plain JS, Flow) rejected — no ecosystem momentum. |
| Runtime | **React Native** | current stable (New Arch required) | Target the latest stable RN. New Architecture is the default since 0.76 and the old bridge was removed in 0.82 — there is no "old arch" path to fall back to. |
| React | **React** | 19.x | Concurrent features + Actions; standard on modern RN. |
| JS engine | **Hermes** | (bundled) | Faster startup, lower memory vs JSC. Default; required by the New Architecture (JSI). |

> ✅ Rule: **New Architecture (Fabric + TurboModules + JSI) is required, not a goal.** Before adopting any native library, confirm it's New-Arch compatible — a library without New-Arch support is a **blocker**, not a caveat. Old-architecture-only libraries are off the table.

---

## 3. Navigation

| Choice | Min version | Why / alternatives |
|---|---|---|
| **React Navigation** (native-stack) | 7.x | Stable, native perf, identical in bare & Expo, typed routes, deep linking. |

> **Decision (settled org-wide):** React Navigation is the standard for all apps. expo-router is not used org-wide — one navigation library keeps patterns transferable across teams and flavors. (expo-router is a reasonable thing to *raise* for a new Expo-only app; it's a consistency call, not a technical verdict.)

---

## 4. State & data

| Concern | Choice | Min version | Why / alternatives |
|---|---|---|---|
| Server state | **TanStack Query** | 5.x | Caching, retries, dedup, background refetch. Don't hand-roll. |
| Client state | **Zustand** | 5.x | ~1KB, minimal boilerplate. **Threshold:** switch to Redux Toolkit only when global state has many (>~8) interdependent slices with complex derived/middleware needs. Jotai is a fair alternative when state is naturally atomic/derived — raise it with the trade-off. |
| API client | **Orval** codegen from OpenAPI | current major | Types + hooks generated from the backend contract; no drift. |
| HTTP | **axios** (via generated client) | 1.x | Interceptors for auth/refresh; Orval supports it. `fetch` is fine too. |
| Forms | **react-hook-form** | 7.x | Uncontrolled, performant, minimal re-renders. |
| Validation | **zod** | 4.x | One schema → validation + TS types. Pairs with RHF via resolver. `z.infer` still the way to derive types; note v4 has API changes vs v3 — check the migration notes. |
| Persistence | **react-native-mmkv** | 4.x | Sync, fast key-value. v4 is a Nitro Module (needs `react-native-nitro-modules`, RN 0.76+); API changed — `createMMKV()` instead of `new MMKV()`, `.remove()` instead of `.delete()`. `AsyncStorage` only for simple/compat cases. |
| Secure storage | **expo-secure-store** / **react-native-keychain** | latest | Tokens & secrets go here, never MMKV/AsyncStorage. |

> ✅ Rule: Server-owned data lives in TanStack Query, never mirrored into Zustand/`useState`.
> ✅ Rule: Auth tokens & secrets go in secure storage (Keychain/Keystore), never plain storage.
> ✅ Rule: Validate untrusted input (API responses at the edge, deep-link/notification params, values read back from storage) with zod before use.

---

## 5. UI & styling

| Concern | Choice | Why / alternatives |
|---|---|---|
| Styling | **Design tokens + StyleSheet** | Centralized colors/sizes/typography. No magic numbers. (Unistyles considered; StyleSheet+tokens chosen as the zero-dependency baseline.) |
| Icons | **react-native-svg** + an icon set | SVG scales cleanly; avoid PNG icon sprites. |
| Bottom sheets | **@gorhom/bottom-sheet** | De-facto standard, gesture-driven. |
| Lists | **@shopify/flash-list** | Drop-in FlatList replacement, much better perf on long lists. |
| Animations | **react-native-reanimated** 4.x + **gesture-handler** (current) | UI-thread animations via worklets. Reanimated 4 is **New-Arch only** (which is our baseline); Reanimated 3 exists for old-arch apps but is no longer actively maintained. |
| Images | **expo-image** (Expo **and** bare) | Caching + performance vs core `<Image>`. Prefer it over `react-native-fast-image`, which is effectively unmaintained; expo-image works outside Expo too. |
| Safe area | **react-native-safe-area-context** | Standard, required by React Navigation. |

> 💡 Tip: Prefer a small in-house design-system layer in `shared/ui` over a heavy UI kit. Full component kits often fight custom design.

---

## 6. Tooling

| Concern | Choice | Why |
|---|---|---|
| Package manager | **yarn** — commit the lockfile | Org standard; deterministic installs. (pnpm considered; yarn chosen for consistency.) |
| i18n | **i18next** + **react-i18next** | Mature, extraction tooling, no hardcoded copy. |
| Dependency updates | **Renovate** | Automated, batched dependency PRs. |
| Linter | **ESLint** + `@react-native`/`typescript-eslint` configs | Catches bugs & enforces boundaries. |
| Formatter | **Prettier** | Zero style debates; runs on save + pre-commit. |
| Import boundaries | **eslint-plugin-boundaries** or `import/no-restricted-paths` | Enforces feature isolation (see [01](./01-architecture.md)). |
| Env vars | **react-native-config** (bare) / Expo env + `app.config.ts` (Expo) | Typed, per-environment config. |
| Git hooks | **Husky** + **lint-staged** | Lint/format/typecheck staged files pre-commit. |

---

## 7. Testing (summary — full detail in [06](./06-testing.md))

| Level | Choice | Version |
|---|---|---|
| Unit / component | **Jest** + **React Native Testing Library** | 30.x / 13.x+ (v14 for the async API) |
| E2E | **Maestro** (Detox only for exotic native gesture sync) | latest |
| Contract/API mocks | **MSW** | 2.x (use the `http`/`HttpResponse` API, not v1 `rest`) |

---

## 8. Version pinning policy

- Pin exact versions in `package.json` for **native** libs (native mismatches are painful).
- Use caret (`^`) for pure-JS dev tooling where breakage is cheap.
- Commit the lockfile. CI installs with `--frozen-lockfile` / `--immutable`.
- Upgrade RN/Expo SDK on a scheduled cadence, not ad hoc — see [08](./08-ci-cd-delivery.md).

> ✅ Rule: **yarn only.** Mixing package managers / lockfiles is banned.

---

## 9. Adding a new dependency (process)

Before adding a library, answer in the PR description:

1. **Why** — what problem, why not solve with existing deps?
2. **Alternatives** — what else was considered, why rejected?
3. **Health** — maintenance, last release, **New-Arch support (hard requirement)**, bundle size.
4. **Native?** — does it need native linking / an Expo config plugin?
5. **License** — compatible with our distribution?

> ✅ Rule: New runtime dependencies require a reviewer's approval and the 5 answers above. A library without New-Architecture support is rejected. Dev-only tooling is lighter-weight but still noted in the PR.

---

## Settled decisions

- **Platform:** New Architecture required; target current stable RN + React 19.
- **Navigation:** React Navigation (native-stack, v7). expo-router not used org-wide.
- **State:** Zustand (client) + TanStack Query (server); RTK only past the threshold in §4.
- **Styling:** design tokens + StyleSheet. Unistyles not adopted.
- **Images:** expo-image (both flavors); react-native-fast-image not used.
- **Package manager:** yarn.
- **i18n:** i18next + react-i18next.
- **E2E:** Maestro. Detox only for exotic native gesture sync.
