# 01 — Vision and scope

**Status:** v1.0. Decisions: D1–D8, D11, D19, D41, D45, D86, D92, D93, D103,
D137, D141, D142, D149, D161, D162, D172, D174, D176, D177, D182.

## 1. Core idea

A geography learning app with no end point (D1). Five minutes is useful; so is
a multi-day binge. It feels endless because of four things together:

- A **scheduler** that decides what comes next. The scheduler is the product.
- **Many facets per item** (location, name, shape, flag, capital, neighbours …).
- **Many formats per facet** (tap, place, type, order, aim, draw …).
- **Layers that unlock** (Earth layers → continents → countries → regions,
  cities, rivers, plates → deep facts).

## 2. Audience

- Designed for confident readers aged 10+, mainly secondary school, college,
  university and interested adults (D2).
- Every user is treated as under 18. No age question (D93).
- Play Store target bands: 9–12, 13–15, 16–17, 18+ (D142). Designing for 10+
  stands.
- Home learners first. School features are post-MVP, but their structures
  (goals, emphasis) are built now (D55, D64).

## 3. Platforms and markets

| Platform | MVP | Notes |
|----------|-----|-------|
| Web | Yes | UK and US. Installable, works fully offline |
| Android | Yes | UK Play Store only (D141). Android 10+ (D135) |
| iOS | No | Nothing may rule it out (D3). iPhone users use the web app |

Markets: UK and US in the MVP, Europe next. China, Russia and India are
excluded until reviewed legally (D86, PK04). US Android waits for PK09.

## 4. Business model

- Free (D4). No ads, no selling data, no third-party code (D103).
- Paid options (likely cross-device sync, school licences) are deferred. They
  must be switchable on later without a rewrite.

## 5. Principles

### Product
1. **Learning per minute, not minutes per day.** Time spent is never a goal (D149).
2. **Calm.** No pop-ups, guilt, streak-break or "done for today" messages.
   Reminders only if the user turns them on (D32, D69, D78, D177).
3. **Game first.** Every interaction is a question with feedback, never passive study.
4. **Everyone gets every channel.** No learning-style matching. Personalise by
   item and facet (D19).
5. **Automatic, not configured.** The app works out what you know. No likes,
   ratings or self-grading (D17, D20).
6. **Evidence decides.** Simulations, shadow evaluation and pre-registered
   experiments (D62, D150).

### Engineering
1. Readable and maintainable beats clever or efficient (D7).
2. Progress survives every update. Support is honoured for years (D11, D137).
3. Deterministic engine. Same input, same output, every platform (D22).
4. Nothing about the user leaves the device (D103).
5. Accessible and colour-blind safe by default (D124, D125).

## 6. Success

North star: **durable knowledge**, meaning item-facets with predicted recall
of at least 0.90 30 days ahead (D149, FE04). Primary metrics: surprise-check
accuracy, efficiency, calibration. Details in `08-experiments-and-metrics.md`.

## 7. What the app teaches

**In:** the knowledge geography rests on (D45):

| Kind | Example |
|------|---------|
| Place | Where is Kazakhstan? |
| Relationship | Which countries does the Danube cross? |
| Concept | Which plate boundary makes fold mountains? |
| Skill | Read off a latitude and longitude |
| Change over time | Swaziland became Eswatini |

**Out:** essay-style evaluation, fieldwork, case-study argument. The app
teaches what those rest on, not the reasoning built on top.

## 8. MVP scope

| In | Out (structures built now, D41) |
|----|--------------------------------|
| Web + Android (UK) | Accounts and sync |
| Local-only progress, export and merging import (D92, D164) | Street-level detail (PK07) |
| Three.js globe + flat map (D119, D153) | Teacher tools, deadline goals, printable tests |
| Content: F01–F17, F24, F19 (home regions) | Content for F18, F19 outside home country, F20–F23, F25–F34 |
| Primitives P1–P9 | Speech input P10 |
| UK and US region data, en-GB and en-US | Topicality, class atlas |
| Hidden placement, Explore, Topics, forks | Push and web notifications, iOS, US Android |
| Daily challenge, Living Atlas, atlas summary, progress view | Solar system Easter egg, 3D cross-section (PK12) |
| Sound effects, positive haptics (D162) | Music (channel exists, off, D161) |
| Weekly rhythm, opt-in Android reminders (D176, D177) | Monthly rhythm variant |
| Blitz (flag off by default), free play only | Daily Blitz, Blitz scores |
| Experiments in internal and closed builds only | Opt-in summaries for all users (PK06) |

## 9. Never (not just "not in the MVP")

- Leaderboards, lifetime XP, levels, badges, in-app currency
- Daily streaks (D93, D176)
- Ads, third-party analytics or SDKs
- Guilt or loss-aversion messaging
- Haptics or harsh sounds for wrong answers
- Self-rating, learning-style matching
- Generative AI inside the app (AI only drafts content offline, human-reviewed)

## 10. Inspirations (D6)

| Source | What we take |
|--------|--------------|
| Seterra | Tap the place on the map |
| Worldle | Shape guess with distance and direction feedback, daily format |
| Travle | Connect countries through neighbours (Pathfinder) |
| WhichWay.is | Aim a beam towards a place (Bearing) |
| "Which way?" (river game) | Draw which way a river flows (Flow) |
| Flagle, Statele | Flag and region variants |
| HexHunt | Daily geography game (inspiration only) |

Not GeoGuessr (Street View), not Duolingo (streak pressure).

**Name:** working title only. "Travle Globe" can't be used (PK11).

