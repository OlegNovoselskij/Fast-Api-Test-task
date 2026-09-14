# 05 · Code Conventions

| | |
|---|---|
| **Owner** | Mobile Platform |
| **Status** | Active — approved standard |
| **Applies to** | Both Expo and Bare React Native apps |

> Defaults with rationale — see [../SKILL.md](../SKILL.md). Most of these are
> mechanically enforced; where a rule genuinely doesn't fit a case, flag it rather
> than silently breaking or blindly following it.

Conventions that make any file predictable to any engineer. Most of these are **enforced by ESLint/Prettier/TypeScript in CI** — style debates end at the linter.

---

## 1. TypeScript

- `strict: true`. No implicit `any`. `noUncheckedIndexedAccess` on.
- **No `any`** in committed code. Use `unknown` + narrowing, or a real type.
- Prefer `type` for unions/aliases, `interface` for object shapes that may be extended.
- Export types from a feature's `types.ts`; don't re-declare shared shapes.
- Derive types from zod schemas (`z.infer`) instead of duplicating them. (zod v4 — `z.infer` still applies; watch for v4 API changes if migrating from v3.)

> ✅ Rule: `yarn typecheck` (`tsc --noEmit`) must pass in CI. No `@ts-ignore` without a `// reason:` comment.

---

## 2. Components

- Function components only. No class components (except error boundaries, which must be class components or a thin wrapper lib).
- One component per file; filename matches the component (`MatchRow.tsx`).
- Props typed with an explicit `Props` type; destructure in the signature.
- Components render + hold local UI state only — logic goes to hooks (see [01](./01-architecture.md)).
- Keep components small; extract sub-components when a file passes ~150 lines or JSX nests too deep.

```tsx
type Props = { title: string; onPress: () => void };

export const PrimaryButton = ({ title, onPress }: Props) => {
  // ...
};
```

> ✅ Rule: No business logic or network calls inside components.

---

## 3. Styling — no magic numbers

- Colors come from a central **`colors`** token file. Never inline hex.
- Spacing/sizing come from a central **`sizes`** (spacing scale) file. Never inline pixel literals.
- Typography comes from a **`typography`** token file.
- Styles live in a **sibling `*.styles.ts`** file, created with `StyleSheet.create` (or Unistyles).

```ts
// MatchRow.styles.ts
import { StyleSheet } from 'react-native';
import { colors } from '@/shared/theme/colors';
import { sizes } from '@/shared/theme/sizes';

export const styles = StyleSheet.create({
  container: {
    padding: sizes.spacing.md,
    backgroundColor: colors.surface,
  },
});
```

> ✅ Rule: No inline color hex, no magic spacing numbers, no inline `style={{ ... }}` for anything reusable. Tokens only.

---

## 4. Naming

| Kind | Convention | Example |
|---|---|---|
| Component / file | `PascalCase` | `MatchRow.tsx` |
| Hook | `useCamelCase` | `useMatchWeek` |
| Service | `camelCaseService` | `matchesService` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_RETRIES` |
| Boolean | `is/has/should` prefix | `isLoading`, `hasError` |
| Event handler | `handleX` (local) / `onX` (prop) | `handlePress` / `onPress` |
| Type/Interface | `PascalCase`, no `I` prefix | `MatchWeek`, not `IMatchWeek` |

---

## 5. Imports & module boundaries

- Use path aliases (`@/features/...`) not deep relative chains (`../../../`).
- Order: external → internal aliases → relative. (Enforced by `import/order`.)
- **Feature isolation:** import other features only via their `index.ts`. No reaching into internals.

> ✅ Rule: Cross-feature deep imports are blocked by an ESLint boundaries rule (see [01](./01-architecture.md#3-folder-structure)).

---

## 6. State & data rules

- Server data → TanStack Query hooks. Client/UI state → Zustand or local `useState`.
- No fetching in `useEffect` + `useState`. (See anti-patterns in [01](./01-architecture.md#7-anti-patterns-do-not-do).)
- Query keys are centralized/typed per feature, not stringly-typed inline.

---

## 7. Async, errors & loading

- Always handle **loading / empty / error** states in UI that reads data.
- Never swallow errors silently; report to Sentry with context ([09](./09-quality-and-monitoring.md)).
- Wrap feature/screen subtrees in an **error boundary** that reports to Sentry and renders a fallback, so one failure doesn't blank the whole app.
- Use the shared **`CircularSpinner`** component for loading — **no raw `ActivityIndicator`**.

> ✅ Rule: Every data-driven screen renders explicit loading, empty, and error states, and sits under an error boundary.

---

## 8. Security baseline

Applies to every feature; call it out explicitly in review when a change touches these.

- **Validate untrusted input at the boundary** with zod: API responses at the edge, deep-link and notification params, and anything read back from storage. Never pass raw external data into navigation, storage, or a request.
- **Secrets & tokens** live only in secure storage (Keychain / expo-secure-store), never MMKV/AsyncStorage, never in code or logs ([02](./02-tech-stack.md#4-state--data)).
- **No PII or secrets in logs** or analytics events ([09](./09-quality-and-monitoring.md)).
- **Mask sensitive screens in the app switcher** (blur/placeholder on background) so tokens/PII don't leak into OS snapshots.
- **Certificate pinning** for sensitive APIs is a per-app decision — take an explicit stance (do it / don't and why) rather than leaving it unconsidered.
- **Deep links / WebViews** are attack surface: validate URLs, restrict WebView origins, disable unneeded JS bridges.

> ✅ Rule: External input is untrusted until validated. Sensitive data never lands in plain storage, logs, or app-switcher snapshots.

---

## 9. Comments

- Comment **why**, not **what**. The code already says what it does.
- No commented-out code in commits. Delete it — git remembers.
- Public/shared utilities get a short JSDoc when the signature isn't self-explanatory.

> ✅ Rule: No narrating comments (`// increment counter`). No dead code.

---

## 10. Accessibility & i18n (baseline)

- Interactive elements have `accessibilityRole` / `accessibilityLabel`.
- Tap targets ≥ 44×44 pt.
- User-facing strings go through the i18n layer — no hardcoded copy in components.
- **i18n library: i18next + react-i18next.** Keys are namespaced per feature; strings live in translation files, not inline.

> ✅ Rule: No hardcoded user-facing copy. All strings go through i18next.

---

## 11. Enforcement summary

| Rule | Enforced by |
|---|---|
| Formatting | Prettier (pre-commit + CI) |
| Lint / boundaries | ESLint (pre-commit + CI) |
| Types | `tsc --noEmit` (CI) |
| Commit format | commitlint (Husky) |
| Secret scanning | pre-commit + CI |
| Tests pass | CI |

> ✅ Rule: A red CI check blocks merge. No exceptions without an explicit, reviewed override.

---

## Settled decisions

- **i18n:** i18next + react-i18next; no hardcoded copy.
- **Loading UI:** shared `CircularSpinner`; raw `ActivityIndicator` is banned.
- **Styling:** design tokens + `*.styles.ts` sibling files; no magic numbers.
- **Security:** validate external input with zod at the boundary; secrets in secure storage only; sensitive screens masked in the app switcher.
