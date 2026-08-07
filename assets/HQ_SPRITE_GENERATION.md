# HQ Chaser Sprite Sheets & Backgrounds

**Generated:** 2026-08-07  
**Style:** Clean black-outline hand-drawn illustration (modern mode)

## Chaser sheets (`assets/<id>.png`)

| File | Size | Layout |
|------|------|--------|
| alien, bear, godzilla, redlady, jiangshi, grandma, foodpanda, bikini, dumptruck, ambulance, firetruck | **1920×640** RGBA | 6×2 cells of **320×320**; top=run, bottom-left 3=attack |

- Facing **right**, bottom-aligned for anchor (0.5, 1)
- Transparent alpha (green-screen removed)
- `themes.ts` uses `HQ_RUN_FRAMES` / `HQ_ATTACK_FRAMES` for these 11 themes
- `shiba` still uses legacy `dog.png` crop rects

## Backgrounds (`assets/backgrounds/<id>.png`)

All **1920×1080** night scenes with road space at bottom:

alien, bear, godzilla, redlady, jiangshi, grandma, foodpanda, bikini, dumptruck, ambulance, firetruck

> Note: ChaseScene currently draws procedural backgrounds; these PNGs are ready for mid-layer / parallax integration or art reference.

## Source intermediates

`assets/_gen/chasers/*_fullsheet.jpg` — raw AI sheets before keying  
`assets/_gen/previews/*` — cell QA crops
