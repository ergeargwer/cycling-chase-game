# Retro pixel asset generator

Generates engine-ready PNG assets under `assets/retro/` matching:

- `docs/retro-asset-spec.md`
- `docs/retro-scene-props-spec.md`

## Regenerate

```bash
python3 tools/retro_gen/generate_all.py
```

## Notes

- Character sheets are **288×96** (6×2 cells of 48×48).
- Tiles use limited palette; road is horizontally seamless.
- AI reference stills may live in `assets/retro/_ai_ref/` for style exploration; runtime uses the sheet/tile PNGs.
