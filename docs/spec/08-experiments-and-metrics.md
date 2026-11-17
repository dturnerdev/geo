# 08 — Experiments and metrics

**Status:** v1.0. Decisions: D62, D73, D92, D103, D143, D149–D152, D163,
D179, D180, D184. Metric formulas: FE04. Flags and assignment: FE03.
Experiment register: FE27. If this file and a feature file disagree, the
feature file wins.

## 1. Principles
1. Measure learning, not engagement. Time spent is never a goal (D149).
2. Every metric is worked out on the device from the event log (FE04).
   Nothing leaves the device unless the user sends it (D92, D103, D180).
3. Simulation first. Every variant runs through the harness before anyone
   sees it (D150, FE18).
4. Public builds always get variant A. B and C exist only in internal and
   closed builds (FE03, FE27).
5. About 20 testers can show harm but can't prove benefit. Decisions follow
   D184 (§6).

## 2. North star (D149)
**Durable knowledge:** item-facets with predicted recall of at least 0.90 30 days ahead (FE04).
- The harness reports it from predicted and from true memory (FE18). Variants
  are compared on true memory only.
- Never shown to the user as a score or target.

## 3. Metric tiers

| Tier | Role | Metrics |
|------|------|---------|
| 1 | North star, decides | Durable knowledge |
| 2 | Primary (D149), also guardrails per §7 | Surprise-check accuracy · efficiency · calibration RMSE (bins) |
| 3 | Guardrails only | In-session accuracy (target about 85%) · "Show me" rate · chapter-end and fatigue rate · invariant violations |
| 4 | Explains | Transfer · new item-facets per local day · backlog · interval distribution · time to first established item · active practice minutes · park rate · "Keep going" rate |

Never a goal or decision metric: time in app, sessions per day, days
returned, rhythm length, reminder opens. Names and formulas follow FE04.

## 4. Evidence

| Source | Builds | Shows | Limits |
|--------|--------|-------|--------|
| Simulation harness (FE18) | CI | True recall, every metric, invariants, thousands of learners | Only as good as the truth model and profiles |
| On-device metrics (FE04) | All | The user's own numbers | Never leave the device |
| Donated tester logs (FE30, D180) | Closed | Full logs, with consent | About 20 self-selected adults |
| "Share a summary" (D151) | Closed | Allowlisted totals | Same group, fewer fields |
| Feedback (FE24, FE30) | All | What people say | Qualitative only |

## 5. Lifecycle
1. **Pre-register** `experiments/Exx.md` (§8) before code ships. IDs come
   from the FE27 register and are never reused.
2. **Simulate** every variant on the reference population (D150). Stop if
   any invariant breaks or a guardrail is worse than §7. Attach the report.
3. **Internal build** for at least 1 week (placeholder), to check it works.
4. **Closed build:** at most 3 live, each at least 2 weeks (placeholders,
   FE27). Assignment per FE03, fixed per install for the experiment's life.
   Changes apply at a pause (D163).
5. **Analyse once,** at the pre-registered end date. Only §7 stop rules end
   an experiment early.
6. **Decide** (§6). Record the result in `Exx.md`. A new public default needs a D entry.
7. **Close:** remove the definition from the pack. Every install moves to
   the decided default at its next pause.

Experiments that affect nudging (pacing, auto-continue, prompts) need a DPIA
check before the closed build (Children's Code standard 13, D73, D143).

## 6. Decision rule (D184)
B or C replaces A as the public default only if all of these hold:
1. **Simulation:** true-memory durable knowledge is higher than A in the
   smoke and full runs, with no guardrail worse than §7.
2. **Testers:** no guardrail worse than §7. Groups are compared by medians
   with bootstrap 95% intervals. Never a p-value alone.
3. **Feedback:** no open S1 or S2 issue (09 §8) and no blocker named in the
   pre-registration.
4. **Nudging:** DPIA updated where §5 applies.

- If the harness can't model a variant (UI-only, such as E03), step 1
  checks invariants only. The decision rests on steps 2–4.
- Step 2 inconclusive because of sample size: the decision is a judgement,
  explained in the D entry.
- When unsure, keep A.

## 7. Guardrail margins and stop rules (placeholders)

| Guardrail | Worse means |
|-----------|-------------|
| Calibration RMSE (bins) | Up by > 0.01, or above 0.05 |
| Surprise-check accuracy | Down by > 5 points |
| In-session accuracy | Outside 80–90% |
| "Show me" rate | Up by > 5 points |
| Chapter-end or fatigue rate | Up by > 25% relative |
| Efficiency | Down by > 10% relative |
| Invariant violations | Any |

**Stop at once** and revert to A with the next pack (FE03) on:
- any S1 bug,
- a guardrail worse than twice its margin, or
- a tester report of pressure or distress.

## 8. Pre-registration template

```markdown
# Exx Title
- Question:
- Variants: A (current default), B, C
- Owner feature, flag key:
- Builds: internal, closed
- Primary metric:
- Guardrails and margins (default 08 §7):
- Harness can model it: yes / no
- Start, end, minimum length:
- Decision rule: D184 unless stated
- Nudging or DPIA impact:
- Simulation report:
- Result, decision, D entry: (at the end)
```

## 9. Model trial: E09 (FE13 item 11, D62)
- A FSRS-6, B FSRS-7. Internal and closed builds only.
- **Joining B:** append `ParametersAdopted` with `modelVersion: 'FSRS-7'` and
  population defaults. Full replay at the next pause.
- **Leaving B** (end or rollback): re-adopt the user's most recent FSRS-6
  parameters from the log, or the population defaults if there are none. Full replay.
- **Decision:** the FE13 switch checks replace §6. Public builds stay on
  FSRS-6 until the ADR is accepted (AC-13.11).

## 10. Placeholders
- Live experiments: at most 3, each at least 2 weeks (FE27).
- Internal stage: at least 1 week.
- Guardrail margins: §7.
- Metric minimum sample: FE04.

All of these are listed in `placeholders.md`.
