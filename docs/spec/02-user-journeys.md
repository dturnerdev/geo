# 02 — User journeys

**Status:** v1.0. Each journey lists the behaviour that MUST hold. The
acceptance tests are in `docs/backlog/`.

## J1 First launch

1. Open, then the start screen: globe, one line, "Start" (D175). Interactive
   in < 3 s on the reference device.
2. No sign-up, tutorial screens, age question (D93) or permission prompt.
   Links to accessibility settings and import are on the start screen.
3. The first round opens with a Meet, then its R1 question. A one-line tip
   teaches the tap (FE22).
4. Rounds 1–3 include a few hidden probes that set starting tiers (D97, D166).
   They're never called a test.
5. Order: Earth layers → continents and oceans → reference lines → home
   country → wider world by fame (D39).
6. Test before teaching: an adult who already knows France is never "taught" France.
7. After round 3: one optional card for daily budget and goal. Never shown again.

## J2 Five-minute session

1. Opens straight into play.
2. Warmup reviews, then (first session of the day) the daily challenge
   after the warmup (D72).
3. Mix of due reviews and a few new items. New items only when accuracy and
   backlog allow.
4. Every answer is saved before the next question appears. Quitting at any
   moment loses nothing.
5. Nothing marks "done for today" (D69).

## J3 Long session

1. Rounds chain with quiet atlas pauses. Never a hard stop.
2. Between rounds: public builds wait for a tap. Auto-continue is experiment
   E01 in internal and closed builds only (D73). "No time pressure" always
   means tap (D158).
3. Fatigue signals lead to lighter games, fewer new items, and Journey or
   Explore-style rounds.
4. At a pause, when fatigued or after 25 minutes of active practice: chapter
   end, "A good place to stop." "Keep going" is equally prominent. On by
   default for public release (D143, D179).
5. Past the daily budget: free play (curiosity, Journeys, deeper layers).
   New core items stay gated.
6. Occasionally: an interest fork (D81).

## J4 Back after a month

1. No messages about the gap.
2. Fading detail glows softly on the atlas. Countries never drop below
   "discovered".
3. A Refresh round (about 5 minutes at most) covers the highest-value lapses,
   core first.
4. New items pause until the backlog is manageable.
5. Restored items animate at the next pause. Coming back feels rewarding.

## J5 Explore

1. On map-answer questions, turning and zooming never park the round. On
   other questions, a turn > 30° or a zoom > 1 detail level parks it. The
   Explore control and the menu also park it (D133, D173).
2. Tap an item to see its card. Viewing a card is never a Meet and never
   counts as learning (D172). "Learn this next" and "Focus on this region"
   add learner emphasis.
3. Repeated disengagement pauses curiosity items silently (D31).
4. "Back to round", Back/Esc, or returning the camera to the question
   resumes. After more than about 10 minutes away, the rest of the round is rebuilt.
5. Choosing a topic counts as choosing an interest (at most 2 active) and
   starts a Theme run at the next pause.
6. Works offline at built-in detail.

## J6 Offline and updates to content

1. Every learning feature works with no connection.
2. Content checks: Android at most twice a day on unmetered, battery not low;
   web on open (D111).
3. Packs are signed and verified. They're applied at a pause, never mid-round (D163).
4. A failed or invalid pack is ignored. The previous pack stays in use.

## J7 Backup and new device

1. MVP: "Save a copy of your progress" exports the event log as a file.
2. Importing on another device merges by event ID (append-only, so no conflicts).
   State is rebuilt from the merged log.
3. Android: cloud backup off, device-to-device transfer on (D109).
4. Post-MVP: optional accounts add sync. The log format already supports it.

## J8 App update

1. Saved data is upgraded at read time. Progress is never lost (D137).
2. Web: a new version activates at the next launch, or at a pause with no
   round open. Never mid-round (FE31).
3. Every app version keeps receiving readable content packs for 5 years.

## J9 Daily challenge

1. A new challenge at 04:00 local time (D134), the same for everyone on that local day.
2. 5 questions: place a point, aim, put in order, and one flag pick (D174). No timer.
3. Shown after the warmup in the first round of the day (E04), and in the
   menu until the day ends. "Skip" is always there. No reminder, no "missed" message.
4. Separate from learning: no effect on memory, atlas, metrics or daily budget.
5. Share: plain text through the device share menu. No personal data. No archive.
6. Works offline (schedule shipped in the pack, at least 90 days ahead).

## Accessibility variants (apply to every journey)

| User | Must hold |
|------|-----------|
| Screen reader | Every question has a list alternative. Atlas summary (D160). "No time pressure" on automatically (D158) |
| Keyboard only | Full session without a mouse. Explore control, crosshair answering |
| Colour-blind | Never colour alone. Colour names on flags. Optional colour-vision setting (D129) |
| Dyslexic | Spelling support: near-misses rated Good |
| Motor-impaired | 48 px targets, switch access, no timed actions. Blitz, the only timed mode, is optional, off by default and hidden with "No time pressure" |

