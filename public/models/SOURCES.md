# 3D model sources

All environment and character models used by the 3D chase view are **CC0 1.0 (public domain)**.
Credit is not required by the licences but is given here. Each kit folder keeps its original `License.txt`.

| Folder | Kit | Author | Source | Licence |
| --- | --- | --- | --- | --- |
| `quaternius/` | Stylized Nature MegaKit (Standard / free edition) | Quaternius | https://quaternius.com/packs/stylizednaturemegakit.html | CC0 1.0 |
| `kenney/nature/` | Nature Kit 2.1 | Kenney | https://kenney.nl/assets/nature-kit | CC0 1.0 |
| `kenney/town/` | Fantasy Town Kit 2.0 | Kenney | https://kenney.nl/assets/fantasy-town-kit | CC0 1.0 |
| `kenney/suburban/` | City Kit (Suburban) | Kenney | https://kenney.nl/assets/city-kit-suburban | CC0 1.0 |
| `kenney/commercial/` | City Kit (Commercial) 2.1 | Kenney | https://kenney.nl/assets/city-kit-commercial | CC0 1.0 |
| `kenney/characters/` | Mini Characters 2.0 | Kenney | https://kenney.nl/assets/mini-characters | CC0 1.0 |

Only the files the game uses are shipped (GLB/glTF, shared 512 px colour maps).
Which model appears where is configured in `src/world/LocationEnvironment.ts`;
loading and caching live in `src/world/EnvironmentAssets.ts`.

Kenney Nature Kit models are untextured; their pastel material colours are
re-tinted to natural greens / browns / greys at load time (`NATURE_PALETTE`).
