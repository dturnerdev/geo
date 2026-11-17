# Placeholders

**Status:** v1.1. Every value marked (placeholder) in the spec. Engine values
live in `engine/tuning.ts`. Others live in the named config.

## Rules
1. A value changes in the owning feature file, this file and its config in one PR.
2. Values are tuned by the simulation harness (FE18) or set by an experiment.
3. A new placeholder needs a default in the same PR. "No value yet" is not allowed.
4. If this file and a feature file disagree, the feature file wins.

## Memory and scheduling

| Value | Default | Owner |
|-------|---------|-------|
| Learning step 1 | Same round, at least 3 questions later | FE13 |
| Learning step 2 | Next round | FE13 |
| Learning step 3 | Next local day | FE13 |
| Desired retention | Core 0.90, curiosity 0.85, deep 0.80 | FE13 |
| Maximum interval | 730 days | FE13 |
| Calibration gate | RMSE (bins) < 0.05 | FE13, FE18 |
| Optimiser first run | ≥ 1,000 reviews over ≥ 30 local days | FE17 |
| Optimiser re-run | 500 more reviews or 30 days | FE17 |
| Optimiser adoption | Log loss ≥ 1% better on held-out reviews | FE17 |
| M2 stand-in intervals | 1, 3, 7, 21 days (replaced in M3) | FE15 |
| FSRS-7 same-day calibration | RMSE (bins) < 0.05 | FE13 |

## Selection and unlocking

| Value | Default | Owner |
|-------|---------|-------|
| Tier opening | 70% of the previous tier's core item-facets established | FE14 |
| Level ladder | < 2 d R1, 2–7 d R2, 7–30 d R3, ≥ 30 d R4 | FE14 |
| Backlog margin | Recall 0.10 below target | FE14 |
| Backlog threshold | 30 item-facets | FE14 |
| Accuracy gate | Recent accuracy ≥ 85% | FE14, FE15 |
| New-item limit | 20 item-facets per local day | FE14 |
| New-to-review ratio | 1 new to 3 reviews | FE14, FE15 |
| Pacing | 3–7 new facets per 5 min, 2–3 new items per round | 03 §4.5 |
| Journey trigger | Session > 10 min and ≥ 4 linked established items | FE14 |
| Emphasis duration | 30 days | FE14 |
| Emphasis cap | 3 active (fork and Topics entries: at most 2, FE20) | FE14 |
| Emphasis weight | ×2, within a priority level | FE14 |
| Daily budget | Options 5, 10, 15, 20. Default 10 | FE14 |
| Contrast card | After the 2nd confusion of the same pair | FE16 |
| Curiosity pause | 3 "Show me" in a row → paused 30 local days | FE14 |
| F13a prerequisite | F03 established for 2 related countries | FE14 |

## Rounds and fatigue

| Value | Default | Owner |
|-------|---------|-------|
| Round length | 60–120 s (D71, E06) | FE15 |
| Questions per round | 6–12 | FE15 |
| Load budget | About 12 per round, at most 1 heavy | FE15 |
| Load per primitive | FE10 table. A game may override | FE10 |
| Boss recall | 0.70–0.80 | FE15 |
| Surprise rate | About 5% of review slots | FE15 |
| Surprise eligibility | First learned ≥ 30 days ago, not reviewed in 7 days | FE15 |
| Fatigue: accuracy | > 10 points below session start | FE15 |
| Fatigue: response time | > 30% above usual | FE15 |
| Engagement nudge | ±20% game weight (D20) | FE15 |
| Refresh round | At most about 5 min | FE15 |
| Rebuild after park | 10 min | FE15 |
| Chapter end time | 25 min of active practice (D179) | FE27 |
| Feedback dwell | ≥ 1.2 s before any automatic continue | 06 §6 |
| Auto-continue (E01 B) | 3 s | FE27 |

## Grading

| Value | Default | Owner |
|-------|---------|-------|
| Fast window | Own median, last 20 answers per game and input method | FE11 |
| Fast minimum | 5 samples | FE11 |
| `grade` time | p95 < 5 ms on Galaxy A07 4G | FE11 |
| Typing tolerance | Typos allowed after normalising: 1–4 letters 0, 5–8 letters 1, ≥ 9 letters 2. Spelling support +1 at each length | FE11 |
| Typing ambiguity | Not accepted if another valid name is as close or closer | FE11 |
| Bearing beam | Either side of the exact bearing: the larger of R1–R2 20°, R3 15°, R4 10° and half the target's width seen from the start | FE11 |
| Bearing near miss | Up to 15° beyond the beam edge | FE11 |
| Distance tolerance: points | 75 km | FE11 |
| Distance tolerance: areas | From the tap zone edge: larger of 25 km and 25% of √(area/π) | FE11 |
| Distance tolerance: lines | 50 km from the line | FE11 |
| Draw tolerance | Mean distance from the route ≤ larger of 50 km and 5% of route length | FE11 |

## Map and atlas

