# 09 · Quality & Monitoring

| | |
|---|---|
| **Owner** | Mobile Platform |
| **Status** | Active — approved standard |
| **Applies to** | Both Expo and Bare React Native apps |

> Defaults with rationale — see [../SKILL.md](../SKILL.md). Targets/budgets below are
> starting points; tune them per app rather than treating them as fixed.

Shipping is not done — knowing it works in production is. This covers crash reporting, analytics, performance budgets, and the release health loop.

---

## 1. Crash & error reporting — Sentry

- Captures JS errors, native crashes, and ANRs.
- **Source maps / debug symbols** uploaded in CI so stack traces are readable ([08](./08-ci-cd-delivery.md)).
- Tag every event with **release + dist** matching the build → issues group by version.
- Attach breadcrumbs (navigation, network) and non-PII user/session context.
- Error boundaries report caught render errors here with feature context ([05](./05-code-conventions.md#7-async-errors--loading)).

> ✅ Rule: Errors are reported to Sentry with context — never swallowed with an empty `catch {}`. Never attach PII/secrets to events.

**Release health targets:**

| Metric | Target |
|---|---|
| Crash-free sessions | ≥ 99.5% |
| Crash-free users | ≥ 99.0% |

> ✅ Rule: These thresholds gate rollout ramp-up ([08](./08-ci-cd-delivery.md)). Below target → halt/rollback. Triage is owned by Mobile Platform (rotating release captain).

---

## 2. Analytics

- Central **`analytics` service** wraps the vendor SDK. Features call our typed interface, not the vendor directly → easy to swap vendors and to test.
- **Event taxonomy** is documented and reviewed: `object_action` naming (e.g. `prediction_submitted`), typed properties, no free-form strings.
- Respect consent/privacy: no PII in events; honor tracking opt-out.

```ts
analytics.track('prediction_submitted', { weekId, count });
```

> ✅ Rule: New analytics events are added to the taxonomy doc in the same PR, with names + properties reviewed.
>
> **Vendor:** PostHog (analytics + feature flags), see [03](./03-services-and-infra.md#34-analytics).

---

## 3. Performance

**Budgets (starting points):**

| Metric | Budget |
|---|---|
| Cold start (TTI) | < 2.5s on a mid-tier Android device |
| JS bundle size | tracked; CI alerts on large jumps |
| Frame drops on core screens | maintain 60fps on scroll (no sustained jank) |

**Practices:**
- Use **FlashList** for long lists; virtualize.
- Memoize expensive renders; avoid unnecessary re-renders (stable callbacks, selectors).
- Run animations on the UI thread (**Reanimated** worklets), not JS.
- Lazy-load heavy screens/features.
- Watch Hermes startup + bundle size in CI.

> 💡 Tip: Measure on a **mid/low-tier Android device**, not just a flagship iPhone — that's where perf problems hide.

---

## 4. Release health loop

After each release:

1. Watch **crash-free rate** during staged rollout ([08](./08-ci-cd-delivery.md)).
2. Watch key analytics funnels for regressions (did conversions drop?).
3. If a threshold breaks → halt rollout / roll back OTA.
4. Only ramp to 100% once metrics are stable.

> ✅ Rule: Someone owns watching release health for the first 24–48h of a rollout. Ramping is gated on green metrics.

---

## 5. Logging

- Structured logging in dev; strip verbose logs in release builds.
- No PII / secrets in logs.
- Production diagnostics go through Sentry breadcrumbs, not `console.log`.

---

## 6. Alerting

- Sentry alerts on crash spikes / new high-frequency issues → routed to the **`#mobile-alerts` Slack channel**.
- A **rotating release captain** (weekly) owns first response to release-health alerts during and after a rollout.
- Analytics/backend alerts owned by their respective services.

---

## 7. Dashboards

Each project keeps a short "health" dashboard link list in its README:
- Sentry release health
- Analytics core funnel
- Store vitals (Play Android vitals / App Store metrics)

---

## Settled decisions

- **Crash-free targets:** ≥99.5% sessions / ≥99.0% users, gating rollout.
- **Cold-start budget:** < 2.5s on mid-tier Android.
- **Analytics/flags vendor:** PostHog.
- **Alert routing:** Sentry → `#mobile-alerts`; weekly rotating release captain owns first response.
