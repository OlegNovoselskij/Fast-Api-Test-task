---
name: react-native-standards
description: >
  Team defaults and reasoning for React Native / Expo apps — architecture, state
  management, file structure, library choices, testing, CI/CD, and quality. Use when
  writing, reviewing, refactoring, or structuring React Native or Expo code; choosing
  a library for a mobile feature; deciding where a file belongs; or scaffolding a
  component, hook, service, or test. These are documented defaults with rationale,
  not hard mandates — apply engineering judgment on top of them.
---

# React Native standards

This skill encodes how this team builds React Native / Expo apps: the defaults we
reach for and, more importantly, *why*. Depth lives in `references/` (loaded on
demand). This top file is the decision layer.

## How to use this skill — read this first

These are **strong defaults, not dogma.** They exist so unrelated code looks the
same and so we don't re-litigate solved problems on every task. Follow them by
default. But you are still expected to think.

For any real choice (a library, a pattern, where state lives, how to structure a
feature):

1. **Apply the default** when it fits — don't reinvent what's already settled.
2. **If a different option is genuinely better for this specific case, say so.**
   Do not silently follow the default when it's the wrong tool, and do not silently
   override it either. Name the default, name the alternative, give the trade-off in
   one or two sentences, and let the human decide. A short "the default here is X,
   but for this feature Y fits better because Z — want me to use it?" is exactly the
   behavior we want.
3. **Distinguish default strength.** Items marked **Settled** below have already been
   debated and chosen org-wide — treat those as a high bar to change, but still flag
   if one is outright wrong or outdated (versions and dead services drift). Everything
   else is a normal default: deviate freely when you can justify it.
4. **Never invent a convention that contradicts one here without flagging it.**
5. **When these docs and reality conflict, reality wins** — the codebase in front of
   you, the current library docs, and the actual backend contract override anything
   written here. If a default here looks stale, say so instead of applying it blindly.

The goal is a senior engineer who knows the house style and *chooses* when to follow
it — not an autocomplete that pattern-matches the rules off a cliff.

## Decision workflow — before writing code

The general "how we make decisions" philosophy lives in the project `CLAUDE.md` and
applies to every task. In short, before writing new code, walk this and stop at the
first "yes": is new code even needed → does it already exist in the project (reuse)
→ is there a native platform capability → is there a solid library → is it already an
installed dependency. Only then write the minimal, readable solution touching only
the files that must change. Plan and weigh options first; fix root causes, not
symptoms; and when a clean solution is blocked by the backend, flag it and propose the
backend change instead of writing a client-side hack.

## Defaults with rationale

Each area below is a summary. For the full reasoning, tables, and examples, open the
matching file in `references/`.

### Bare vs Expo — `references/02-tech-stack.md`
- **Default:** Expo (prebuild + EAS). Reach for bare RN only when a hard native
  constraint makes Expo impractical (no config plugin, deep native work, brownfield).
- **Why:** less native babysitting, easier upgrades, EAS build/submit/update built in.
- **Settled:** Expo-by-default.

### Architecture & structure — `references/01-architecture.md`
- **Default:** feature-first folders; unidirectional flow (UI → hooks → services →
  API); features isolated behind their `index.ts`; `shared/` for cross-feature reuse.
- **Why:** features stay independently understandable, testable, and deletable.
- Components render + hold local UI state only; logic lives in hooks/services.
- **Settled:** feature isolation (enforced by ESLint boundaries).

### State & data — `references/02-tech-stack.md`
- **Default:** **server state → TanStack Query (v5)**, **client/UI state → Zustand
  (v5)**. API client generated from OpenAPI (Orval); tokens/secrets in secure storage
  (Keychain / expo-secure-store), never MMKV/AsyncStorage.
- **Why:** mixing server and client state is the #1 stale-data bug. Never mirror
  server data into Zustand or `useState`.
- **Reach for something else when:** the app is genuinely atom-heavy (Jotai can beat
  Zustand for fine-grained derived state) or complexity truly exceeds Zustand (RTK).
  If you think that threshold is crossed, make the case — don't just switch.
- **Settled:** the server/client split itself.

### Navigation — `references/01-architecture.md`
- **Default:** React Navigation (native-stack, v7), fully typed routes, one linking
  config. **Validate/sanitize deep-link params** before acting on them.
