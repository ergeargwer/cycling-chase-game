# 現代／復古視覺風格 — 架構說明

**規格唯一依據：**

1. `docs/retro-asset-spec.md` — 角色、chasers、hud、fx  
2. `docs/retro-scene-props-spec.md` — L0–L7 圖層、視差、tile/mid/props  

玩法邏輯（功率、距離、狀態機、坡度、主題 id）**不因風格改變**。

---

## 1. 狀態流

```
MenuScene
  └─ 開始訓練
       ▼
StyleSelectScene     ← 選擇 modern | retro（不可熱切換）
  └─ 確認 → GameState.setVisualStyle(style)
       ▼
PlanScene            ← 計畫 + 追逐者主題（themeId）
  └─ 確認
       ▼
ChaseScene.load()    ← 鎖定 sessionStyle = state.visualStyle
  └─ 整場 chase 固定
       ▼
回主選單              ← 清除 data-visual-style；下次重選風格
```

| 畫面 | 檔案 |
|------|------|
| 風格選擇 | `src/renderer/scenes/style-select-scene.ts` |
| 流程串接 | `src/renderer/index.ts` |
| 狀態 | `GameState.visualStyle` / `setVisualStyle()` |

**除錯 URL：**

- `?screen=style`
- `?style=retro&screen=chase&theme=redlady`

---

## 2. 關鍵型別與介面

```ts
// visual-style.ts
type VisualStyle = 'modern' | 'retro'

// GameState
visualStyle: VisualStyle
setVisualStyle(style: VisualStyle | string): void

// themes.ts
getTheme(id, style?: VisualStyle): ChaseTheme
// retro 時改寫：spriteSrc / assetAlias / runFrames / attackFrames / displayHeight

// retro-parallax.ts
class RetroParallaxWorld {
  build(themeId, w, h, groundY): Promise<boolean>  // false → 回落 Graphics
  update(roadDeltaPx, groundYAt?): void
}
```

---

## 3. 資源路徑對照

| 類型 | modern | retro（規格） |
|------|--------|----------------|
| 騎士 | `assets/rider.png` | `assets/retro/characters/rider.png` |
| 追逐者 | `assets/<file>.png` | `assets/retro/chasers/<themeId>.png` |
| 汗珠 | `assets/sweat.png` | `assets/retro/fx/sweat.png` |
| 路面 | Graphics | `assets/retro/tiles/shared/road-body.png` 等 |
| 中景 | Graphics | `assets/retro/mid/<themeId>/*-strip.png` |
| 路肩 props | Graphics 路燈 | `assets/retro/props/<themeId>/*.png` |
| HUD | 玻璃 UI | 復古樣式（硬邊）+ 可選 `assets/retro/hud/*` |

場景 manifest：`getRetroSceneManifest(themeId)`（完整列表寫死於 `visual-style.ts`，與 scene-props §5 一致）。

---

## 4. 圖層與視差

| 層 | 速度（相對路面） | 實作 |
|----|------------------|------|
| L0 天空 | 0.08 | `TilingSprite` / 拼貼 |
| L1 遠景 | 0.20 | far strips |
| L2 中景 | 0.48 | mid strips |
| L3 props | 0.90 | 路肩 Sprite 輪換 |
| L4 路面 | 1.00 | tile + dash；坡度仍用 Graphics 形狀 |
| L5 角色 | — | 既有 rider/chaser |
| L6 FX | 1.12 | 預留 |
| L7 HUD | 0 | `GameHud` + CRT 掃描線 |

常數：`PARALLAX_SPEED` in `visual-style.ts`。

---

## 5. 復古渲染

1. `texture.source.scaleMode = 'nearest'`（`asset-loader` / `_ensureAssets`）  
2. `body[data-visual-style=retro] canvas { image-rendering: pixelated }`  
3. `Sprite.roundPixels = true`  
4. CRT：`_buildCrtOverlay()` 掃描線  
5. 角色幀：48×48 格（`RETRO_*_FRAMES`）；缺 sheet 時回落 modern 幀格  

---

## 6. 容錯

| 情況 | 行為 |
|------|------|
| 復古角色 PNG 缺 | 載入 modern sheet + console.warn；仍 nearest + CRT |
| 復古場景全缺 | `RetroParallaxWorld.build` → false → 既有 Graphics 背景 |
| 部分 mid/props 缺 | 略過該檔，載入成功的層仍顯示 |

---

## 7. 檔案清單

| 檔案 | 角色 |
|------|------|
| `game/visual-style.ts` | 風格型別、路徑、視差、場景 manifest、幀格 |
| `game/asset-loader.ts` | load + fallback |
| `game/retro-parallax.ts` | L0–L4 視差世界 |
| `game/game-state.ts` | `visualStyle` |
| `game/themes.ts` | `getTheme(id, style)` |
| `game/chase-scene.ts` | session 鎖定、角色載入、掛接 RetroParallax |
| `game/hud.ts` | 復古硬邊 HUD |
| `scenes/style-select-scene.ts` | 選擇 UI |
| `index.ts` | menu→style→plan→chase |
| `index.html` | pixelated CSS |
| `assets/retro/**` | 規格目錄骨架 |
| `docs/retro-*.md` | 素材規格（不改） |

---

## 8. 核心追逐邏輯改動邊界

**刻意不改：** `GameState.tick`、距離／狗狀態機、地形剖面公式、計畫資料、BLE。  

**可改視覺掛點：** `load()` 建層、`update()` 加 `roadDelta` 傳入視差、素材 alias。
