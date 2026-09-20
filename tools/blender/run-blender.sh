#!/usr/bin/env bash
# Locates a working `blender` binary (the CLI isn't on PATH after a
# `brew install --cask blender` on macOS -- it only installs the .app
# bundle) and runs a headless generator script through it.
#
# Usage: run-blender.sh <script.py> <output.glb>
set -euo pipefail

SCRIPT_PATH="$1"
OUTPUT_PATH="$2"

if command -v blender >/dev/null 2>&1; then
  BLENDER_BIN="blender"
elif [ -x "/Applications/Blender.app/Contents/MacOS/Blender" ]; then
  BLENDER_BIN="/Applications/Blender.app/Contents/MacOS/Blender"
else
  echo "error: blender binary not found (checked PATH and /Applications/Blender.app)" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"
"$BLENDER_BIN" -b -P "$SCRIPT_PATH" -- "$OUTPUT_PATH"
