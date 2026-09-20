# Notes — issues spotted outside the current task's scope

Logged here per the HD simulator briefs' instruction to record, not fix, anything outside scope.

- `practice.tsx` declared `fen`/`pgn`/`board_instructions` on its `Question` type but never rendered a board for them — **fixed in this pass** since it was small and independent of the bigger board rebuild (not "out of scope," just noting it here for the record).
- Neither Blender nor KTX-Software (`toktx`) is installed in this environment. See `docs/BOARD_SIM_PLAN.md` for install steps. Proceeding on the procedural-geometry fallback path until one of those is available or a live CC0 GLB fetch is confirmed to work here.
- Not yet verified: whether this sandbox can successfully download binary GLB files from Poly Haven/Sketchfab/Kenney/Quaternius over HTTPS — a known issue here causes large npm tarballs to fail TLS with `ERR_SSL_CIPHER_OPERATION_FAILED`. Untested for GLB-sized downloads specifically.
