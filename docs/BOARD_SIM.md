# HD Chess Board Simulator — reference docs

Covers everything built across Phases 0–4 of the board simulator brief (see `docs/BOARD_SIM_PLAN.md` for the original Phase 0 plan). The Tournament Hall simulator (Part A) is a separate initiative with its own docs once started.

## What exists

| Piece | File | Notes |
|---|---|---|
| Piece/board geometry | `src/lib/chess-pieces.ts` | Procedural `THREE.LatheGeometry` Staunton profiles. No external models/textures. |
| Move-diff animation | `src/lib/chess-pieces.ts` (`diffBoards`) | Compares two FEN snapshots, classifies the change into flights (piece travels) and fades (captures). Bails to instant-snap if the diff looks like more than one move (e.g. a multi-ply jump). |
| 3D board | `src/components/learning/Chess3DBoard.tsx` | Exports `ChessSet` (embeddable group, used by the hall) and `Chess3DBoard` (own `<Canvas>`). Optional `interactive`/`onMove` props for click-to-move; `showCameraPresets` for White/Black/Top-down buttons. |
| Interactive board (2D+3D) | `src/components/learning/InteractiveBoard.tsx` | Owns its own chess.js game state (unlike the read-only `ChessSet`). Used by board exercises and `/dev/board`. |
| Accessible squares | `src/components/learning/accessible-square.tsx` | `squareRenderer` giving every 2D square a proper `aria-label`. |
| Chess clock (pure model) | `src/lib/chess-clock.ts` | Framework-agnostic: base time, Fischer increment, simple/US delay. No Laws-of-Chess rulings — it only counts time. |
| Chess clock (React) | `src/hooks/useChessClock.ts`, `src/components/learning/ChessClock.tsx` | Hook ticks the pure model via `requestAnimationFrame`; component is purely presentational. |
| Exercise types | `src/lib/board-exercises.ts` | `BoardExercise` union (6 kinds), `ExerciseResult`. Puzzle data only — no answer fields. |
| Exercise grading | `src/lib/board-exercise.functions.ts` | Server functions; the 4 mechanical kinds recompute the correct answer from the exercise's own PGN/FEN/time-control via chess.js — never trust a client-supplied "correct answer". |
| Exercise UI | `src/components/learning/BoardExerciseRunner.tsx` | Dispatches to the right UI per kind; wired into `simulations.$scenarioId.tsx`. |
| QA page | `src/routes/_authenticated/dev.board.tsx` (`/dev/board`) | Not linked from navigation. Playable board + clock demo, no DB content required. |

## How the pieces/board render (no Blender required)

`src/lib/chess-pieces.ts` builds one shared `THREE.BufferGeometry` per piece type using `LatheGeometry` revolves of a 2D profile (radius/height points), plus a lathed-body-and-boxed-head knight. Geometries and materials (one per color) are created once and shared across every piece on every board on screen. This was the brief's own fallback path for when Blender/CC0 GLB assets aren't available — as of 2026-09-20, **Blender 5.1.2 and KTX-Software (`ktx` CLI, replacing the old `toktx` binary) are both installed**, so real modeled/textured assets are now an option for a future visual upgrade. Swapping them in requires no changes to any consumer: `ChessSet`/`Chess3DBoard`/`InteractiveBoard` all take the same `fen`/`orientation`/`lastMove` props regardless of what's inside `getPieceGeometries()`.

## Move animation

`diffBoards(prev, next, lastMove)` in `chess-pieces.ts` categorizes a board-state change into:
- **flights**: a piece moves from one square to another (normal moves, castling's rook, promotion's pawn-becomes-queen)
- **fades**: a piece disappears in place (a captured piece, or the captured pawn in an en passant capture, which sits on a different square than the destination)

It bails to an empty diff (no animation, caller snaps instantly) if the change touches more than 4 squares — real moves never exceed that (castling is the largest) — or if pairing is ambiguous. This matters because `ChessSet` only ever receives a full `fen`, never a move list; the lesson viewer's step controls can jump many plies at once, and those jumps must never be animated as if they were one move. Respects `prefers-reduced-motion` (skips animation entirely).

