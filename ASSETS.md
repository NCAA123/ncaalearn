# External asset ledger

Every third-party asset (model, texture, HDRI, audio, animation) used anywhere in the HD board/hall simulators must be listed here before it ships, with its source URL, author, license, and whether attribution is required. No exceptions.

| Asset | Source | Author | License | Attribution required? | Used in |
|---|---|---|---|---|---|
| _(none yet)_ | | | | | |

The board simulator (Part B, this pass) currently uses zero external binary assets — pieces and board are generated procedurally in Three.js (`src/lib/chess-pieces.ts`) with no textures beyond flat PBR materials, so there is nothing to license yet. This file will gain rows if/when real CC0 GLB models, PBR textures, or an HDRI are brought in.
