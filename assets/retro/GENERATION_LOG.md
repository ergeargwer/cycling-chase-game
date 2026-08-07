# Retro asset generation log (v2)

**Date:** 2026-08-07  
**Spec:** `docs/retro-scene-props-spec.md` v2 + `docs/retro-asset-spec.md`  
**Generator:** `tools/retro_gen/generate_all.py`

## Spec compliance

| Item | Spec | Generated |
|------|------|-----------|
| Character cell | 48×48 | Yes — sheets 288×96 (6×2) |
| Road body height | **48px** | `tiles/shared/road-body.png` 64×48 |
| Mid strips | 128–256 wide | hills/pine/skyline/columbarium/arcade/etc. |
| Cemetery | tombs, mounds, columbarium | Full redlady set |
| Transparent PNG | RGBA | Yes |
| Palette | limited 16–32 | Spec base palette |

## Counts

- Rider + 12 chasers
- Shared tiles + theme shoulders/roads
- Mid strips for all 12 themes (+ neon, fog, wave-2f, crop-circle)
- Props: redlady complete + per-theme lists from P1
- FX: flame/smoke/dust/joss/wisp/beacon/etc.
- **~158 PNG** under `assets/retro/`

## Regenerate

```bash
python3 tools/retro_gen/generate_all.py
```

## Quality note

Procedural pixel art for **engine path + size correctness**. Replace any file with higher-detail art using the **same filename** — no code changes required.