## Interactivity

`ChessSet`'s `interactive`/`onMove` props (default off) let the side to move click a piece (highlights it, shows legal-move dots via `chess.js .moves({square, verbose: true})`) then click a legal target. `ChessSet` never mutates its own board — it reports the attempted move and waits for the caller to feed back a new `fen`, matching the existing controlled-component pattern.

`InteractiveBoard` wraps this (3D) and a parallel 2D implementation (`react-chessboard`'s `onSquareClick`/`onPieceDrop`) behind one component with its own `chess.js` game state, a 2D/3D toggle, and the same selection/legal-move-dot/last-move highlighting in both modes. This is the primitive board exercises are built on.

## Chess clock

`src/lib/chess-clock.ts` is pure and has **16 unit tests** (`bun run test` / `npx vitest run src/lib/chess-clock.test.ts`) covering running, pausing, flag falls, increment, and delay (including the split-tick-across-the-delay-boundary edge case). It intentionally does not know about the Laws of Chess — whether a flag fall is claimable is an exercise/incident-layer question, never this file's.

`useChessClock(timeControl)` ticks it via `requestAnimationFrame` using real elapsed-time deltas (not `setInterval`, which drifts under tab throttling). `ChessClock` is purely presentational so a future 3D physical clock model, or the hall, could drive the same `ClockState` shape without any React.

## Exercise engine

| Kind | Candidate does | Grading |
|---|---|---|
| `find_illegal_move` | Given raw scoresheet SAN tokens, names the illegal ply | Auto — replays tokens through chess.js one at a time; the first rejected move is the answer |
| `reconstruct_position` | Drags pieces on `InteractiveBoard` to rebuild a position from a scoresheet, no live replay shown | Auto — compares board+turn+castling+en-passant signature (not move counters) against the real PGN replayed to the target ply |
| `repetition_count` | Watches a `ChessViewer` replay, counts the most-repeated position | Auto — mechanical count only; whether it makes a draw claim *valid* is a Laws-of-Chess question left to chief-arbiter-reviewed content |
| `clock_reading` | Given a time control and per-move thinking times, works out a side's remaining time | Auto — replayed through the same `chess-clock.ts` model `ChessClock` uses, so they can never disagree |
| `touch_sequence` | Given a described sequence of piece touches, picks which was first | Draft/needs_review — recorded for human review, no verdict |
| `board_decision` | Given a position + clocks, picks a ruling | Draft/needs_review — same as the existing scenario multiple-choice format |

Every type in `board-exercises.ts` holds only the puzzle's raw data (a PGN, a FEN, a time control) — never a stored "correct answer" field, so nothing solution-shaped is ever sent to the client. `board-exercise.functions.ts`'s server functions each independently recompute the correct answer from that same data at grading time. The four mechanical grading functions' *pure* logic is exported separately from their `createServerFn` wrappers and covered by **13 unit tests**, each verified against real `chess.js`/model output (not hand-derived) before being written.

**Not yet wired**: `ExerciseResult`s aren't folded into a simulation attempt's score yet — `completeAttempt`'s scoring only understands the multiple-choice `answers` log shape. A step with a `board_exercise` grades and displays correctly to the candidate but contributes 0 points toward the attempt total. Fold this in when certificates/CPD wiring happens (a separate, later task per the brief's own scope boundary).

## Adding a new exercise

1. Add a new variant to the `BoardExercise` union in `board-exercises.ts` (puzzle data only, no answer field).
2. If it's mechanically gradable, add a `grade<Kind>` server function in `board-exercise.functions.ts` that recomputes the correct answer from the exercise's own data — never accept a pre-computed answer from the client. Export the pure grading logic separately and write unit tests against it (see the existing four for the pattern).
3. If it's a judgment call, route it through `submitReviewExercise` instead (returns `needsReview: true`, no verdict).
4. Add a UI branch in `BoardExerciseRunner.tsx`'s `switch (exercise.kind)`.
5. Store real content as `context: { board_exercise: {...} }` on an `academy_scenario_steps` row (no schema migration needed).

