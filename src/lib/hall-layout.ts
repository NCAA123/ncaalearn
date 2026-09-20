// Shared table-row layout math, used by both TournamentHall3D (per-scenario
// steps) and the /dev/hall QA page (a fixed table count) so the two never
// drift apart on spacing.
export const TABLE_SPACING = 5.5;

export function tableX(index: number, total: number) {
  return index * TABLE_SPACING - ((total - 1) * TABLE_SPACING) / 2;
}

// Room/column dimensions mirrored from tools/blender/hall_generate.py's own
// HALL_LENGTH/HALL_WIDTH and build_columns() -- kept in sync by hand since
// the .glb itself has no cheap way to expose "these are the walkable
// bounds" to the walk-mode collision code in HallWalkControls.tsx. If the
// generator's dimensions change, update these too.
export const HALL_LENGTH = 30;
export const HALL_WIDTH = 20;
export const COLUMN_RADIUS = 0.5;

const HALF_L = HALL_LENGTH / 2;
const HALF_W = HALL_WIDTH / 2;
const COLUMN_XS = [-HALF_L + 4, -HALF_L * 0.3, HALF_L * 0.3, HALF_L - 4];
const COLUMN_YS = [-HALF_W + 3, HALF_W - 3];

export const COLUMNS: [number, number][] = COLUMN_XS.flatMap((x) => COLUMN_YS.map((y): [number, number] => [x, y]));

// Typed "board 14"-style addressing (brief Phase 2's hallLayout.ts ask) --
// a lookup from a 1-based board number to its world position/orientation,
// independent of however many steps a given scenario happens to have.
// Board numbers are assigned left-to-right along the same single-row
// layout tableX() already produces; a future multi-row layout would only
// need to change this function; every caller already goes through it
// rather than computing tableX() directly.
export type BoardPlacement = { x: number; z: number; facing: number };

export function boardPlacement(boardNumber: number, totalBoards: number): BoardPlacement {
  const index = boardNumber - 1;
  return { x: tableX(index, totalBoards), z: 0, facing: 0 };
}

// The arbiter desk sits against the banner wall (+Y in hall_generate.py's
// Blender space); mirrored here for anything that needs to reference it
// (e.g. a "return to your post" incident cue) without hardcoding the value
// a second time.
export const ARBITER_DESK_POSITION: [number, number] = [0, HALF_W - 1.0];

// The main entrance sits centered on the front wall's door gap (-Y in
// Blender space, i.e. the "near" wall relative to how tables are laid out).
export const ENTRANCE_POSITION: [number, number] = [0, -HALF_W + 1.0];
