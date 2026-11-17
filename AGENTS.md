# AGENTS.md — Rules for every coding agent and contributor

Offline-first geography learning app (web + Android). The spec in
`docs/spec/` is the source of truth. This file summarises it. If they
disagree, the spec wins: stop and raise an issue. Never guess.

## 1. Before you write code
1. Read the feature file (`docs/spec/05-features/`), every D and ADR it cites, and `07`.
2. Turn the acceptance criteria into failing tests first. Test names start with the AC ID.
3. One feature per PR. Small PRs preferred.
4. Changing another package's public interface needs an ADR.
5. A new runtime dependency needs a PR adding it to the allowlist with a reason (07 §2).
6. Unclear requirement: ask. Don't invent behaviour.

## 2. Non-negotiables
- **Privacy (D103, FE29):** nothing about the user leaves the device. No
  analytics, ads, crash reporting, remote config, third-party fonts or CDNs.
  The only host is our static pack host.
- **Android permissions (D178):** `INTERNET`, `VIBRATE`, `POST_NOTIFICATIONS` only.
- **Offline-first:** every learning feature works with no connection.
- **Determinism (07 §6):** same input, same output on every platform. Time, zone and seed are always passed in.
- **Append-only events (FE01):** never edit or delete an event. The only exception is "Delete everything".
- **Import merges, never replaces (D164).**
- **Changes apply at a pause, never mid-round (D163).**
- **Accessibility (D124):** WCAG 2.2 AA, keyboard, screen reader, 200% text, 48 px targets.
- **Colour-blind safe (D125):** never colour alone, never red/green, Okabe-Ito tokens only.
- **Children first (D93):** everyone treated as under 18. No guilt, no "done
  for today", no daily streak. Reminders only if the user turns them on (D177).
- **Experiments:** internal and closed builds only. Public builds always get variant A (FE03, FE27).

## 3. Stack and layout
Stack: 07 §2. Repo layout: 07 §3. Placeholder values live only in
`engine/tuning.ts` (`placeholders.md`).

## 4. Import rules (CI gate 2, full table in 07 §4)

| Package | May import |
|---------|-----------|
| domain | Zod |
| engine | domain. `engine/geo/` also d3-geo. `engine/memory/` also ts-fsrs and the binding |
| storage, content | domain |
| audio | domain |
| globe | domain, `engine/geo`, Three.js, troika-three-text, d3-geo |
| app-shell | domain, engine, storage, content, audio |
| ui | domain, engine (pure read functions), app-shell, globe, audio |
| apps/* | Anything |

Only app-shell creates event IDs, reads the clock, zone and flags.

## 5. Coding rules
All 22 rules in 07 §7. The ones agents break most often:
- No `any`, no non-null `!` outside tests, no `enum`, no default exports.
- `Result<T, E>` for expected failures. Throw only for bugs.
- Zod at every boundary.
- Lint warns on functions over 60 lines and files over 400.
- No user-facing text in code. FormatJS keys only. Never join fragments.
- US spelling in identifiers, British in docs and en-GB text (D99).
- Comments explain why and cite D, FE or AC IDs.

## 6. UI and globe rules
- Labels hidden until the name facet is established, and during questions about the item (D121).
- Taps graded by the engine against pipeline tap zones. Flat-map taps go through the inverse projection (D118, D153).
- Camera movement never parks a map-answer question (D173).
- Aids never lower a rating (D128). Haptics positive only (D162).
- "No time pressure" always forces tap to continue (D158).
- The renderer is created only inside `GlobeController`.

## 7. Budgets (09 §5, Galaxy A07 4G)

| Measure | Budget |
|---------|--------|
| Cold start to interactive start screen | < 3 s |
| Restore from 10,000 events | < 2 s |
| `append` of one answer | p95 < 20 ms |
| Round build | p95 < 50 ms |
| Globe | 60 fps, never below 30. Redmi A5 ≥ 30 fps |
| Web first load | ≤ 3 MB |
| Android package | ≤ 40 MB |

## 8. CI gates (09 §3)
1 Type check · 2 Lint, format, import boundaries, strings · 3 Reference
replay · 4 Simulation harness · 5 E2E with network audit · 6 Screenshots
and accessibility · 7 Unit and property tests, AC coverage, spec references ·
8 Size budgets and bundle inspection · 9 Supply chain and licences ·
10 Content pipeline and signing · 11 Android manifest
