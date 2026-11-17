# Specification — README

**Status:** v1.1, 2026-11-17. Changes go through a PR that also updates
`decisions.md`.

## What this is

The complete specification for an offline-first geography learning app
(web + Android). It is written so that coding agents and humans can build
any feature without guessing.

## Order of authority

1. `decisions.md`: the current *Active* decision wins.
2. Feature files in `05-features/`.
3. The other section files.
4. `/AGENTS.md` summarises rules from the above. If it disagrees, the spec wins.

If two sources conflict, stop and raise an issue. Never guess.

## Files

| File | Contents |
|------|----------|
| `README.md` | This file |
| `glossary.md` | Every domain term, with ambiguity warnings |
| `decisions.md` | Decision register D1–D184, with status and owning features |
| `01-vision-and-scope.md` | Core idea, audience, platforms, success, MVP scope |
| `02-user-journeys.md` | Journeys J1–J9 |
| `03-learning-design.md` | Facets, discovery and Meet, games, scheduler, session builder, motivation |
| `04-content-and-data.md` | Sources, licences, countries, perspectives, regions, pipeline, audio |
| `05-features/index.md` | Feature index FE01–FE31: milestone, file, screens |
| `05-features/m0-foundations.md` … `m5-optional.md` | FE01–FE31 in the standard template |
| `06-ux-and-design.md` | Screens, navigation, design tokens, motion, sound and haptics |
| `07-architecture-and-standards.md` | Stack, repo layout, data flow, coding rules, coordinates |
| `08-experiments-and-metrics.md` | North star, metric tiers, evidence, experiment method and decision rule. Experiment list: FE27 |
| `09-quality-and-release.md` | Devices, test plan, accessibility testing, releases, support policy |
| `10-legal-and-compliance.md` | Laws, Play Families, Children's Code, privacy, testers, borders |
| `11-risks-and-parked.md` | Risk register and parked items |
| `placeholders.md` | Every (placeholder) value, its default and owning feature |
| `post-mvp.md` | Deferred scope and the structures built for it now |

Related folders: `docs/adr/` (one record per technical choice),
`docs/diagrams/` (Mermaid), `docs/backlog/` (tickets per milestone),
`docs/legal/` (DPIA, privacy policy and tester agreement drafts).

## Milestones

| Milestone | Features |
|-----------|----------|
| M0 Foundations | FE01–FE05 |
| M1 Map | FE06–FE09 |
| M2 Play | FE10–FE12, FE15 |
| M3 Learning engine | FE13, FE14, FE16–FE18 |
| M4 Experience | FE19–FE24 |
| M5 Optional modules and release | FE25–FE31 (D182) |

## ID schemes

| Prefix | Meaning | Example |
|--------|---------|---------|
| D | Decision | D56 |
| F | Facet | F03 Find it |
| FE | Feature | FE15 Session builder |
| AC | Acceptance criterion (per feature) | AC-01.4 |
| P | Interaction primitive | P8 Aim a beam |
| R | Difficulty level | R1 recognise … R4 produce |
| J | User journey | J4 Back after a month |
| S | Screen | S14 Atlas summary |
| A | Sound | A06 Atlas bloom |
| E | Experiment | E03 Points variants |
| PK | Parked item | PK07 Street detail |
| ADR | Architecture decision record | ADR-0007 |
| RK | Risk | RK03 Browser storage cleared |
| H | Haptic | H03 Atlas bloom |


IDs are never reused. A superseded decision keeps its number and points to
its replacement. A retired parked item keeps its number.

## Wording conventions

- **MUST / MUST NOT / SHOULD / MAY** as defined in RFC 2119.
- **(placeholder)**: the value lives in `engine/tuning.ts` and is tuned by the
  simulation harness. Never hard-code it.
- **Post-MVP**: design the data structures and hooks now. Build the UI and
  content later (D41).
- British spelling in docs and en-GB text. US spelling in code identifiers (D99).

## MVP scope at a glance

**In:**
- Web (UK and US) and Android (UK Play Store only, D141)
- Local-only progress with export and merging import (D92, D164)
- Three.js globe and Equal Earth flat map (D119, D153)
- Facets F01–F17 and F24, plus F19 for UK and US home-country regions (D70)
- Primitives P1–P9
- UK and US regions, en-GB and en-US
- Hidden placement, Explore and Topics, interest forks, daily challenge
- Living Atlas and atlas summary
- Sound effects and positive haptics (D162). Music channel present but off, no music shipped (D161)
- Weekly rhythm (streak module, flag on, user can hide it, D176) and opt-in Android reminders (D177)
- Blitz behind a flag (off by default), free play only
- Progress view (D181)
- Goal presets and daily budget setting (D170, D171)
- Experiments in internal and closed builds only. Public builds always get variant A

**Out, but with structures built now:**
- Accounts and sync
- Street-level detail
- Teacher tools, deadline goals, printable tests, class atlas
- Topicality
- Speech input (P10)
- Content for F18, F19 outside the home country, F20–F23 and F25–F34
- iOS, push notifications, web notifications
- US Android (Play Age Signals)
- Solar system Easter egg, 3D cross-section

## Changing the spec

1. Open a PR that edits the relevant spec file(s).
2. Add a new D entry, or amend one. Mark replaced entries *Superseded → Dx*.
3. If it's a technical choice, add an ADR.
4. Update the affected tickets in `docs/backlog/`.
5. A human approves the PR. Agents never merge spec changes.

