# NCAA HD Chess Board Simulator — Phase 0 plan

## What exists today

- `src/components/learning/Chess3DBoard.tsx` — exports `ChessSet` (embeddable group, reused by the hall's `TournamentHall3D`) and `Chess3DBoard` (own `<Canvas>` + `OrbitControls`). Pieces are primitive geometry (cones/cylinders/spheres; knight is a plain box). Pieces are keyed by `square` in a `.map()`, so a move unmounts the piece at the old square and mounts a new one at the new square — no travel animation, no capture animation, no castling/en passant/promotion handling beyond "whatever `chess.js .board()` says is there now."
- `src/components/learning/ChessViewer.tsx` — PGN step-through viewer wrapping either `react-chessboard` (2D, `allowDragging: false`) or `Chess3DBoard` (3D), with play/pause/step/flip/speed controls and PGN-comment display. No interactivity (no dragging, no arrows, no legal-move hints) in either mode.
- Used in: course lessons (`courses.$slug.lessons.$lessonId.tsx`, lesson types `chess`/`pgn`), exam questions (`exams.$examId.attempt.tsx`, for `fen`/`pgn` questions), and `TournamentHall3D.tsx` (via `ChessSet`, at 0.32 scale, rendered only when a scenario step's `context.fen` is set).
- `practice.tsx` — **confirmed bug**: the `Question` type declares `fen`, `pgn`, `board_instructions`, but the component never renders `ChessViewer`/`Chess3DBoard` anywhere — practice questions with a board attached currently show no board at all. Trivial, low-risk fix (render `ChessViewer` above the choices when `q.fen` or `q.pgn` is set) — doing this now since it doesn't depend on the bigger rebuild.
- No chess clock component exists anywhere in the codebase.
- No board is currently draggable/clickable; nothing lets a candidate act on a position.
- `exams.$examId.attempt.tsx` has real anti-cheat: `visibilitychange` listener, violation counting/toasts, auto-submit past a threshold. This must keep working unmodified — the board upgrade only changes what's rendered inside the existing question card, not the attempt page's event wiring.

## Environment check

| Tool | Status |
|---|---|
| `node` | v26.7.0 ✓ |
| `bun` | 1.4.0 ✓ |
| `blender` | **installed** — Blender 5.1.2 at `/Applications/Blender.app/Contents/MacOS/Blender` (not on PATH; invoked by full path in scripts) |
| KTX-Software | **installed** — `ktx` v5.0.0-rc2 on PATH at `/usr/local/bin/ktx`. Note: this version replaced the old standalone `toktx` binary with a unified `ktx` CLI — texture compression now uses `ktx create`/`ktx encode` instead of `toktx` |
| Playwright | not installed as a project dep; `npx playwright` pulled 1.63.0 fine ad hoc |
| `vitest` | **added** (dev dependency) for Phase 3's ChessClock unit tests — this repo had no test runner before |

Both Blender and KTX-Software were user-installed mid-project (2026-09-20) — the procedural-geometry fallback path chosen in Phase 1 remains in place for the pieces/board already built (no regression risk, same exported props), but real modeled/textured GLB assets are now unblocked for future visual upgrades and for Part A (the Tournament Hall simulator).

## Decision point before Phase 1 modeling work

The prompt allows two paths for the piece/board kit, and picking wrong wastes real modeling effort:

1. **Source free CC0 models** (Poly Haven / Sketchfab CC0-filtered / Quaternius / Kenney) and bring them in as GLB. Best visual quality for the least hand-authored work, but requires fetching binary files from the internet from this sandbox — untested here, and a known sandbox issue exists where large TLS downloads (e.g. big npm tarballs) fail with `ERR_SSL_CIPHER_OPERATION_FAILED`. GLB files in the "good enough to look premium" range (a few hundred KB to low MB) may or may not hit the same wall — needs a live test.
2. **Author procedurally in Three.js now** (Lathe-geometry profiles for a proper Staunton silhouette — rook/bishop/queen/king/pawn as `THREE.LatheGeometry` revolves, knight as a simple extruded/boxed approximation improved from today's plain box) with zero new asset dependencies, zero network risk, and full control — then swap in real GLB assets later (behind the same `ChessSet`/`Chess3DBoard` props) once Blender is installed or a CC0 source is confirmed fetchable. Lower peak visual ceiling than a modeled/textured GLB, but a real, immediate, dependency-free quality jump over today's cones-and-boxes, and it de-risks the rest of the pipeline (animation, instancing, exercise engine) from asset availability.

I'm proceeding with **option 2 first** (procedural Lathe-based Staunton pieces, instanced by type+color, shared geometry/materials) as the immediate, safe win, and will test a live GLB fetch from Poly Haven separately to see if the sandbox's TLS issue actually blocks it — if it doesn't, real assets slot in later without changing any consuming component's props.

## Proposed file structure

```
src/components/learning/
  Chess3DBoard.tsx        (ChessSet + Chess3DBoard — rebuilt internals, same props)
  ChessViewer.tsx          (gains arrows/legal-move hints/interactive mode in Phase 2)
  ChessClock.tsx           (new, Phase 3)
src/lib/
  chess-pieces.ts          (new — shared Lathe-geometry profiles + instancing helpers)
  board-exercises.ts       (new, Phase 4 — typed BoardExercise union + client helpers)
  board-exercise.functions.ts (new, Phase 4 — server-side grading via chess.js recompute)
tools/blender/             (created once Blender is confirmed installed; empty for now)
public/models/board/       (reserved for future real GLB assets)
docs/
  BOARD_SIM_PLAN.md         (this file)
  BOARD_SIM.md              (Phase 6 — final docs)
ASSETS.md                   (root — license ledger, empty until a real external asset is added)
NOTES.md                    (root — out-of-scope issues spotted along the way)
```

## Performance budget (unchanged from the brief)

- First render of the board: ≤ 5 MB total download.
- 60 fps mid-range laptop, ≥ 30 fps throttled-phone profile on Low.
- No change to the exam attempt page's load time or anti-cheat behavior.

## Risks

- Procedural Lathe pieces will look better than today's primitives but not "photoreal" — that ceiling needs either Blender (not installed) or a confirmed-working CC0 GLB fetch.
- `react-chessboard` v5's `allowDragging`/arrow API needs checking against installed version before Phase 2 interactivity work — API shape may differ from the TODO.MD-referenced feature list.
- `@react-three/drei`, `@react-three/postprocessing`, `detect-gpu` are not yet installed; none is in the repo today. Small, standard, and within the "ask before adding >~200KB gzipped" rule — flagging here rather than blocking on it, per your instruction to keep building.

## What I did in this pass (beyond pure recon)

- Fixed `practice.tsx` to actually render `ChessViewer` when a question has `fen`/`pgn` (previously silently dropped).
- Rebuilt `ChessSet`/`Chess3DBoard` piece geometry using proper Lathe-profile Staunton silhouettes instead of cones/boxes/spheres, with shared geometry per piece-type and shared material per color (was: a new `MeshStandardMaterial` per piece instance). Same external props (`fen`, `orientation`, `lastMove`) — no caller changes needed.
- Committed directly to `main` per your explicit confirmation that this repo should receive live commits for this work, accepting that each push deploys immediately via the Lovable sync.