| Value | Default | Owner |
|-------|---------|-------|
| Labels on screen | ≤ 60 | FE06 |
| Established | Correct on 2 local days, stability ≥ 3 days | FE08 |
| Fading | Predicted recall < 0.70 | FE08 |
| Pause animation cap | 12 items | FE08 |
| Zoom hysteresis | Detail rises at threshold T, drops only below T − 0.25 zoom levels | FE09 |
| Maximum zoom | Smallest core item fills about a third of the screen | FE09 |

## Audio and haptics

| Value | Default | Owner |
|-------|---------|-------|
| Music ducking | −10 dB, 150 ms attack, 400 ms release | FE12 |
| Loudness | Voice −16 LUFS, music −23 LUFS, effects peak ≤ −1 dBTP | FE12 |
| Combo pitch | Up to 5 steps | FE12 |
| Effect voices | 2 | FE12 |
| H01, H02 | 10 ms | FE12 |
| H03 | 15, 40, 25 ms | FE12 |
| Haptic gap | ≥ 300 ms (D162) | FE08, FE12 |

## Storage and metrics

| Value | Default | Owner |
|-------|---------|-------|
| `append` time | p95 < 20 ms | FE01 |
| Active practice cap | 60 s per answer | FE04 |
| Durable knowledge | Predicted recall ≥ 0.90 in 30 days | FE04 |
| Surprise accuracy age | First learned ≥ 30 days ago | FE04 |
| Metric minimum sample | Rates 30 answers. Calibration 200 answers and ≥ 20 per bin. Surprise accuracy 20 checks | FE04 |
| Diagnostics buffer | 1 MB or 30 days | FE04 |
| Distance rounding | Per D116 | FE05 |

## Experience

| Value | Default | Owner |
|-------|---------|-------|
| Explore idle drift | After 10 s | FE19 |
| Park: turn | > 30° (D173, E07) | FE19 |
| Park: zoom | > 1 detail level (D173, E07) | FE19 |
| Park: background | > 5 s | FE19 |
| Fork interval | ≥ 3 sessions | FE20 |
| Session gap | 30 min | FE20 |
| Fork weight, duration | ×2, 30 days | FE20 |
| Fork share | ≤ 30% of new-item slots per local day | FE20 |
| Fork fade | 3 "Show me" in a row | FE20 |
| Daily challenge length | 5 questions | FE21 |
| Daily schedule horizon | ≥ 90 days | FE21 |
| Budget and goal card | After round 3 | FE22 |
| Probe rounds | Rounds 1–3 | FE22 |
| Probes per round | ≤ 3, from slot 3 | FE22 |
| Probe facets | F03, F06, F08 | FE22 |
| Probe stop | 2 misses in a row, cap 9 | FE22 |
| Placement correction | < 70% over 20 answers | FE22 |

## Optional modules

| Value | Default | Owner |
|-------|---------|-------|
| Rhythm week | ≥ 2 practice days | FE25 |
| Reminder time | 18:00, choices 07:00–21:00 | FE25 |
| Reminder stop | 7 unopened days in a row | FE25 |
| Blitz length | 60 s | FE26 |
| Blitz minimum | 12 established item-facets | FE26 |
| Blitz reduced-motion step | 10 s | FE26 |
| Score weights | Again 0, Hard 1, Good 2, Easy 3 | FE27 |
| Live experiments | ≤ 3, each ≥ 2 weeks | FE27 |
| Progress practice window | 12 weeks | FE28 |
| Mix-ups | Up to 3, last 30 days | FE28 |

## Testers, release and simulation

| Value | Default | Owner |
|-------|---------|-------|
| Testers recruited | 20 adults | FE30 |
| Donation reminder | ≤ 1 per 30 days | FE30 |
| Log retention | 24 months | FE30 |
| Staged rollout | 10%, 50%, 100%, ≥ 2 days per stage | FE31 |
| Durable target | Tier 1 within 60 days (CI gate 4) | FE18 |
| Placement sim: experts | Tier 3 within 3 rounds | FE18, FE22 |
| Placement sim: beginners | ≤ 2 probes | FE18, FE22 |
| Smoke run | 500 learners × 60 days | FE18 |
| Full run | 5,000 learners × 365 days | FE18 |
| Smoke run time | ≤ 10 min on the CI runner | FE18 |
| Reference population shares | Daily short 20%, daily standard 25%, binge 10%, sporadic 20%, returner 10%, expert 5%, accessibility 5%, traveller 5% | FE18 |

## Experiments

| Value | Default | Owner |
|-------|---------|-------|
| Internal stage | ≥ 1 week before the closed build | 08 |
| Guardrail margins | 08 §7 table | 08 |

## Quality and data handling

| Value | Default | Owner |
|-------|---------|-------|
| Floor-device budget | Reference budgets × 1.5 on Redmi A5 | 09 |
| Host log retention | ≤ 7 days, truncated IPs | 10, D183 |
| Email retention | Deleted once handled, ≤ 90 days | 10, D183 |
| Tester list retention | Programme end + 6 months | 10 |

