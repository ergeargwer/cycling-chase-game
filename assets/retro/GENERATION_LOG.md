# Retro asset generation log

**Date:** 2026-08-07  
**Method:** Procedural pixel art (Python/PIL) matching design specs + optional AI style refs  

## Delivered (engine-ready paths)

### Characters
- `characters/rider.png` — 288×96 (6 normal + 6 nervous)

### Chasers (all 12, 288×96)
shiba, bear, godzilla, redlady, jiangshi, alien, dumptruck, foodpanda, grandma, ambulance, firetruck, bikini

### Shared tiles
- `tiles/shared/road-body.png` (64×32 seamless)
- `tiles/shared/road-dash.png`, `road-edge-*.png`, `shoulder.png`
- `tiles/shared/sky-night.png` (128×96), `moon.png` (16×16)

### Mid strips (parallax L1/L2)
- shiba: hills, powerline
- bear: pine
- godzilla: skyline
- redlady: **columbarium-strip**
- jiangshi: village
- alien: field
- dumptruck: cliff
- foodpanda: arcade
- grandma: alley
- ambulance: hospital
- firetruck: burnt-street
- bikini: sea

### Props (priority)
- redlady: tombs, mounds, censer, lantern, fence, dead-tree
- shiba: lamp, pole, reflector
- bear: trees
- shared: cone, lamp, hydrant
- foodpanda: scooter, bikini: lighthouse, firetruck: hydrant

### FX
- sweat, flame-4f, dust-4f, joss-paper-4f

### AI refs (not runtime-required)
- `_ai_ref/*` — style exploration stills / single cells

## Quality note
Procedural sheets are **placeholder-quality pixel art** for pipeline validation (correct grid, transparency, paths).  
Upgrade path: redraw or AI-pixelize into same filenames without code changes.

## Regenerate
See `tools/retro_gen/README.md`.
