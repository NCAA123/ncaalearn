# HD Tournament Hall Simulator — reference docs

Covers what's built so far across Phases 1–2 of the hall simulator brief (see `docs/HALL_SIM_PLAN.md` for the original Phase 0 plan and full phase sequencing). This is Part A of the two-part brief; the board simulator (Part B) is a separate, already-complete initiative — see `docs/BOARD_SIM.md`. Given the size of the remaining phases (walking/collision, characters, incident engine, quality tiers), this doc will grow incrementally as each phase lands rather than trying to describe unbuilt work.

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
| QA page | `src/routes/_authenticated/dev.hall.tsx` (`/dev/hall`) | Not linked from navigation. Fixed 8-table layout, no DB content required; one table carries a starting-position FEN to confirm the chess set still renders on a GLTF-loaded table top. |

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

## Known limits / follow-ups

- `FigurePair` (the placeholder capsule "people" used on any table whose step has no chess `fen`) sits at a fixed height calibrated for the old box-primitive table's flat top; the real desk's surface differs slightly, so the capsules read as floating a touch high. Purely cosmetic — see `NOTES.md`. Worth fixing whenever Phase 4 (real characters) replaces `FigurePair` anyway, rather than twice.
- No walking/collision (Phase 3), characters beyond the two placeholder capsules (Phase 4), incident engine (Phase 5), seed content (Phase 6), or quality tiers/post-processing (rest of Phase 2) yet — see `docs/HALL_SIM_PLAN.md` for the full sequencing.
- Playwright suite (`tests/e2e/hall.spec.ts`) written but **unexecuted in this environment** — same sandbox limitation as the board simulator's suite (`npx playwright install chromium` fails here with a network timeout). To actually run it: `TEST_BASE_URL=... TEST_EMAIL=<academy_admin/super_admin account> TEST_PASSWORD=... npx playwright test hall.spec.ts` after `npx playwright install chromium` succeeds on a machine with network access.
- Regenerating `table-kit.glb` from scratch only works on the machine that has the source `classroom.blend` at the path baked into `table_kit_generate.py` — the committed `.glb` itself has no such dependency (it's a normal static asset), only the *regeneration* step does.
