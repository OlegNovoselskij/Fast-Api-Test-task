# 06 · Testing

| | |
|---|---|
| **Owner** | Mobile Platform |
| **Status** | Active — approved standard |
| **Applies to** | Both Expo and Bare React Native apps |

> Defaults with rationale — see [../SKILL.md](../SKILL.md).

Our testing philosophy: **test behavior, not implementation**, weight tests toward the cheap end of the pyramid, and gate merges on green tests.

---

## 1. The testing pyramid

```
        /\
       /E2E\        few  — Maestro/Detox — critical user journeys
      /------\
     / integ. \     some — RTL + MSW — screens with real data flow
    /----------\
   /   unit     \   many — Jest — pure logic, services, hooks
  /--------------\
```

| Level | Tool | What it covers | Speed |
|---|---|---|---|
| Unit | **Jest** | Pure functions, services, reducers, mappers | ⚡️ ms |
| Component/integration | **RTL** (`@testing-library/react-native`) + **MSW** | Components & screens with realistic data | fast |
| E2E | **Maestro** (default) / **Detox** | Full journeys on simulator/device | slow |

> ✅ Rule: Prefer the lowest level that can catch the bug. Don't write an E2E test for something a unit test proves.

---

## 2. What to test (and what not to)

**Do test:**
- Business logic in `services/` and mappers (edge cases, error paths).
- Custom hooks (loading/error/success transitions).
- Component behavior: given props/data, the right thing renders and interactions fire.
- Critical journeys E2E: onboarding, login, the core money/action flow.

**Don't test:**
- Implementation details (internal state names, exact call counts) — they break on refactor.
- Third-party libraries.
- Snapshot-everything. Large auto-snapshots are low-signal; use targeted assertions.

> 💡 Tip: Query by accessible roles/text (`getByRole`, `getByText`), not by testIDs everywhere. It doubles as an a11y check.

---

## 3. Conventions

- Test files sit **next to source**: `MatchRow.tsx` → `MatchRow.test.tsx`.
- One behavior per `it`; describe the behavior, not the function name.
- Use factories/builders for test data, not giant inline fixtures.
- Reset mocks between tests; no shared mutable state.
- Mock the network with **MSW** (v2), not by stubbing fetch ad hoc.

MSW v2 uses the `http` + `HttpResponse` API (the old v1 `rest` / `res` / `ctx` form is gone):

```tsx
import { http, HttpResponse } from 'msw';

it('shows an error state when the request fails', async () => {
  server.use(
    http.get('*/matches', () => new HttpResponse(null, { status: 500 })),
  );
  render(<MatchList />);
  expect(await screen.findByText(/something went wrong/i)).toBeVisible();
});
```

For a successful response, return JSON with `HttpResponse.json(...)`:

```tsx
server.use(
  http.get('*/matches', () => HttpResponse.json([{ id: '1', name: 'Match' }])),
);
```

---

## 4. Coverage policy

- Coverage is a **guardrail, not a goal**. Chasing 100% produces bad tests.
- Enforce a floor on **logic-heavy** dirs (`services/`, `features/*/hooks`), not on UI glue.

| Area | Floor |
|---|---|
| `services/`, mappers, pure logic | 80% |
| Feature hooks | 70% |
| Overall project | 60% |

> ✅ Rule: Coverage floors are **enforced in CI**: 60% overall, 80% on logic dirs, 70% on hooks. A PR that drops coverage below the floor fails.

---

## 5. E2E

- **Maestro** is the default — YAML flows, low maintenance, great for CI.
- **Detox** only when a project needs fine-grained native sync/gestures Maestro can't express.
- E2E runs against **staging** builds (dev client or release), never prod.
- Keep E2E focused on a handful of **critical journeys** — they're expensive and flaky at scale.

> ✅ Rule: Every P0 user journey has at least one E2E test. New P0 flows ship with one.

---

## 6. Running tests

| Command | When |
|---|---|
| `yarn test` | Full unit/component run (CI) |
| `yarn test:watch` | While developing |
| `yarn test --coverage` | Coverage report |
| `yarn e2e` | E2E suite (local/CI on staging build) |

- Unit/component tests run on **every PR**.
- E2E runs on merge to the release branch (and nightly) — too slow for every PR.

---

## 7. CI gating

> ✅ Rule: `lint`, `typecheck`, and `test` must be green to merge. See 07-git-workflow (if present) and [08](./08-ci-cd-delivery.md).

---

## Settled decisions

- **Stack:** Jest + React Native Testing Library, MSW v2 (`http`/`HttpResponse`) for network mocks.
- **Coverage:** 60% overall / 80% logic / 70% hooks, enforced in CI.
- **E2E runner:** Maestro, executed in CI against staging builds via **Maestro Cloud** (no self-hosted device farm).
