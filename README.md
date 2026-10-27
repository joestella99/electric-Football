# Electric Football — Two-Minute Drill

A 3D arcade American football game made with Three.js, React Three Fiber and TypeScript.
Inspired by classic electric tabletop football and the decision-making stakes of https://2mindrills.com/ — but independently made, with interactive user-timed and user-aimed throws.

**Play:** https://joestella99.github.io/electric-Football/

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
