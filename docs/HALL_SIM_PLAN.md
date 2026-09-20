# NCAA HD 3D Tournament Hall Simulator — Phase 0 plan

Part A of the two-part HD simulator brief. Part B (chess board, `docs/BOARD_SIM_PLAN.md` / `docs/BOARD_SIM.md`) is complete and its piece kit is reused here per the brief's own instruction.

## What exists today

- `src/components/simulation/TournamentHall3D.tsx` (187 lines) — a real but deliberately minimal prototype: box walls/floor via `MeshStandardMaterial`, numbered "tables" spaced along one row (`TABLE_SPACING = 5.5`), a camera that glides between tables as the candidate progresses through a scenario's steps (`CameraRig`, lerps position/lookAt), a glowing ring under the active/done/pending table (color-coded), and `FigurePair` — two capsule "people" standing in for non-board incidents. When a step's `context.fen` is set, the table shows a `ChessSet` (from the now-upgraded `Chess3DBoard.tsx`) at 0.32 scale instead of the capsule pair.
- Exports `HallStep = { id, prompt, context: { fen?, incidentType? } | null }` — the type this Part A work must keep accepting, now that Part B has widened `StepContext` in `simulation.functions.ts` to also carry `board_exercise` (unrelated to the hall's own rendering, coexists in the same jsonb).
- Used only by `src/routes/_authenticated/simulations.$scenarioId.tsx`, rendered above the active step's UI (multiple-choice, or now a `BoardExerciseRunner` if the step is a board exercise).
- No walking, no collision, no incident engine, no characters beyond the two capsules, no post-processing, no HDRI, no quality tiers. Every table uses the same simple ring/table geometry regardless of scenario content.
- `academy_scenarios`/`academy_scenario_steps` (Supabase/Postgres, not the MySQL schema sketched in `TODO.MD` §6.8 — that section is historical/aspirational from before the Postgres migration and doesn't reflect the live schema). A scenario's steps already carry `context` jsonb freely, so hall layout/incident data can go there the same way Part B's `board_exercise` key did — no new tables needed for the hall's own scenario integration, though the incident *engine* Phase 5 needs to decide its own step-vs-something-else data shape.

## Environment check (2026-09-20)

| Tool | Status |
|---|---|
| `node` | v26.7.0 ✓ |
| `bun` | 1.4.0 ✓ |
| Blender | **5.1.2**, confirmed working: headless scripted mesh creation + GLB export (with built-in Draco support) tested and verified in ~0.5s; headless Cycles render also tested and verified (a trivial scene rendered in <1s). Both the modeling and lighting-bake halves of the Phase 1 pipeline are viable here. |
| KTX-Software | **v5.0.0-rc2**, `ktx create` subcommand confirmed present and responsive (replaces the old standalone `toktx` binary the brief names) |
| `@gltf-transform/cli` | **Installed** (`bun add -d`, ~305s -- slow but succeeded, unlike the browser-binary downloads below) — `gltf-transform` CLI confirmed present at `node_modules/.bin/gltf-transform`. |
| `@react-three/drei`, `@react-three/postprocessing`, `n8ao`, `detect-gpu`, `three-mesh-bvh` | Not yet installed — none are in the repo today. All are free, standard pmndrs/community packages; will add as each phase actually needs them rather than up front. |
| Playwright | `@playwright/test` added as a dev dependency (Part B, Phase 6); **browser binaries could not be installed** — `npx playwright install chromium` fails here with a network timeout downloading the Chrome binary, the same class of large-download failure as the npm-tarball issue already documented in `NOTES.md`. The hall's own Playwright screenshot tests (Phase 7) will hit the same wall; documented rather than worked around. |

**Net effect on sequencing**: the two things the brief worried most about not being available — Blender and KTX-Software — are both confirmed working end-to-end (modeling, baking, and export). The thing that *is* still blocked is anything requiring a large one-shot binary download in this sandbox specifically (Playwright's browser, and possibly large CC0 asset downloads from Poly Haven/Kenney/etc. if their files are large enough to hit the same wall — untested, will confirm the first time Phase 4 needs a real character/audio asset).

## Proposed file structure

```
tools/blender/
  hall_generate.py        # procedural hall shell (Phase 1)
  table_kit_generate.py   # table + chairs + clock + scoresheet (Phase 1)
  characters_generate.py  # or a CC0 import step, if sourced instead (Phase 4)
  lib/                    # shared helpers (materials, UV/lightmap setup)
public/models/hall/
  hall.glb
  table-kit.glb
  characters/*.glb        # if modeled rather than sourced
src/lib/
  hall-layout.ts           # typed row/column/board-number/entrance layout (Phase 2)
  incidents.ts             # incident type definitions + timeline runner (Phase 5)
  hall-simulation.functions.ts  # server functions for incident-based attempts (Phase 5)
src/components/simulation/
  TournamentHall3D.tsx      # rebuilt on HallScene, same exported props (Phase 2)
  HallScene.tsx             # new: GLTF loading, instancing, post-processing (Phase 2)
  CharacterRig.tsx          # new (Phase 4)
src/routes/_authenticated/
  dev.hall.tsx              # new QA page, mirrors dev.board.tsx (Phase 1 acceptance criterion)
docs/
  HALL_SIM_PLAN.md          # this file
  HALL_SIM.md               # Phase 7 — final docs
```

## Performance budget (from the brief, restated)

- First useful render: ≤ 25 MB total download, heavier detail loading after the hall is on screen.
- 60 fps mid-range laptop at High, ≥ 30 fps on Low on a throttled mid-range phone profile.
- ≤ 150 draw calls on High, using instancing.
- WebGL2 only — no WebGPU requirement.
- Hall GLB ≤ 8 MB, table kit ≤ 2 MB, textures ≤ 10 MB total.

## Risks

- **Biggest one**: this is by far the largest single piece of work in the whole two-part brief — a real modeled environment, baked lighting, instanced furniture, 30+ rigged characters with animations, walking + collision, and a full incident engine, vs. the board simulator's much smaller "upgrade some geometry and add game logic" scope. Treating this as its own multi-session initiative (as the original combined plan already flagged) rather than trying to compress it.
- **Characters** are the other large unknown: modeling and rigging 2+ humanoid characters with animations (idle/thinking/raised-hand/arguing/pointing/standing) in Blender from scratch is a lot of manual sculpting/rigging work to script procedurally. The brief's own preference order (Quaternius/Kenney CC0 sources first) is almost certainly the right call over hand-modeling — but sourcing them depends on this sandbox being able to download from those sites, which is unconfirmed (see environment table above). Blender's own Rigify or simple primitive-based low-poly characters are the fallback if CC0 sourcing doesn't pan out, matching the same "procedural fallback over waiting on external assets" precedent set in Part B.
- **Lightmap baking workflow** (bake AO/indirect light to a texture atlas in Blender, then export that atlas alongside the GLB) is more involved to script than the simple GLB export already tested — worth a small dedicated spike at the start of Phase 1 before committing to the full hall geometry, so a baking failure is caught early and cheap rather than after building the whole shell.
- **`three-mesh-bvh`/collision** (Phase 3) and the incident engine's timeline runner (Phase 5) are both real engineering work beyond "prettier 3D," on top of everything else here.

## Sequencing

Following the brief's own phase order (0 → 1 → 2 → 3 → 4 → 5 → 6 → 7), starting with Phase 1 immediately after this doc, since Blender/KTX-Software are both confirmed working and there's no reason to wait. Given the honest size of this initiative, phases will each get their own commit(s) and be reported as they land, same working style as the board simulator — not attempting a single mega-commit.