- **Note:** the team currently standardizes on React Navigation over expo-router for
  cross-flavor consistency. This is an org call, not a technical absolute — for a new
  Expo-only app, expo-router is a reasonable thing to *raise*, not to adopt silently.

### UI & styling — `references/05-code-conventions.md`
- **Default:** design tokens (colors / sizes / typography) + `StyleSheet`; styles in a
  sibling `*.styles.ts`; FlashList for long lists; Reanimated (v3) + gesture-handler;
  `react-native-svg` icons; `expo-image` for images (works in bare too — prefer it
  over the unmaintained react-native-fast-image).
- **Why:** no magic numbers; UI-thread animations; better list/image performance.

### Testing — `references/06-testing.md`
- **Default:** Jest + React Native Testing Library for unit/component, **MSW v2** for
  network mocking, Maestro for E2E (Detox only for exotic native gesture sync). Test
  behavior, not implementation; query by role/text, not testIDs everywhere.
- **MSW v2 API** (do not use the v1 `rest`/`res`/`ctx` form):
  ```ts
  import { http, HttpResponse } from 'msw';
  server.use(http.get('/matches', () => new HttpResponse(null, { status: 500 })));
  ```
- Coverage is a guardrail, not a goal: floors on logic dirs, not UI glue.

### CI/CD & OTA — `references/08-ci-cd-delivery.md`
- **Default:** CI (lint, typecheck, test, build sanity) gates every merge; release
  builds come from CI, not laptops; staged rollout on prod.
- **OTA:** **EAS Update** (works in bare via `expo-updates`), *not* CodePush —
  App Center CodePush was retired (Mar 2025) and its reload path fails under Bridgeless
  (RN 0.76+). OTA channel must match the runtime/native version; OTA is not a way to
  skip review of risky features.

### Code conventions — `references/05-code-conventions.md`
- **Default:** TypeScript `strict`, no `any` (use `unknown` + narrowing); function
  components, one per file; explicit `Props` type; derive types from zod (v4) schemas;
  path aliases over `../../../`; every data screen renders explicit loading / empty /
  error states; no hardcoded user-facing copy (i18n).
- Comment *why*, not *what*; no dead code.

### Quality & monitoring — `references/09-quality-and-monitoring.md`
- **Default:** Sentry with source maps + release/dist tagging; an `analytics` service
  wrapper (features call our typed interface, not the vendor SDK) so vendors are
  swappable and testable; perf budgets measured on a mid-tier Android device;
  crash-free targets gate rollout ramp-up.

## Platform baseline (keep current)

New Architecture (Fabric + TurboModules + JSI) is **required**, not optional — it's
the default since RN 0.76 and the old bridge was removed in 0.82. Target a current
stable RN and React 19. Before adopting any native library, confirm it's New-Arch
compatible. Treat every specific version number in the reference docs as a starting
point to verify against the library's current docs, not as gospel — they drift.

## When to flag instead of comply

Stop and surface it (don't quietly work around it) when:

- A clean implementation is blocked by the **backend/API shape** and the only path is
  a client-side hack → propose the backend change instead.
- A **different library or pattern is clearly better** for this specific feature →
  name both options and the trade-off, let the human choose.
- A default here appears **outdated or wrong** (dead service, superseded major
  version, deprecated library) → say so; don't apply it on autopilot.
- A change touches **security** (deep-link handling, secret storage, sensitive screens
  in the app-switcher, cert pinning, PII in logs) → call it out explicitly.

## References

Load the matching file only when the task needs that depth:

- `references/01-architecture.md` — layers, folder structure, data flow, navigation
- `references/02-tech-stack.md` — the full stack + "adding a dependency" process
- `references/03-services-and-infra.md` — external services, environments, secrets
- `references/04-project-setup.md` — clean-machine setup, scripts, env vars
- `references/05-code-conventions.md` — TS, components, styling, naming, a11y, i18n, security baseline
- `references/06-testing.md` — pyramid, what to test, coverage policy, E2E
- `references/08-ci-cd-delivery.md` — pipeline, builds, signing, OTA, rollback
- `references/09-quality-and-monitoring.md` — Sentry, analytics, perf, release health

(07-git-workflow is referenced by 06 and 08 but not part of this bundle — add it if your team keeps one.)
