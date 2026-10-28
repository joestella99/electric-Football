# Electric Football — Two-Minute Drill

A 3D arcade American football game made with Three.js, React Three Fiber and TypeScript.
Inspired by classic electric tabletop football and the decision-making stakes of https://2mindrills.com/ — but independently made, with interactive user-timed and user-aimed throws.

**Play:** https://joestella99.github.io/electric-Football/

## V6 — Strategic Madden Lite (adaptive coaching)

The game is moving from a pass-target demonstration toward a football strategy game with **offense versus a reactive defensive coordinator**.

- The opposing coordinator (src/logic/strategy.ts) chooses the **next defensive look** using only previous plays, down and distance, game clock, and field position. It deliberately does **not** inspect the player's next playcall. Run-heavy sequences draw heavier boxes; long passing and repeated deep concepts invite different coverage and pressure, with deterministic variety.
- A compact **defensive scouting card** identifies the visible shell, pressure tendency, and recent-play trend. This is situational football information, not omniscience about hidden coverage rotations.
- Choose either **SNAP** directly for fast play or **CHECK DEFENSE** to approach the line, inspect the field, and make an audible. Audibles are optional and cost two game-clock seconds while the clock runs.
- The film room shows an A–D **coaching decision grade**, a 0–100 call-fit score, a tactical explanation, and a better alternative where relevant. This decision is assessed **before the snap**, without looking at the outcome. A drive-ending coaching report averages these grades.
- Call fit rewards situational decisions (clock preservation, third/fourth-down yardage, pressure beaters, deep shots when touchdowns are needed) and penalizes blindly repeating the same calls. It is an explicitly original and heuristic coaching score, **not a calibrated NFL win probability** or an official NFL grade.
- The existing V5 receiver buttons remain immediate throws, with bullet/touch timing, spatial coverage outcomes, play-action, rollouts and live blocking.
- No additional pages, constant 3D polling during playcalling, or forced intermediate screens. The 3D field starts only after you choose to check the defense or snap.

Known limits: this is still a simplified single-drive simulation. It does **not** currently implement complete NFL offensive/defensive possessions, a true play-by-play dataset, fully realistic tackling or blocking, licensed team playbooks, or a calibrated coaching decision model. Browser frame-rate, correctness and accessibility still need device-level playtesting.

## V5 — Immersive Coach → Quarterback Overhaul

