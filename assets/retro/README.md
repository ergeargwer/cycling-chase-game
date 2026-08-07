# Retro assets

Place pixel-art sheets here per **docs/retro-asset-spec.md**.

Until files exist, the game falls back to modern `assets/*.png` while still applying
nearest-neighbor scaling and CRT scanlines when `visualStyle === 'retro'`.

Required chaser files: `chasers/<themeId>.png` for
shiba, bear, godzilla, redlady, jiangshi, alien, dumptruck,
foodpanda, grandma, ambulance, firetruck, bikini.
