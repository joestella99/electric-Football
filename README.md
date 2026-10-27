# PITCHCRAFT — Interactive Football Tactics Lab

**A portfolio-ready 3D sports technology prototype** built with Three.js, React Three Fiber, TypeScript and Vite. No external GLTFs, image files, paid APIs or sports feeds required: the entire pitch, goals, markers and lane overlays are rendered programmatically.

**Live demo (after GitHub Pages is enabled):** https://joestella99.github.io/electric-Football/

## GitHub Pages deployment

This repo automatically builds, tests, and deploys from `main` using `.github/workflows/deploy.yml`. For the first deployment, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. Then open **Actions → Deploy Pitchcraft to GitHub Pages → Run workflow** if the initial push failed before Pages was enabled. `vite.config.ts` sets `base: '/electric-Football/'` so assets work under the project URL.

## Quick start

Prerequisites: Node 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

```bash
npm run test   # 5 math/domain unit tests; requires Node 22+ for TS stripping
npm run build  # type-check and production build
npm run preview
```

## What you can do

- **Inspect the game in 3D:** orbit, zoom, switch camera perspective.
- **Reposition players:** drag any green numbered marker; alternatively select a player and click anywhere on the field.
- **Switch formations:** 4-3-3, 4-2-3-1, 3-5-2.
- **Switch opponent shape:** low block vs. high press, each changing the defender arrangement.
- **Explore passing lanes:** line color and sidebar ranking update when any player moves.
- **Turn on defensive radius:** draw opposing pressure zones.
- **Simulate a pass:** animate the top-ranked option and log the sequence.
- **Export your setup:** download the formation, coordinates, opponent shape and lane scores as JSON.

## Project architecture

```
src/
  App.tsx                  App shell, controls, session state and derived analytics
  components/PitchScene.tsx    All 3D geometry, camera, interaction and animation
  data/football.ts         Coordinates, formations and domain types
  logic/passing.ts         Geometric clearance and pass-lane heuristic
  styles.css               Responsive product UI
  main.tsx                 React bootstrap
tests/passing.test.mjs      Unit tests for domain/math logic
```

## About the lane index

**Important:** The passing-lane index is a transparent *illustrative heuristic*, **not** an expected-pass-completion percentage, an xG model, or a trained prediction. It combines:

1. Travel distance between passer and receiver.
2. Minimum 2D defender clearance along the line segment.
3. Forward progression toward the opponent goal.

Geometry is normalized to a 46 × 70 unit scene (approximately 69 × 105 metres), and display lengths are converted to metres. The index is clamped between 4 and 98. To make this an actual sports analytics product, use real positional tracking datasets, outcome labels and out-of-sample calibration. Consider StatsBomb Open Data for event-based exploration, but note that event data alone does not reveal all defender positions at every frame; full freeze-frame/tracking coverage is a separate requirement.

## Suggested roadmap

- **V0.2:** Add possession chains, a move timeline and undo/redo.
- **V0.3:** Import event data from open football data, and build synchronized event playback.
- **V0.4:** Incorporate positional tracking and train/evaluate pass completion models against held-out events.
- **V0.5:** Save and share annotated tactics in a simple backend; deploy the public demo.

## Resume bullet (once deployed and tested)

> Built an interactive 3D football tactics lab with Three.js, React Three Fiber, and TypeScript, featuring draggable player formations, geometric passing-lane analysis, defensive-pressure scenarios, animated pass sequences, and JSON scenario export.

## Notes

- Uses no live match data, teams, or trademarks.
- Initial demo supports 11v11 teams with fictitious players.
- Export is client-side and never sends formations to a server.
- Desktop works best for orbit navigation; controls and layouts adapt to smaller screens.
- This prototype is intended as a starting point for a sports-tech portfolio project.
