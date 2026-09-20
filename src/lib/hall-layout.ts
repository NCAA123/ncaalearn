// Shared table-row layout math, used by both TournamentHall3D (per-scenario
// steps) and the /dev/hall QA page (a fixed table count) so the two never
// drift apart on spacing.
export const TABLE_SPACING = 5.5;

export function tableX(index: number, total: number) {
  return index * TABLE_SPACING - ((total - 1) * TABLE_SPACING) / 2;
}
