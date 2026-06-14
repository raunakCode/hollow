# Ch.3 THE YARD — lift-room rework (SHIPPED session 12) + Ch.6 idea bank

_Started session 11, **shipped session 12** (2026-06-14). Rooms B & C used to be
the same puzzle; that's fixed. **§4–§5 below are the ORIGINAL plan and are now
partly superseded — read §0 first for what actually shipped and why.** §6
(richer variants) and §7 (hard-won lessons) are still live and worth keeping for
Ch.6 (THE MACHINES)._

---

## 0. OUTCOME — what shipped, and the finding that changed the plan

**Shipped:** Room B = the **basic counterweight lift** (a box raises + holds B;
board the balanced platform and mantle the exit ledge). Room C = **THE CRANE**
(the brake): a crate cranks B up toward its top clamp, a **ceiling girder**
(row 15 over the mount gap) makes the clamp **un-mountable**, so you pull the
brake lever to freeze B at a mountable **mid** height (row 18) as it rises, then
climb it. Map rebuilt **95×24**. All in `js/levels1.js`; `dev/ch3.js` rewritten;
full suite green; browser render clean.

**The finding (why the plan's Room B was abandoned):** the brake **cannot be
made necessary against a player's own body.** Two engine truths:
1. **"Empty holds."** A platform you raise with your *body* stays put once you
   step off (0-v-0 balance), so the brake is never needed to *hold* it.
2. **Pogo-mantle.** To climb a raised platform you bounce off it (airborne ~95%
   of frames); it never accumulates the sink that would make a brake matter
   (traced: B sank 0.05 tiles before the player mantled away).

So the brake is only *robustly* necessary against a **persistent imbalance — a
crate.** Hence Room B is the plain counterweight lift and **only Room C carries
the brake.** Also note (measured with the now-deleted `dev/_probe_mount.js`):
over a 1-tile air gap a platform is mountable up to **3 tiles up** but not 4, and
a crate-driven B starting at the floor can only rise 3 tiles before its
platform-A partner leaves the map — so a *height*-unmountable overshoot was
impossible, which is exactly why Room C needs the **ceiling girder** to make the
top clamp un-mountable. The brake engine spec is §3 (unchanged, in the engine).

---

## 1. Why the current later half is weak (the honest critique)

Current Room B: push box onto platform A → A sinks, B rises → hop onto B →
mantle the plateau. Current Room C: push box onto platform A2 → A2 sinks, B2
rises → hop onto B2 → mantle a ledge → press a plate that latches the exit gate.

**Room C is Room B again** with a plate bolted on. Both are the single pattern
"load A, board the raised B." That's the *only* raise-and-use pattern the engine
allows with one box (see §2), so to get variety we must change what the engine
can do — minimally, with the brake.

## 2. The lift physics, exactly (so you don't re-derive it)

`updateLifts` (js/entities.js ~181) and `liftRects` (~110):

- Platform **A** top sits at `ay - off`; platform **B** top at `by + off`.
  `off ∈ [-travel, +travel]`. So A and B always move **opposite**: A up ⇒ B down.
- `targetVel = (wB - wA) * 58`, `vel` damps toward it (rate 6), `off += vel*dt`
  clamped to ±travel. Riders (heavies whose feet are within 8px of a platform
  top and x-overlap it) are **carried** by the delta.
- Weights: player = husk = box = **1** each. `heavies = [player, ...husks,
  ...boxes]` (game.js passes this).
- **Equal weight ⇒ targetVel 0 ⇒ holds wherever it is.** (Position is state —
  but the engine only lets you *set* a non-clamp position by balancing, which is
  hard to arrive at deliberately. See below.)
- The lift only comes to rest at: (a) a **clamp** (±travel), or (b) a balance
  point you happened to drift to.

### The three hard truths that make B & C samey
1. **The player can never ride a platform UP with ≤1 box.** To lift your side,
   the other side needs weight > yours. Max counterweight = 1 box = your weight
   ⇒ balanced ⇒ no lift. (Two boxes *would* let you ride up — see §6.)
2. **Boarding a raised platform alone sinks it** (your weight unbalances it).
   The *only* ways to stand on a raised platform: a counterweight (box) on the
   other side, **or a brake**.
3. Therefore the one in-engine "raise & use" recipe is: **box on A → B rises &
   is held by the box → board B (balanced 1-v-1) → climb off.** Rooms B and C
   both do exactly this. No amount of re-dressing makes them feel different.

**Conclusion:** the creative lever is to **decouple position from weight**. The
brake does that with ~8 lines of engine code and opens several new puzzle
shapes. Everything below is built on it.

## 3. Engine feature — the lift BRAKE / LOCK (small, additive, safe)  ✅ DONE (session 11)

**STATUS: implemented + verified session 11.** `lift.lock` is parsed in
`spawnEntities`, `updateLifts` freezes a locked lift (`evalSignals` + early
`continue`), and `dev/ch3.js` has an isolated brake assertion (locks under load,
resumes when released). Full suite stayed green (lock defaults null). **Rooms B
& C still need rebuilding to USE it (§4, §5) — that's the remaining work.** The
spec below is kept for reference.

A signal that **freezes** a lift in place regardless of weight. A big industrial
brake lever is peak INSIDE, and it's reusable in Ch.6 (THE MACHINES).

### Spec
- **Entity def:** `lift` gains optional `lock: 'sigId'` (a signal id). Default
  `null` (free) — so **every existing lift is unchanged** and current tests stay
  green.
- **spawnEntities** (js/entities.js, the `case 'lift'`): add `lock: d.lock ||
  null` to the pushed lift object.
- **updateLifts** (js/entities.js ~181): evaluate signals once and freeze when
  locked. Minimal diff:
  ```js
  function updateLifts(world, dt, heavies) {
    const sig = evalSignals(world);                 // NEW
    for (const L of world.lifts) {
      if (L.lock && sig[L.lock]) { L.vel = 0; continue; }   // NEW: frozen — skip weigh + off update
      const r = liftRects(L);
      ... (unchanged) ...
    }
  }
  ```
  When locked, `off` doesn't change so riders need no carry (dOff would be 0).
  Platforms stay solids (`collectSolids` unchanged) so you can stand/cross.
- **Driver:** any signal works because `evalSignals` reads **levers AND plates**.
  - A **lever** (id = the lock id) is the "brake handle": player pulls it
    (existing lever interaction in game.js, `Input.actPressed` near a lever) to
    toggle lock on/off. Let the player unlock + re-adjust freely.
  - Or a **plate** (e.g., a crate parked on a plate locks the lift) for hands-off
    variants.
- **Render (optional, defer):** a locked lift could draw its ropes **taut/4px
  brighter** or a little pawl; `Render.lift` is in render.js. Not required for
  the puzzle to work — do it in a polish pass. The lever already renders.
- **Docs to update when you implement:** ARCHITECTURE.md lift def line (add
  `lock`), DESIGN.md mechanics (add the brake to Counterweight lifts; record it
  in the "engine features" list as done), STATUS session entry.

### Verify the engine bit in isolation (before building rooms)
Add a tiny assertion to `dev/ch3.js` (or a scratch): make a lift, set
`L.lock='brk'`, add a `lever{id:'brk'}`; drive frames with a heavy on one
platform; assert `off` does NOT change while the lever is on, and DOES once
off. This de-risks the engine change from the (fiddly) geometry work.

## 4. ROOM B (reworked) — "CRANK": body-as-counterweight + brake

**One-line:** crank a platform up using *your own weight*, slam the brake, then
climb the platform you just raised — because you can't be the counterweight and
the climber at the same time.

**Teaches:** you are weight (riding sinks your platform, raises the other); the
brake **locks position independent of weight**; that's what lets you stand on a
platform nothing is counterweighting.

**Shape (tiles, floor row 20; tune exact cols with the harness — see §7):**
- Arrive on the floor (left).
- **Platform A** (board & ride down) in a 2-deep pit, `ay=20, travel=2`, `aw=2`.
- **Divider** (floor) just right of A, with the **brake lever** on it (id
  `'brkB'`).
- **Platform B** in a pit with the §7 **air-gap** (pit one col wider than the
  platform, gap on the divider side), `by=20, travel=2`, `bw=3`.
- **Exit ledge** right of B at **row 16** (a 4-tile face — bare-unclimbable).
- Lift: `{ ...A/B..., lock:'brkB' }`. Lever `{t:'lever', id:'brkB'}` on the
  divider. **No crate in this room** (so there's no box-cheese and the brake's
  necessity is pure).

**Intended solve:**
1. Step on A → A sinks (you=1 vs empty B=0), B rises to its clamp (row 18). Ride
   A to the bottom of its pit.
2. Mantle out of pit A back up to the divider. (B is now parked at row 18 —
   empty lift holds.)
3. **Pull the brake lever** → lift locks at row 18.
4. Hop over the air-gap onto the locked B (row 18, won't sink because braked) →
   mantle the exit ledge (row 16).

**Why the brake is *necessary* (the aha):** if you skip step 3 and just board B,
your weight (B=1, A=0) sinks B and rides you back down. Lock it first. You learn
the brake by failing once.

**Non-bypass / no-softlock:**
- Exit row 16 = 4 tiles, bare-unclimbable; needs B raised AND braked.
- No crate ⇒ nothing to box-climb the exit with.
- Pits 2-deep ⇒ always mantle out; R resets the chapter. No softlock.

**Open tuning Qs:** is "ride A down, then climb back to the divider to brake"
smooth, or should the brake lever be reachable *while riding A* (place it beside
A's descent so `actPressed` proximity catches it on the way down)? Try the climb-
back version first (simpler geometry); fall back to lever-beside-A if it's
clunky. Keep the checkpoint right before Room B.

## 5. ROOM C (reworked) — "THE CRANE": crate drives, you brake at a MID height

**One-line:** a crate's weight cranks the lift; you operate the **brake** to
freeze a platform at a chosen height it would otherwise sail past, using it as
an adjustable bridge to the exit.

**Teaches:** the brake sets an **arbitrary** position (a crane), not just the
clamp. The "difficulty in the plan": you must realize the clamp overshoots and
stop it mid-travel.

**Shape (tiles; tune with harness):**
- Come in on the floor; a **crate** at the start.
- **Platform A** (crate goes here) in a pit; **brake lever** (id `'brkC'`) on a
  small standing spot where you can watch platform B.
- **Platform B** spans a gap to the exit. The exit ledge is at **row 17**. The
  near lip is row 20 (floor). The gap is wider than a jump.
- Set `by`/`travel` so **B's clamp-up overshoots** to row 16 (too high to board
  from the floor and misaligned with the exit) and **clamp-down** is too low.
  The single useful step height is **row 18**: floor(20) → B(18) → exit(17).
- Lift `{ ...A/B..., lock:'brkC' }`, lever `{id:'brkC'}`.

**Intended solve:**
1. Push the crate onto platform A → B starts rising (crate=1 vs empty=0) at
   58px/s. (Crate drives so your hands are free to operate the brake — the
   "crane operator" feel.)
2. Stand at the lever; watch B rise. **Brake at ~row 18** (a generous ~1-tile
   band; un-brake and re-brake to fine-tune — *not* a twitch window).
3. Cross: floor → braked B(18) → exit ledge(17).

**Why the brake is *necessary*:** if you let B clamp, it's at row 16 — too high
to board from the floor and above the exit, so it's useless as a step. You must
stop it mid-travel. (If you instead drive with your body like Room B, you're on
A and can't reach the lever — so the crate-as-driver is the natural read.)

**Non-bypass / no-softlock:**
- Gap uncrossable without B parked at the step height; clamp positions don't
  serve. Crate can't be shoved across the gap (pit blocks it — reuse the Room B
  no-cheese geometry).
- Pits 2-deep; R resets. No softlock.

**Open tuning Qs:** the brake-timing must feel like "dial it in," not "react
fast." If 58px/s feels rushed, widen the acceptable band (make the exit
reachable from B anywhere in row 17.5–18.5) or shorten travel. Make sure
un-brake → re-brake actually lets the player nudge (it should: unlock resumes
weight-driven motion from the current off).

## 6. Richer variants (park here for an expanded Ch.3 or for Ch.6)

These need more than the §3 brake or more boxes; they're stronger but heavier.
Capture them so the ideas aren't lost.

- **Two-crate "ride UP" (no brake needed).** With 2 crates, B can outweigh you
  (2 v 1) so you finally **ride a platform upward**. Gotcha: loading is awkward —
  putting both crates on B sinks B (and raises A) *before* you can board A low.
  Needs a clever boarding geometry (board A while balanced at 1-v-1 with one
  crate on B, then add the second crate — but you can't reach B from A). Likely
  wants a brake too, or a stepped ledge to load the 2nd crate onto B. Good for
  Ch.6.
- **Cargo crane — "send a crate to hold the button."** Deliver a crate up onto a
  `hold`/`any` plate that holds the exit gate, so the crate presses the button
  you can't stay on. Needs 2 crates (one cargo on B, one + you as the >1
  counterweight on A) + brake (lock B up while you climb to it) + a clean
  **crate transfer** off the platform onto the ledge/plate. The transfer
  (pushing the crate sideways off a flush platform onto the ledge) is the fiddly
  part — prototype it before committing. Very thematic; maybe Ch.6's finale.
- **Reclaim-the-counterweight.** Exit so high it needs a platform-step *and* a
  crate-step, with only one crate (used first as the lift counterweight, then as
  the climbing step). Brake lets you lock the platform and take the crate back.
  Blocked by **vertical crate transport** (the crate ends up low on the sinking
  side; getting it up onto the raised platform has no clean move). Skip unless a
  transport mechanic exists.
- **No-engine fallback (if the brake is rejected): ride-and-step-off loop.** Ride
  platform A down and step off into a tunnel; A/B park (empty holds) with B
  raised; loop around and... you still can't *board* B without it sinking, so
  you'd need a crate counterweight there anyway — which collapses back to the
  current Room B. **This is why the brake is the real fix; the no-engine route
  can't escape truth #2.** Documented so nobody burns time re-discovering it.

## 7. Lessons already paid for (DO NOT re-derive — they cost real time)

1. **Air-gap mounts a raised platform.** A raised lift platform flush against the
   divider is **un-mountable**: its side is a wall and its underside a ceiling;
   the player's jump apex stalls at the platform bottom. Fix: make the platform's
   pit **one tile wider than the platform on the approach side**, so there's a
   1-tile **air gap** beside the platform's near edge. The player arcs up *over
   the gap* and lands on top. (Current Rooms B & C already do this — pit B is
   cols 58–61 with platform B at 59–61; keep that pattern.)
2. **HOLLOW has variable jump height** — a 1-frame jump tap is a *minimum* hop
   (~41px, < 1.5 tiles), useless for clearing 2 tiles. To clear a real ledge you
   must **hold jump ~16 frames**. The `dev/ch3.js` `climbRight` helper already
   does this (state machine: release on landing → press → hold 16 → release).
   Reuse it for any scripted climb. A *human* holds the button naturally; this
   only bit the script.
3. **Plates need you GROUNDED.** Hopping over a plate (airborne) doesn't press
   it. Room A's solve walks (grounded) across pa2; keep that in mind for any
   plate-driven brake variant.
4. **Mantle only triggers on TILE walls** (`res.hitX === 'tile'`, player.js
   ~275), never on lift platforms / boxes / doors. So a raised platform is a
   *step you jump onto*, and the ledge above it must be **tiles** to mantle. Cap:
   climb from last footing ≤ 102px (~3.2 tiles).
5. **Authoring rows:** build the 24×W strings with a throwaway column-range
   generator (fill/carve by col ranges, assert equal width, print a ruler) — the
   one I used was `dev/_gen_ch3.js` (deleted). Hand-counting 130-char rows is the
   error source; regenerate instead.
6. **Drive the real engine to validate.** `dev/ch3.js` boots `LEVELS[2]` and
   scripts the solve + bypass/softlock guards. Geometry that "looks right" often
   isn't (the air-gap bug was invisible on paper). Iterate against the harness.

## 8. Resume checklist (ordered)

1. Re-read §2, §3, §7.
2. Implement the **brake** engine feature (§3): `spawnEntities` lift `lock`,
   `updateLifts` freeze, evalSignals call. Run the full suite — **everything
   should stay green** (lock defaults null). Add the isolated brake assertion.
3. Rebuild **Room B** (§4) geometry with a fresh column generator; add the
   brake lever + lock. Keep Room A and the checkpoints; renumber if needed.
4. Rebuild **Room C** (§5) geometry; crate-driver + brake-at-mid; keep the
   no-cheese pit and the stairwell→exit.
5. Rewrite the Room B/C tests in `dev/ch3.js`: solve sequences (use the existing
   full-height `climbRight`), brake necessity (boarding un-braked B sinks; braked
   B holds), mid-height stop (C), non-bypass, no-softlock. Keep Room A tests +
   the exit→title test.
6. Full regression: `headless / fuzz / t5 / ch1 / ch2 / ch3` all pass; browser
   render of B & C clean (0 console errors), brightened zoom shows the lift +
   brake lever + (C) crate read.
7. Update DESIGN.md (brake mechanic + revised Ch.3 B/C text; mark the brake
   "done" in the engine-features list), ARCHITECTURE.md (lift `lock` field),
   STATUS.md (session entry), TASKS.md (note the rework under T8).
8. Delete this file (or trim to a "Ch.6 ideas" stub from §6) once shipped.

## 9. Decisions / rationale (don't relitigate without reason)
- Brake chosen over "more boxes" because it's smaller, more legible, and reusable
  in Ch.6; the 2-box "ride up" has an awkward loading problem (§6).
- Room B uses **body** as counterweight (no crate) so the brake's necessity is
  pure (a crate on A would already hold B, hiding why you need the brake).
- Room C uses a **crate** as the driver so your hands are free for the brake
  lever (crane-operator framing) and so it reads differently from Room B.
- Keep it **gentle** (Ch.3 is still teaching, no lethal hazards): generous brake
  bands, iterable (unlock/re-brake), checkpoints before each room.