**The entire interaction is replaced.** The V5 entrypoint is \`src/GameExperience.tsx\`, styled by \`src/experience.css\`. The previous UI remains in \`src/App.tsx\` as an archived reference, not the live game.

### A complete play flow
1. **Situation / Pregame:** Choose a real-era Super Bowl situation or select any two of the 32 NFL clubs.
2. **Call the play:** An actual offensive playbook screen replaces the dashboard-style controls. Filter calls by Pass / Deep / Run and study original, plotted five-receiver route diagrams. Change the formation and protection and, optionally, assign individual routes or click points on the diagram to draw a custom five-waypoint route. See pre-snap reads and a standalone situation board.
3. **Break the huddle:** The playbook closes and loads the 3D miniature tabletop. Player figurines and route previews show the called play. Special teams/timeout/clock management remain accessible.
4. **Snap:** The experience switches to a dedicated QB interface for passes or a live carrier/pursuit view for runs.
5. **Throw instantly:** Five large, labeled, status-aware receiver buttons are always visible during a pass. **Tap a button or press 1–5 to throw immediately.** There is no separate selection step, mouse targeting, manual reticle, or throw button. Live separation changes OPEN / WINDOW / COVERED status and player buttons become disabled as soon as the ball leaves the hand.
6. **Bullet vs Touch:** Switch with Q/E or tap the mode controls. Fast flat bullets and slower arcing touch throws have separate simulated flight durations, arcs, and movement-based predicted catch points. They are real simulated choices, not UI labels.
7. **Result and next call:** A clear field result and one “Call Next Play” action take you directly back to the coach's playbook. Completed and failed drives have retry and new-matchup actions.

### Performance
- The entire WebGL field is **unmounted during pre-snap play design**, avoiding GPU usage when browsing play cards and editing routes.
- When live, GPU-instanced 22-player figures and a static shared field preserve the performance work from V2.1.
- All gameplay remains in one viewport; phone layouts have compact receiver buttons and a scrollable playbook panel without scrolling the surrounding page.
- Uses native keyboard focus, responsive touch controls and a hardware-quality switch.
- The camera is lower and follows the football after the QB releases.

### Testing
Unit tests verify deterministic lead forecasting, all 32 team playbooks, historical scenarios, football field outcomes and **two physically distinct passing modes**. Still needs hands-on frame-time and accessibility/UX testing across devices; automated CI cannot substitute for visual gameplay testing.

## V4 — NFL Situations & Team Identity

**Opening experience:** start from a cinematic pregame menu rather than an embedded dashboard. Pick **NFL Moments** (historically grounded scenarios) or **Pick Your Teams** (select any two of the 32 NFL franchises). Once started, the game remains in a single viewport; use **Change Matchup** between plays to return to the selection screen.

- **All 32 NFL franchises** appear with their official club names, familiar color palettes, conferences and divisions. The scoreboard and miniature player jerseys update for both selections.
- **Historical challenge starts** for Super Bowl LVIII (Kansas City fourth-quarter 1:53 drive and overtime response), Super Bowl LII (New England at 2:21 trailing Philadelphia 38–33), and Super Bowl LVI (Rams' 6:13 finishing drive). Initial clock, score, and ball location derive from published game accounts. The subsequent gameplay is a new simulation, not a replay.
- For historical challenges, featured players are named from the actual era: Patrick Mahomes/Travis Kelce/Rashee Rice; Tom Brady/Rob Gronkowski/Danny Amendola; Matthew Stafford/Cooper Kupp, etc. Their selectable roles are alternate-outcome approximations, not exact NFL personnel packages on every snap.
- **Team-inspired original playbooks:** eight calls per team selected from conventional football concepts such as Mesh, Flood, Stick/Flat, Dagger, Four Verticals, Y Cross, Inside Zone and Outside Zone. Every play has its own five eligible receiver route assignments, formation and protection. Coaching notes summarize the defensive conflict the concept is designed to exploit. Style families include West Coast, Spread, Power, Vertical and Motion. These are **not the teams' proprietary official playbooks** and are not claimed to reflect a current coordinator's private system.
- An eight-tile play-call dock with live route previews, updated QB read suggestions, a persistent play explanation and team-personalized receiver targets.
- A simplified overtime *touchdown-only challenge* to make the Super Bowl LVIII sudden-win objective clear. This is a game mode, not a complete implementation of the NFL overtime rulebook.
- Fixed the previously unreachable touchdown condition: catches entering the painted end zone can now finish a challenge.
- Stadium turf, All-22 camera and graphics presets remain optimized for the single-screen gameplay.

### Intellectual-property and sourcing notes

This is an **unofficial, independent, noncommercial fan-made prototype**. No NFL affiliation, licenses, official team logos, uniform artworks, recordings, or player likenesses are included. NFL team names, historical scores and identified real players are used descriptively; source links are accessible from the historical challenge menu. Commercial/public release with official branding, logos or licensed data would require appropriate rights review. Do not scrape, redistribute or copy proprietary NFL playbooks or game footage into this repository.

## V3 — The Coach's Game

A gameplay-first overhaul focused on coaching decisions, recognizable defensive football and responsive single-screen play. **This is still an independently authored arcade physics model, not an NFL-licensed simulator.**

### Pre-snap
- Call a concept (Quick Game, Sail/Flood, Vertical Shot, RB Screen, Inside Zone or Outside Zone), offensive formation, and protection.
- Customize every eligible receiver route with a preset or draw your own path directly on the field.
- Identify the defensive **shell** and pressure look without knowing the complete coverage until the snap.

### Post-snap
- Defense rotates into distinct deterministic **Cover 0, Cover 1, Cover 2, Cover 3 or Quarters**; cornerbacks, safeties and linebackers have different man or zone responsibilities.
- Read the identified coverage, receiver separation and recommended QB progression; use the **TACTICAL** overhead camera to see subtle zone responsibility overlays.
- The QB camera stays stable while you read, then follows the ball on release. Click a receiver to make an assisted physical lead throw or aim anywhere manually to choose the landing spot.
- Receivers accelerate through cuts, defenders read routes and break toward the descending ball, and blocking changes pass-rush timing. A catch/breakup/interception is calculated from physical separation at the landing spot, not a random completion roll.
- Runs are now live spatial plays, not randomized yardage: QB handoff, carrier path, blockers, pursuit and tackles all update in the same engine.

### Presentation
- Procedural textured turf replaces layered flat stripes with fewer draw calls.
- All-22 coverage overlays, camera easing, real-time read indicators, and original synthesized sound cues for snap, release and play results.
- Graphics/FPS button retains Performance, Balanced and High presets; no extra scrolling during play.

### Known simulation limits
The physics are simplified positional/pursuit rules with acceleration, not full rigid-body or motion-captured tackle physics. The playbook and defensive assignment logic are intended to *teach reads* through meaningful visual consequences; they do **not** reproduce NFL play-by-play, licensed athletes, or calibrated real-world outcome probabilities. Collision animations and complete defensive/offensive drives remain future work. A visual browser playtest on multiple GPU/phone combinations is still necessary.

## V2.1 — Smoothness & performance

The football scene is now built to avoid hundreds of individual player mesh draw calls:

- All 22 miniatures share **11 GPU-instanced geometry parts**, including toy bases, bodies, helmets, arms, legs, face masks and ground shadows. One animation update controls them all.
- Static yard-line hash marks are GPU instanced too; fixed field geometry is memoized so clock updates don't rebuild it.
- The costly four auxiliary stadium point lights are removed. Graphics settings can hide spectators and reduce the internal render resolution on slower hardware.
- **Graphics button in the top-right** cycles Performance → Balanced → High. On wider screens it also displays measured frame rate. Phones default to Performance. Use this control to compare FPS on your device.
- Simulation time steps stay consistent at low frame rates, so the football and receiver timing don't slow down just because the GPU is struggling.
- UI clock/coverage updates run at much lower frequencies than the physics renderer; keyboard events are installed once instead of repeatedly.
- **One-click passing:** click an on-field receiver name to throw a real-world-modelled lead pass immediately, or click an exact point on the field to throw manually. SPACE/THROW NOW also uses a forecast of actual receiver motion instead of a separate scripted path.
- Camera easing now follows the play without abrupt target jumps.

The game can still run slowly on older/limited graphics hardware; no real browser benchmark across devices has been completed. The FPS toggle provides an actual device-level reading to diagnose that.

## V2 — The live route / catch-point engine

**The passing game is no longer a probability roll.** All 22 miniature players share one continuously updated spatial model. Receiver routes are interpolated through coach-selected waypoints; defenders pursue and adjust to them; rushers compress the pocket; the thrown ball has a visible flight path and landing point.

- **Design routes:** In the Coach's Board, select any eligible receiver and pick Slant, Out, Dig, Go, Post, Corner, Curl, Drag, Flat or Wheel.
- **Draw routes on the actual board:** choose Draw Custom Route, tap the field to add up to five waypoints, then finish the route. Mobile editing remains on the same screen.
- **Play the coverage, not a prerecorded outcome:** press Snap; routes and defenders move in one coordinate system. During the play, on-field receiver labels reflect current separation.
- **Throw at the break:** lead the chosen player using Space or click/tap an exact field location. The football travels to the chosen spot over measurable flight time while both teams continue moving.
- **Deterministic catches:** the ball is caught only when the intended receiver reaches its landing point. A defender can contest, break up or intercept if they get there before the receiver. An inaccurate ball misses. No completion/incompletion randomizer decides live passes.
- **Physical pocket progression:** pass rushers advance against the blocking line and can sack the quarterback; protection schemes change the pursuit.
- **Visual feedback:** moving receivers and defenders, animated football trail, contact landing ring, shadowed figures, diorama lighting and field camera.

### Scope / caveats
This is a deterministic, original **arcade spatial engine**, not full football physics or an NFL tracking-data product. Pursuit, blocking and collision radii are intentionally simplified. Defender coverage is not a trained NFL model; there is no weather, fatigue, realistic ball spin, possession turnovers outside the implemented play engine or full opponent offense. Realistic tackling, route-breaking animations, sophisticated zone matching and playbook breadth are still future improvements.

## V1.3 — Coach's Cut

This iteration shifts the game toward decisions a real offensive coach would recognize, while retaining its intentionally miniature, arcade-style presentation.

- **Interactive Coach's Board (C):** change formations among 2×2 Spread, Trips Right, and Bunch Left without leaving the live field. Select 5-man, Max Protect or Slide protection.
- **Meaningful tradeoffs:** max protection gives more time to read the defense but keeps the running back in to block; offensive spacing affects routes and several run/pass matchups.
- **Pre-snap reconnaissance:** single-high, two-high and heavy-front cues, plus situational coaching tips that react to the clock, distance and field position.
- **Coverage-read targeting:** receiver cards display OPEN / WINDOW / CONTESTED based on defender positions as routes develop. These are heuristic visual cues, not calibrated completion probabilities.
- **More detailed miniature football:** molded facemasks and spring-mounted bases, a complete 3D diorama with bleachers, spectators, lamps, goalposts, metal rails and a dressed tabletop cabinet.
- **No external navigation:** the coach board floats above the game; it closes on snap. On small screens, all gameplay remains in the same viewport.
- The help screen pauses the between-play game clock. Tactical adjustments do not pause the clock during an active drive.

### Unfinished gameplay systems
The current player animation is authored procedural motion, **not a collision-based rigid-body simulation**. It still needs blocking and tackle contacts, ball/receiver interception geometry, route assignment customization, audio and camera/browser playtesting. The opponent defense is AI-inspired but not trained on NFL games. The app is a playable portfolio prototype rather than a football simulator marketed as real-world accurate.

## The immersive v1.1 rebuild

The game is designed as a **single-screen experience**: the scoreboard is always visible, the miniature tabletop is the main focus, and the fixed bottom dock switches between playcalling and quarterback controls. There is no separate page to scroll through to find receivers or actions.

- **Auto-follow camera:** tracks the active line of scrimmage and pushes upfield as receivers progress; tap FIELD or TACTICAL to change angle.
- **Direct in-field play:** click or tap anywhere on the board to aim and throw during live passing plays.
- **On-field receiver tags:** select targets in the 3D scene or by the fixed receiver buttons, or press keys 1–5.
- **Readable routes:** selected receiver routes remain highlighted while you read the defense.
- **Timed pocket:** different defensive looks produce different pass-pressure windows.
- **Actual running clock between plays:** a completed in-bounds catch keeps the timer running until you snap, spike or call timeout.
- **No page scrolling:** play cards fit in a fixed dock, including on phone-sized screens.

## Play

- Start one of three late-game drives with score, clock, timeouts, down and distance.
- Choose from six offensive plays; run against Blitz, Loaded Box or Soft Zone.
- The 3D board includes 22 low-poly miniature players, a vintage metal field and adjustable cameras.
- On pass plays, receivers run live routes as soon as the ball is snapped. You choose who to throw to and when.
- Select receivers with keys 1–5 or their on-screen buttons. Click or tap a spot on the field to aim and throw immediately. Press Space or THROW NOW to lead your selected receiver.
- Beat the pass rush, get first downs, manage timeouts, spike the ball or attempt a field goal.
- Every game call and result updates the drive log.

## Commands

Requires Node 22 or newer.

    npm install
    npm run dev
    npm test
    npm run build

## Architecture

- src/App.tsx — Gameplay flow, scoreboard, controls, game state
- src/components/Board3D.tsx — Stylized vibrating tabletop, 22 figures, routes, reticle, animations
- src/logic/drill.ts — Clock, score, downs, runs and kicks
- src/logic/throwing.ts — Receiver route trajectories, pressure, aim error and pass resolution
- src/styles.css — Responsive vintage-style UI
- tests/drill.test.mjs — Automated unit tests

## Accuracy and attribution

This is a playable **arcade prototype**, not a calibrated football data simulator. All outcomes and grades are original heuristics, not NFL win probability, real play outcomes, or rankings. There is no live tracking data. A touchdown includes an automatic PAT; defense is simulated, not player-controlled.

The game is independently created and is not affiliated with Tudor Games, the NFL, its teams, or Two-Minute Drill. No third-party trademarks or logos are necessary to run it.

## Hosting

GitHub Actions builds and deploys the site from main. Vite uses the project subpath /electric-Football/. Pages must be configured to deploy via GitHub Actions under the repository Settings → Pages.
