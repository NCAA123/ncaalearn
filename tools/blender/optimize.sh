#!/usr/bin/env bash
# Post-processes a freshly-exported hall GLB with the two-step pipeline
# already verified by hand: dedup (merge duplicate accessors/materials)
# then prune (drop anything now unused). Deliberately skips
# `--compress meshopt`: it shrinks the file further but adds
# EXT_meshopt_compression/EXT_mesh_gpu_instancing, which needs a
# MeshoptDecoder wired into three.js's GLTFLoader before it'll load --
# not worth it while raw files are already far under the size budget.
#
# Usage: optimize.sh <hall|table-kit>
set -euo pipefail

NAME="$1"
FILE="public/models/hall/${NAME}.glb"

if [ ! -f "$FILE" ]; then
  echo "error: $FILE not found" >&2
  exit 1
fi

BIN="node_modules/.bin/gltf-transform"
if [ ! -x "$BIN" ]; then
  echo "error: $BIN not found -- run 'bun install' first" >&2
  exit 1
fi

"$BIN" dedup "$FILE" "$FILE"
"$BIN" prune "$FILE" "$FILE"

echo "OPTIMIZE_OK: $FILE ($(wc -c < "$FILE" | tr -d ' ') bytes)"
