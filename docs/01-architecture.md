# 01 · Architecture

| | |
|---|---|
| **Owner** | Mobile Platform |
| **Status** | Active — approved standard |
| **Applies to** | Both Expo and Bare React Native apps |

> These are documented **defaults with rationale**, not immutable law. For when to
> follow vs. deviate, see the skill's "How to use this skill" ([../SKILL.md](../SKILL.md)).
> Reality — the codebase in front of you and current library docs — wins over anything here.

This document defines **how we structure a React Native codebase**: the layers, the folder layout, the data-flow rules, and the patterns we standardize on. The goal is that any engineer can open any feature and find things in the same place.

---

## 1. Principles

1. **Feature-first, not type-first.** Group code by *what it does* (a feature), not by *what it is* (all "components" in one giant folder). Features are the unit of ownership and deletion.
2. **Unidirectional data flow.** UI → hooks → services → API. Never call the network directly from a component.
3. **Separation of concerns.** UI (dumb) is separate from logic (hooks/state) is separate from data (services/API client).
4. **Explicit boundaries.** A feature may not import from another feature's internals — only from its public entry (`index.ts`) or from `shared/`.
5. **No magic values.** Colors, sizes, and copy come from tokens/constants — never inline literals. See [05-code-conventions](./05-code-conventions.md).
6. **Fail gracefully.** Feature/screen subtrees are wrapped in error boundaries so one broken screen doesn't take down the app; the boundary reports to Sentry and renders a fallback.

> ✅ Rule: A React component should contain rendering + local UI state only. Business logic, network calls, and cross-screen state live outside the component (hooks/services/stores).

---

## 2. Layered architecture

```
┌──────────────────────────────────────────────┐
│  Screens / UI          (React components)      │  ← rendering + local state
├──────────────────────────────────────────────┤
│  Feature hooks         (useXxx)                │  ← orchestration, view-model
├──────────────────────────────────────────────┤
│  State                 (Zustand / TanStack Q)  │  ← client & server state
├──────────────────────────────────────────────┤
│  Services              (domain logic)          │  ← business rules, mapping
├──────────────────────────────────────────────┤
│  API client            (Orval-generated)       │  ← transport, typed from OpenAPI
└──────────────────────────────────────────────┘
```

