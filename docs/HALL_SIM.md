# HD Tournament Hall Simulator — reference docs

Covers what's built so far across Phases 1–5 of the hall simulator brief (see `docs/HALL_SIM_PLAN.md` for the original Phase 0 plan and full phase sequencing). This is Part A of the two-part brief; the board simulator (Part B) is a separate, already-complete initiative — see `docs/BOARD_SIM.md`. Given the size of the remaining phases (a full character cast, seed content, post-processing polish), this doc will grow incrementally as each phase lands rather than trying to describe unbuilt work.

## What exists

| Piece | File | Notes |
|---|---|---|
| Hall shell geometry | `tools/blender/hall_generate.py` | Procedural box-primitive hall (30 x 20 x 6m): floor/ceiling with a 5x3 grid of real emissive+AREA-light panels, walls with a front door gap and side-window curtains, columns, an arbiter desk/results board, a spectator rope. No sculpting — fully re-runnable to regenerate `hall.glb`. |
| Table/chair kit geometry | `tools/blender/table_kit_generate.py` | **Real modeled assets**, not primitives: a `teacherDesk` (~1.38 x 0.59 x 0.82m) and two mirrored `leatherChair` copies facing each other, sourced (with explicit permission) from a user-provided classroom Cycles demo scene. See "Table/chair asset provenance" below. |
| Shared material helpers | `tools/blender/lib/materials.py` | Flat PBR (base color/roughness/metallic) `PALETTE` for the hall shell — no external textures, no network dependency. |
| Blender binary resolver | `tools/blender/run-blender.sh` | Finds a working `blender` CLI (a `brew install --cask blender` only installs the `.app` bundle, not a PATH entry) and runs a generator script through it. |
| GLB post-processing | `tools/blender/optimize.sh` | `gltf-transform dedup` then `prune` on a named output file. Deliberately skips `--compress meshopt`: shrinks further but requires wiring a `MeshoptDecoder` into three.js's `GLTFLoader` first, not worth it while raw files are already far under budget. |
| Scene loading/instancing | `src/components/simulation/HallScene.tsx` | Loads `hall.glb`/`table-kit.glb` via drei's `useGLTF`, cloning the parsed scene per usage (drei caches/shares the source graph). Exports `HallShell` and `TableInstance` (ring + real desk/chair mesh + `ChessSet`-or-`FigurePair` on top). |
| Layout math | `src/lib/hall-layout.ts` | `tableX(index, total)` row-spacing helper, shared by `TournamentHall3D` and `/dev/hall` so they can't drift apart. |
| Scenario-facing hall | `src/components/simulation/TournamentHall3D.tsx` | Rebuilt on `HallScene` (previously hardcoded box geometry). Kept its exact prior `HallStep`/props contract, so `simulations.$scenarioId.tsx` needed zero changes. Camera glides between stations as the candidate progresses through steps. |
| QA page | `src/routes/_authenticated/dev.hall.tsx` (`/dev/hall`) | Not linked from navigation. Fixed 5-table layout (sized to actually fit inside the real 30m hall — see the Phase 3 bug note below), no DB content required; one table carries a starting-position FEN to confirm the chess set still renders on a GLTF-loaded table top. Has a Guided tour / Free walk toggle. |
| Free-walk movement + collision | `src/components/simulation/HallWalkControls.tsx` | WASD/arrow movement, drei's `PointerLockControls` for mouse-look, collision against the room's outer bounds and its 8 columns (simple clamp/circle-push math, no physics engine). `TournamentHall3D`'s `mode` prop defaults to `"tour"`; `"walk"` is opt-in, used by `/dev/hall` only — a candidate free-walking mid-exam is undesirable. |
| GPU quality tiers | `src/hooks/useHallQualityTier.ts` | Classifies the visitor's GPU once per page load via `detect-gpu` (self-hosted benchmark JSON under `/detect-gpu-benchmarks`, not unpkg). Scales `Canvas`'s device pixel ratio and disables shadow casting entirely on "low" tier. |
| First real character | `src/components/simulation/CharacterRig.tsx` (`ArbiterPatrol`) | A real rigged/animated humanoid (CesiumMan, CC BY 4.0 — see ASSETS.md) patrols back and forth along the table row. Clones the shared skinned mesh per instance via three-stdlib's `SkeletonUtils.clone()` (plain `Object3D.clone()` breaks bone bindings across multiple instances of the same skinned model). Seated "players" at each table remain the placeholder capsules (`FigurePair`) — a full cast of distinct poses is future work. |
| Incident engine | `src/lib/incidents.ts`, `src/lib/incident.functions.ts`, `src/components/simulation/IncidentPanel.tsx` | A scripted dispute/disturbance a candidate responds to at a station — distinct from a `board_exercise` in that every incident is a judgment call, never mechanically gradable. Mirrors `board-exercise.functions.ts`'s `submitReviewExercise` pattern exactly: validates the chosen option is real, returns a `needsReview: true` result, no verdict, no DB write. Table rings turn red/orange (see `HallScene.tsx`) instead of the usual yellow/grey when a step carries an incident. QA page: `/dev/incident`. |
| Practice/assessed mode + `SimulationResult` | `src/lib/incidents.ts` (`IncidentMode`, `IncidentAttemptRecord`, `SimulationResult`, `buildSimulationResult()`), `IncidentPanel.tsx`'s `mode`/`onRecorded` props | The brief's own explicit deliverable: "produces a clean, structured result object that can be wired in later" for certificates/CPD. `buildSimulationResult()` is pure and unit-tested (`incidents.test.ts`, 6 tests) -- it never invents `decisionAccuracy`/`ruleAccuracy`/`prioritizationScore` (stays `null`; no verified ruling exists yet to grade against), but does compute `averageResponseTimeMs` and `observationScore` from real timestamps. Assessed mode withholds the post-submit confirmation and the draft article-reference hint, matching the brief's "no hints or highlights, no feedback until the end." Demoed end-to-end on `/dev/incident` against a real seeded step, verified live. |
| Click-to-walk + interact prompts | `HallWalkControls.tsx` (floor-click raycast, proximity-based "Press E to inspect" `<Html>` prompt), `TournamentHall3D.tsx` (`onInteractStep` prop, keyboard-operable "Walk to station N" buttons) | Closes the Phase 3 accessibility requirement: click/tap-to-walk works without pointer lock, and the button row is a fully keyboard-operable alternative (Tab + Enter/Space) to walking there directly. Verified live: click-to-walk, proximity detection, and opening a real `IncidentPanel` on interact all work end to end on `/dev/hall`. |
| Post-processing | `TournamentHall3D.tsx`'s `HallPostFX` (`@react-three/postprocessing` + `n8ao`, both free/pmndrs) | N8AO ambient occlusion, a bloom pass tuned for the ceiling's emissive light panels, ACES filmic tone mapping, SMAA. Skipped entirely on "low" quality tier per the brief's own perf budget. Verified live with no console errors. |
| Seed content (Phase 6) | Seeded directly via SQL (see NOTES.md), not committed as a migration/script in-repo | Three scenarios matching the brief's three formats: `Hall Incidents — Walk-up Review Set` (6 steps, one per incident category), `Hall Incidents — Patrol Review Set` (4 steps -- 2 genuine incidents + 2 clean/decoy boards using the existing plain-choice mechanism, so reporting a false alarm is a real, working wrong answer today), `Hall Incidents — Small Live Round Review Set` (3 incident steps in sequence). All `is_published = false`, every prompt prefixed `NEEDS CHIEF ARBITER REVIEW`, every rule reference marked `-- TO VERIFY`. "Overlapping" in the small-live-round format is sequential, not simultaneous -- no timeline runner exists yet (see Known limits). |
| Mobile virtual joystick + drag-to-look | `src/components/simulation/HallTouchControls.tsx` | Closes Phase 3's explicit mobile ask. A dual-zone DOM overlay (left-half drag = joystick, right-half drag = look), gated to only render on `(pointer: coarse)` devices so it never intercepts desktop mouse events. Both inputs write into a shared ref polled by `HallWalkControls` each frame; look rotation uses the same YXZ Euler decomposition `PointerLockControls` uses internally. |
| `prefers-reduced-motion` support | `src/hooks/usePrefersReducedMotion.ts` (shared with the board simulator's `ChessSet`) | The tour camera snaps straight to each station instead of panning; `ArbiterPatrol` freezes at a static standing pose instead of looping its walk cycle. Continuous camera motion and an endless walk animation are exactly what reduced-motion settings exist to suppress. |

## Asset pipeline

```
bun run hall:build          # both generators + optimize
bun run hall:build:shell    # hall.glb only
bun run hall:build:tables   # table-kit.glb only
```

Requires a local Blender install (resolved by `run-blender.sh`) and, for the table kit specifically, the source `classroom.blend` at the fixed path baked into `table_kit_generate.py` (see provenance note below — this is a build-time-only dependency, never shipped or referenced at runtime, same category as needing Blender itself installed).

Final sizes (well under the brief's ≤8MB hall / ≤2MB table-kit budget):
- `hall.glb`: 17,036 bytes, `extensionsUsed: KHR_materials_emissive_strength` only, no required extensions.
- `table-kit.glb`: 191,420 bytes, no extensions used or required.

## Table/chair asset provenance

The table kit's desk and chairs are extracted from Christophe Seux's "Classroom" Cycles benchmark demo scene (a `.blend` the user downloaded and explicitly authorized using in full for this project). Two things worth recording:

- **Why not the scene's own `schoolDesk` group**: that's a single fused desk+attached-bench unit (~1.75m combo, no separable chair mesh) — a classroom bench design, not a freestanding table with two chairs facing each other, which a tournament board needs. The standalone `teacherDesk` + `leatherChair` collections are the only cleanly separable, single-item assets in the scene, so those were used instead.
- **No image textures**: the source file's materials didn't survive its old Blender-Internal → Principled BSDF auto-conversion cleanly — none of the 7 materials (`teacherDesk_wood/plastic/metal/blackPlastic`, `leatherChair_blackPlastic/metal/leather`) have a `TEX_IMAGE` node actually feeding Base Color, so the exported GLB ships with solid PBR base colors per material rather than photo textures. Still real per-material color/roughness values, and a much closer real-world shape than the box primitives it replaced (verified live on `/dev/hall`: visible desk drawers, a real chair silhouette with legs/seat/back).

## Performance (measured, not estimated)

Client bundle sizes, from a real `vite build` (2026-09-21):

| Chunk | Raw | Gzip |
|---|---|---|
| `TournamentHall3D` route (HallScene, HallWalkControls, HallTouchControls, CharacterRig, postprocessing wiring) | 436.0 KB | 195.9 KB |
| Shared three.js/R3F vendor chunk (cached once per session, shared with the board simulator) | 985.9 KB | 268.1 KB |

GLB asset sizes and real triangle/vertex counts, from `gltf-transform inspect`:

| Asset | File size | Render vertex count |
|---|---|---|
| `hall.glb` | 20 KB | 1,872 |
| `table-kit.glb` (1 desk + 2 chairs) | 188 KB | 52,716 |
| `cesium-man.glb` | 468 KB | 14,016 |

Worst-case cold-cache download for a first hall visit: ~268 KB (vendor, once per session) + ~196 KB (route) + ~676 KB (all three GLBs) ≈ **1.14 MB** — well under the brief's ≤25MB budget.

**Real gap found while measuring, not glossed over**: `table-kit.glb`'s 52,716 vertices come from ~30 sub-meshes (the desk's drawers/hardware, each chair's frame/seat/back as separate primitives) per table instance. `TableInstance` clones this whole sub-mesh hierarchy per table (`useClonedScene` in `HallScene.tsx`) rather than using true GPU instancing (`THREE.InstancedMesh` / drei's `<Instances>`) — so draw calls scale linearly with table count instead of staying flat. At the 5-table count used in `/dev/hall` today this is a non-issue, but the brief's own Phase 1 acceptance criterion ("40 instanced tables") would multiply out to roughly 40 × 30 ≈ 1,200 draw calls just for tables — far past the "~150 draw calls on High" budget. Real instancing (grouping identical sub-meshes across all table instances into a handful of `InstancedMesh`es) is the fix, not yet done.

**Not measured, and can't be meaningfully measured in this sandbox**: actual fps under a 4x-CPU-throttle / Slow-4G profile on a real mid-range laptop or phone. This sandbox's rendering environment doesn't represent real consumer hardware, so any number produced here would be fabricated, not measured — this needs a pass on an actual device.

## Known limits / follow-ups

- `FigurePair` (the placeholder capsule "people" used on any table whose step has no chess `fen`) sits at a fixed height calibrated for the old box-primitive table's flat top; the real desk's surface differs slightly, so the capsules read as floating a touch high. Purely cosmetic — see `NOTES.md`.
- **Real bug found and fixed during Phase 3**: `tableX()`'s fixed 5.5m-per-table spacing has no awareness of the hall shell's real, fixed 30x20m footprint. `/dev/hall`'s original 8-table demo spanned 38.5m — wider than the room — which was invisible in guided-tour mode (camera always frames just the active table up close) but broke Free walk mode outright (camera could spawn/walk outside the modeled walls). Fixed by clamping `HallWalkControls`' spawn position and reducing the demo to 5 tables; the underlying spacing-vs-footprint mismatch is still unresolved for a real scenario with enough steps (Phase 6's problem — see NOTES.md).
- **Real gap found while measuring perf** (see above): no true GPU instancing for repeated table-kit copies -- draw calls scale linearly with table count, likely exceeding budget well before 40 tables.
- No full character cast (players' seated poses, spectators, distinct arbiter states like pointing/arguing — Phase 4's remaining scope, still just the one patrolling arbiter) or lightmap-baking yet — see `docs/HALL_SIM_PLAN.md` for the full sequencing.
- No timeline runner (Phase 5's own spec: timed, overlapping incidents with a random seed). Incidents today are triggered by walking up and interacting, one at a time, in sequence — real and working, but not what "overlapping" means in the brief. `noticedUnprompted` and `prioritizationScore` stay `null`/unfilled until this exists, rather than being guessed.
- No formal perf report (CPU-4x-throttle / Slow-4G numbers) or accessibility audit specific to the hall (reduced-motion isn't checked for the camera glide or `ArbiterPatrol`'s animation, unlike the board simulator's `ChessSet`).
- Pointer Lock (Free walk mode's mouse-look) couldn't be exercised in this sandbox's browser-automation session (`WrongDocumentError`, a known CDP/extension-context limitation, not app-specific) — WASD movement and collision were verified directly via synthetic key events; mouse-look itself needs a manual spot-check in a normal browser tab.
- Playwright suite (`tests/e2e/hall.spec.ts`) written but **unexecuted in this environment** — same sandbox limitation as the board simulator's suite (`npx playwright install chromium` fails here with a network timeout). To actually run it: `TEST_BASE_URL=... TEST_EMAIL=<academy_admin/super_admin account> TEST_PASSWORD=... npx playwright test hall.spec.ts` after `npx playwright install chromium` succeeds on a machine with network access.
- Regenerating `table-kit.glb` from scratch only works on the machine that has the source `classroom.blend` at the path baked into `table_kit_generate.py` — the committed `.glb` itself has no such dependency (it's a normal static asset), only the *regeneration* step does.
- Incident content isn't yet authorable through the admin UI (`createStep`/`updateStep` in `simulation.functions.ts` don't accept a `context.incident` payload) — same situation `board_exercise` content was in: real incidents get seeded directly (SQL/script), consistent with existing precedent, until Academy's admin work (a separate, later initiative) adds proper authoring forms.