## Quality/performance

- Board-only bundle cost: the `Chess3DBoard` chunk (three.js + react-three-fiber + piece geometry) is **266.83 kB gzipped** as of this pass — well under the brief's 5 MB budget for first render of the board.
- No quality tiers (Low/Medium/High) or `detect-gpu` integration yet — the procedural geometry is cheap enough on its own (a handful of low-poly meshes) that this hasn't been needed. Revisit if/when real GLB assets replace the procedural pieces, since those carry real texture/triangle cost the brief's tiering system is meant to manage.
- Move/fade animation runs at 260ms/220ms respectively via `useFrame`, independent of the page's overall frame rate.

## Accessibility

- Every 2D board square has a proper `aria-label` (`accessible-square.tsx`) — e.g. "e4, White pawn" / "e4, empty" — fixing a real gap where react-chessboard's default squares had no accessible name at all.
- `prefers-reduced-motion` disables move/capture animation entirely in `ChessSet`, falling back to instant position updates.
- Legal-move dots and selection highlighting use both color *and* shape (a filled dot vs. a colored square overlay) rather than color alone, though a full colour-blind-safe palette audit hasn't been done yet.
- Camera preset buttons and the 2D/3D toggle are real `<button>` elements, reachable and operable via keyboard (Tab + Enter/Space) — confirmed via the accessibility tree, not yet confirmed via a full screen-reader pass.
- **Not yet done**: a dedicated colour-blind-safe highlight review, and full NVDA/VoiceOver walkthroughs. The Playwright suite includes structural checks (labels present, focus reachable) but that isn't a substitute for a real screen-reader pass.

## Running the Playwright suite

`playwright.config.ts` and `tests/e2e/*.spec.ts` exist and are believed correct (selectors checked against the real component source), but **could not be executed or verified in this sandbox**: `npx playwright install chromium` fails here with a network timeout downloading the browser binary — the same class of large-download failure documented in `NOTES.md` for npm tarballs. To actually run this suite:

```bash
bun add -d @playwright/test   # already added to package.json
npx playwright install chromium
TEST_BASE_URL=http://localhost:3000 TEST_EMAIL=<real academy_admin account> TEST_PASSWORD=<...> npx playwright test
```

`TEST_EMAIL`/`TEST_PASSWORD` must belong to an account with `academy_admin` or `super_admin` in `academy_user_roles` — a regular member account cannot reach `/dev/board` or preview unpublished content (see `NOTES.md`'s account-mismatch writeup for why that distinction mattered during this pass's own manual testing). The suite covers: board rendering/screenshots at desktop and mobile viewports, click-to-move with legal-move-dot verification, the 2D/3D toggle, all three camera presets, the clock's start/increment/pause behavior, a `prefers-reduced-motion` context, and keyboard reachability of the board's controls. Exercise-engine walkthroughs (one full run per kind) need a published seed scenario and aren't included yet — the seed content this pass created (`Board Exercises — Draft Review Set`) is deliberately left `is_published = false` per the brief, so a dedicated test-only scenario (or a setup step that temporarily publishes and re-hides it) would be needed to automate that.

## Known limits / follow-ups

- Board-exercise scoring isn't folded into attempt totals yet (see above).
- No quality-tier/GPU-detection system (not yet needed at procedural-geometry weight).
- Colour-blind-safe highlight palette and full screen-reader passes not done.
- Playwright suite written but unexecuted in this environment — needs a real machine/CI with network access and test credentials.
- Real GLB asset pipeline (Blender scripts, `ktx`/gltf-transform compression) not built — procedural geometry remains the shipped path; Blender and KTX-Software are now installed and unblocked for that upgrade whenever it's prioritized.