- **Server state** (data owned by the backend) → **TanStack Query**. It handles caching, dedup, retries, and background refetch.
- **Client state** (UI/session state the backend doesn't own) → **Zustand**.
- **Do not** store server data in Zustand or in `useState` and manually sync it — that's the #1 source of stale-data bugs.

> Why this split: mixing server and client state is the most common RN architecture mistake. TanStack Query already solves cache invalidation; Zustand solves ephemeral UI/session state. Keeping them separate keeps both simple.
>
> This split is the **settled** default. Jotai (fine-grained atomic/derived state) or Redux Toolkit (past the complexity threshold in [02](./02-tech-stack.md#4-state--data)) are reasonable to *propose* for a specific case — raise them with the trade-off, don't switch silently.

---

## 3. Folder structure

The same structure works for both Expo and Bare RN. The only difference is the native/config layer at the root (see §6).

```
src/
├── app/                    # app entry, providers, navigation container
│   ├── App.tsx
│   ├── providers/          # QueryClientProvider, theme, safe-area, error boundary, etc.
│   └── navigation/         # navigators, linking config, route types
│
├── features/               # ⭐ the heart of the app — one folder per feature
│   └── <feature>/
│       ├── components/      # UI local to this feature
│       ├── hooks/           # feature hooks (view-models)
│       ├── services/        # domain logic for this feature
│       ├── screens/         # screen components
│       ├── types.ts         # feature-local types
│       └── index.ts         # ⭐ PUBLIC API — the only thing others may import
│
├── shared/                 # cross-feature reusable code (no feature logic)
│   ├── ui/                  # design-system components (Button, Text, Sheet…)
│   ├── hooks/               # generic hooks (useDebounce, useKeyboard…)
│   ├── lib/                 # framework-agnostic utils (date, format, math)
│   └── theme/               # design tokens: colors, sizes, typography
│
├── api/
│   ├── generated/           # ⚠️ Orval output — gitignored, run codegen
│   └── client.ts            # axios/fetch instance, interceptors, auth
│
├── services/               # app-wide services (analytics, storage, push…)
└── config/                 # env parsing, feature flags, constants
```

> ✅ Rule: Importing from another feature's internals (`features/a/components/...`) is forbidden. Import only from `features/a` (its `index.ts`) or from `shared/`. This is enforced with an ESLint boundaries rule — see [05-code-conventions](./05-code-conventions.md).

> **Shared domain logic:** `shared/` holds genuinely cross-feature reusable code. If two features need to share *business* logic (not just UI/utils), that's a signal it may be its own small feature/module they both depend on — prefer that over quietly widening `shared/` into a dumping ground.

> Why feature-first: it makes features independently understandable, testable, and *deletable*. When a feature is cut, you delete one folder instead of hunting fragments across `components/`, `screens/`, `utils/`.

---

## 4. Naming & file conventions

| Kind | Convention | Example |
|---|---|---|
| Component file | `PascalCase.tsx` | `MatchRow.tsx` |
| Styles (sibling file) | `PascalCase.styles.ts` | `MatchRow.styles.ts` |
| Hook | `useCamelCase.ts` | `useMatchWeek.ts` |
| Service | `camelCaseService.ts` | `matchesService.ts` |
| Types | `types.ts` per feature | `features/matchWeek/types.ts` |
| Test | `*.test.ts(x)` next to source | `MatchRow.test.tsx` |

> ✅ Rule: Styles live in a sibling `*.styles.ts` file, not inline and not in a shared stylesheet. Keeps components readable and styles colocated.

---

## 5. Navigation architecture

- **React Navigation, native stack** (v7) as the base.
- Route params are **fully typed** via a central `RootStackParamList` (or per-navigator param lists) in `app/navigation`.
- **Deep links** are declared in one linking config, mapped to typed routes.
- Screens are thin: they read params, call a feature hook, and render. No data fetching logic inline.

```ts
// app/navigation/types.ts
export type RootStackParamList = {
  Home: undefined;
  MatchWeek: { weekId: string };
};
```

> ✅ Rule: **Validate and sanitize deep-link and notification params before acting on them.** A URL/notification payload is untrusted external input — parse it with a zod schema at the boundary and reject/redirect on failure; never pass raw params straight into navigation, storage, or a network call.

> **Decision (settled):** React Navigation is the standard for **all** apps (bare and Expo). It's stable, works identically across flavors, and gives explicit control. `expo-router` is not used org-wide — a single navigation library keeps patterns transferable. This is an organizational consistency call, not a technical absolute: for a new Expo-only app, expo-router is a legitimate thing to *raise for discussion*, not to adopt unilaterally.

---

## 6. Bare vs Expo — where the architecture differs

The `src/` architecture above is **identical** in both. The differences are only at the root/native layer:

| Concern | Expo (prebuild + EAS) | Bare React Native |
|---|---|---|
| Native config | `app.config.ts` + config plugins | Edit `ios/` & `android/` directly |
| Native folders | Generated on demand (`expo prebuild`) | Committed to the repo |
| Builds | EAS Build (cloud) | Fastlane / local Xcode & Gradle |
| OTA updates | EAS Update (built-in) | EAS Update via `expo-updates` (works in bare) |
| Adding native modules | Prefer Expo-compatible libs / config plugins | Any RN lib + manual linking |

> ✅ Rule: Keep all business/UI logic in `src/` framework-agnostic. Nothing in `features/` should import Expo-only APIs directly — wrap platform capabilities (camera, notifications, storage) behind a `services/` interface so a feature doesn't care whether it's Expo or bare.

Full decision matrix and migration notes live in [02-tech-stack.md](./02-tech-stack.md#bare-vs-expo).

---

## 7. Anti-patterns (do not do)

- ❌ Fetching data inside a component's `useEffect` and storing it in `useState`. → Use TanStack Query.
- ❌ A `utils/` or `components/` mega-folder shared across the whole app for feature-specific code. → Put it in the feature.
- ❌ Cross-feature imports of internals. → Go through the feature's `index.ts`.
- ❌ Passing the navigation object deep into logic. → Navigate from screens/hooks, keep services navigation-free.
- ❌ Inline colors/sizes/strings. → Tokens & constants.
- ❌ Acting on a raw deep-link/notification param without validation. → Parse with zod at the boundary.

---

## Settled decisions

- **Navigation:** React Navigation (native-stack, v7) for all apps; expo-router not used org-wide (§5).
- **State split:** Zustand for client state, TanStack Query for server state. Redux Toolkit only past the complexity threshold defined in [02](./02-tech-stack.md#4-state--data).
- **Error handling:** feature/screen subtrees wrapped in error boundaries reporting to Sentry.
- **Repo layout:** one app per repo (polyrepo) is the default. A monorepo (Turborepo) is used only when multiple apps share a substantial code surface; it does not change the `src/` architecture above.
