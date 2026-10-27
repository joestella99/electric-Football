# Electric Football — Two-Minute Drill

A 3D arcade American football game made with Three.js, React Three Fiber and TypeScript.
Inspired by classic electric tabletop football and the decision-making stakes of https://2mindrills.com/ — but independently made, with interactive user-timed and user-aimed throws.

**Play:** https://joestella99.github.io/electric-Football/

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
