# 復古（Retro）視覺風格 — 素材設計規格

**專案：** 智慧騎行 · 追逐模式（cycling-chase-game）  
**風格定位：** 側視像素 · 參考 FC《坦克大戰》（Battle City）硬邊／有限色盤／tile 感  
**用途：** 繪師或 AI 圖像工具產出 `assets/retro/` 下全部素材  
**程式對應：** `src/renderer/game/visual-style.ts`、`getTheme(id, 'retro')`  
**場景／背景／多層視差詳規：** 見 [retro-scene-props-spec.md](./retro-scene-props-spec.md)（墓碑、靈骨塔、騎樓等可辨識物件）

> 本文**不**描述程式實作，只定義檔名、尺寸、幀配置、色盤與交件標準。

---

## 1. 風格總則

| 項目 | 規格 |
|------|------|
| 視角 | 純側視（side-view），角色朝右為主；追逐者在左、騎士在右 |
| 像素感 | 硬邊、無抗鋸齒；最終以 **nearest-neighbor** 放大 |
| 基準格 | **48×48 px** 為角色單元（可接受 32×32 再整數放大到 48） |
| 色盤 | 全專案主色盤 **24 色**；各主題可在主色盤內替換 2～4 色強調色 |
| 透明 | PNG-32，透明背景；禁止 JPG、禁止烘焙黑底 |
| 描邊 | 建議 1px 深色外框（#1a1c2c 或近黑），提升小尺寸可讀性 |
| 陰影 | 最多 1 層實心橢圓影（2～3 色階），不要柔邊高斯模糊 |
| 動畫 | 騎行／奔跑循環 **6 幀**；威脅／特殊 **3 幀** |

### 構圖不變（與現代模式相同）

```
[ 背景剪影 / tile 天空 ]
[ 中景 tile（樹／樓／山） ]
[ 路面 + 分道線 水平捲動 ]
追逐者 ──距離── 騎士(右 ~78% 螢幕)
[ HUD 不佔邏輯層 ]
```

---

## 2. 目錄與命名規則

```
assets/retro/
├── characters/
│   └── rider.png                 # 騎士 sheet
├── chasers/
│   ├── shiba.png
│   ├── bear.png
│   ├── godzilla.png
│   ├── redlady.png
│   ├── jiangshi.png
│   ├── alien.png
│   ├── dumptruck.png
│   ├── foodpanda.png
│   ├── grandma.png
│   ├── ambulance.png
│   ├── firetruck.png
│   └── bikini.png
├── tiles/
│   ├── road.png                  # 可平鋪路面
│   ├── road-dash.png             # 分道虛線單元
│   ├── sky-night.png             # 可選天空條
│   ├── mountain.png              # 遠山 tile 或條帶
│   └── ground-edge.png           # 路肩／草地邊緣
├── props/
│   ├── lamp.png                  # 路燈
│   ├── cone.png                  # 交通錐
│   ├── tree.png                  # 樹剪影
│   ├── building.png              # 樓房模組
│   └── barrier.png               # 護欄
├── hud/
│   ├── panel.9.png               # 可選 9-slice 面板（或 16×16 角磚）
│   ├── bar-fill.png              # 進度條填充 1×N 或 8×8
│   ├── bar-track.png
│   ├── icon-power.png            # 16×16
│   ├── icon-heart.png
│   ├── icon-cadence.png
│   └── font-sheet.png            # 可選像素字（若不用系統字）
└── fx/
    ├── sweat.png                 # 汗／粒子
    ├── dust.png                  # 煙塵 4 幀
    ├── explode.png               # 危險／撞擊 4～6 幀
    ├── spark.png
    └── warn.png                  # 驚嘆／危險標示
```

### 命名規則

- 全小寫、`kebab` 或 單字檔名；主題 ID 與 `themes.ts` 完全一致（`shiba` 不是 `dog`）。
- Sheet 一律 `.png`。
- 中間稿可加後綴：`shiba.work.png`（勿進版控正式路徑）。

---

## 3. 角色 Sprite Sheet 規格

### 3.1 通用格線（追逐者）

| 項目 | 值 |
|------|-----|
| Cell | **48×48** |
| 版面 | **6 欄 × 2 列** |
| 畫布 | **288×96** px |
| 上列（y=0） | 騎行／奔跑 6 幀 → 程式 `RETRO_RUN_FRAMES` |
| 下列（y=48） | 威脅／攻擊／特殊 3 幀（左三格）；右三格可留空或鏡像 |

```
+----+----+----+----+----+----+
| R0 | R1 | R2 | R3 | R4 | R5 |  ← run / ride
+----+----+----+----+----+----+
| A0 | A1 | A2 |    |    |    |  ← attack / bark / roar
+----+----+----+----+----+----+
  48   96  144  192  240  288  → x
```

**錨點建議：** 角色「著地點」置於 cell 底邊中央（程式 anchor 0.5, 1）。  
腳／輪底應貼齊 cell 下緣 1～2 px 內，避免浮空。

### 3.2 騎士 `characters/rider.png`

| 項目 | 值 |
|------|-----|
| Cell | 48×48 |
| 版面 | **6 欄 × 2 列** |
| 畫布 | **288×96** |
| 上列 | 正常騎行 6 幀 |
| 下列 | 緊張／冒汗騎行 6 幀 |

方向：車頭朝右。車架、輪組、騎士頭盔需在 48 格內可辨識。

### 3.3 十二追逐者（`chasers/<themeId>.png`）

| themeId | 顯示名 | 設計重點（像素可讀） | 建議主色 |
|---------|--------|----------------------|----------|
| `shiba` | 柴犬 | 四足奔跑、捲尾、臉部橘白 | 橘 `#e45c10` |
| `bear` | 黑熊騎車 | 熊+簡化單車，體積大於騎士 | 深褐 `#5c3a21` |
| `godzilla` | 哥吉拉騎車 | 背鰭剪影、綠灰、小車反差 | 綠 `#4a7c23` |
| `redlady` | 紅衣小姐 | 長髮、紅衣、單車 | 紅 `#b41e1e` |
| `jiangshi` | 跳殭屍 | 符紙、僵直姿勢、跳感幀 | 青藍 `#3cbcfc` + 紙黃 |
| `alien` | 外星人 | 大頭、細肢、飛碟感可選 | 綠 `#80d010` |
| `dumptruck` | 砂石車 | 側視卡車、斗內石頭、兇臉燈 | 黃 `#fcbcb0` / 橘 |
| `foodpanda` | 外送員 | 粉紅頭盔+保溫箱剪影 | 粉 `#f838a0` |
| `grandma` | 阿嬤三輪 | 三輪車、斗笠／髮髻 | 米 `#fce4a8` |
| `ambulance` | 救護車 | 箱型車、紅十字／條紋 | 白+紅 `#fc7460` |
| `firetruck` | 消防車 | 長車身、梯、警示燈 | 紅 `#e40058` |
| `bikini` | 海邊女騎士 | 側視公路車、長髮、泳裝可讀 | 膚+紅褐 `#d07040` |

**威脅幀（A0–A2）示意：**

- 動物：吠、撲、張嘴  
- 人物：前傾加速、揮手、回頭  
- 車輛：大燈、衝刺塵土、開口「吃人」表情  

### 3.4 顯示倍率（給引擎／核對用）

源 48px，nearest 整數倍。建議畫面上約：

| 角色 | 倍數 | 約略高度 |
|------|------|----------|
| 柴犬 | ×3.5 → 實作可 ×3～4 | ~168 |
| 一般人物／阿嬤 | ×6 | 288 |
| 外送／比基尼 | ×6～6.5 | 288～312 |
| 熊／哥吉拉 | ×7～7.5 | 336～360 |
| 砂石車／消防車 | ×8 | 384 |
| 騎士 | ×6 | 288 |

---

## 4. 主色盤（24 色）

Battle City 式有限色，可直接當索引色。

| # | Hex | 用途 |
|---|-----|------|
| 0 | `#000000` | 透明外／純黑（少用填滿） |
| 1 | `#1a1c2c` | 描邊、夜空深 |
| 2 | `#5d576b` | 陰影、山遠 |
| 3 | `#8b8699` | 中灰、混凝土 |
| 4 | `#c4c1cc` | 亮灰、車殼 |
| 5 | `#fcfcfc` | 高光、白漆、HUD 字 |
| 6 | `#2038ec` | 夜藍、霓虹 |
| 7 | `#3cbcfc` | 亮青、UI 強調 |
| 8 | `#0c1444` | 路面底 |
| 9 | `#442434` | 暗紅影 |
| 10 | `#ad1d3a` | 警戒紅 |
| 11 | `#e40058` | 火紅、消防車 |
| 12 | `#e45c10` | 柴犬橘、砂石 |
| 13 | `#f87858` | 膚橘、警告 |
| 14 | `#f8b800` | 路燈、金 |
| 15 | `#fce4a8` | 月、紙、淺膚 |
| 16 | `#4a7c23` | 哥吉拉綠 |
| 17 | `#80d010` | 異形、螢光 |
| 18 | `#346524` | 樹、草 |
| 19 | `#5c3a21` | 熊褐、木 |
| 20 | `#f838a0` | Foodpanda 粉 |
| 21 | `#7c18a8` | 紫霓虹、夜店 |
| 22 | `#3cbcfc` | （可與 7 共用）掃描高光 |
| 23 | `#747474` | 金屬暗部 |

**限制：** 單一角色 sprite 建議 ≤ **12 色**（含透明）。

---

## 5. 路面與背景 Tile

### 5.1 `tiles/road.png`

| 項目 | 規格 |
|------|------|
| 尺寸 | **64×32** 或 **48×24**（可水平 seamless） |
| 內容 | 深色瀝青 + 1～2 px 亮邊；可含細石點 |
| 平鋪 | 水平無縫；垂直可只畫上半路面 |

### 5.2 `tiles/road-dash.png`

| 項目 | 規格 |
|------|------|
| 尺寸 | **16×4** 或 **24×4** |
| 內容 | 中央分道虛線一段（黃或白） |

### 5.3 `tiles/mountain.png` / `tree.png` / `building.png`

- 遠景用 **低飽和、少色**（2～4 色）  
- 建議高度 32～64 px，寬度 48～96，可重複拼中景  

### 5.4 主題場景差異（仍用同一套 props 換色／組合）

| 主題群 | 中景 props 組合 |
|--------|-----------------|
| 公路 shiba | mountain + lamp |
| 森林 bear | tree ×N + fog 用半透明 tile |
| 都市 godzilla / foodpanda | building + neon 色塊 |
| 墓地 redlady | 簡化墓碑 prop（可加 `props/tomb.png`） |
| 車輛主題 | cone + barrier |

程式在缺 tile 時仍會用 Graphics 畫背景；tile 為加分項。

---

## 6. 路燈與場景物件

| 檔名 | 尺寸 | 說明 |
|------|------|------|
| `props/lamp.png` | 16×48 | 燈杆+燈罩；燈罩 1 色高亮 |
| `props/cone.png` | 16×16 | 交通錐 |
| `props/barrier.png` | 32×16 | 護欄段，可平鋪 |
| `props/tree.png` | 32×48 | 剪影樹 |
| `props/building.png` | 48×64 | 樓窗用 1～2 色點燈 |

全部透明底、硬邊。

---

## 7. 復古 HUD 素材

HUD 邏輯數值不變；素材提供「磚塊 UI」外觀。

| 檔名 | 尺寸 | 說明 |
|------|------|------|
| `hud/panel-corner.png` | 8×8 | 四角可鏡射拼面板 |
| `hud/panel-edge.png` | 8×8 | 邊（可拉伸） |
| `hud/bar-track.png` | 8×8 | 槽底色 |
| `hud/bar-fill.png` | 8×8 | 填充（程式可 tint） |
| `hud/icon-*.png` | 16×16 | 功率／心率／踏頻 |
| `hud/warn.png` | 16×16 | 危險 |

**字：** 優先系統等寬 + 像素 CSS；可選 `font-sheet.png`（8×8 字模，ASCII 或數字 0–9 + 冒號）。

**配色：** 字 `#fcfcfc`，強調 `#f8b800` / `#3cbcfc`，危險 `#e40058`，底 `#0c1444`。

---

## 8. 特效 FX

| 檔名 | 格 | 畫布建議 | 說明 |
|------|----|----------|------|
| `fx/dust.png` | 4 幀 × 16×16 | 64×16 | 車輪塵、砂石車揚塵 |
| `fx/explode.png` | 6 幀 × 24×24 | 144×24 | 危險衝擊 |
| `fx/spark.png` | 4 幀 × 8×8 | 32×8 | 火花 |
| `fx/sweat.png` | 4 幀 × 16×16 | 64×16 | 緊張汗滴 |
| `fx/warn.png` | 2 幀閃爍 16×16 | 32×16 | 驚嘆號 |

動畫：每幀停留 2～4 遊戲幀，nearest 放大。

---

## 9. 與 `themes.ts` 對應關係

| 程式欄位 | 現代 | 復古 |
|----------|------|------|
| `chaser.spriteSrc` | `assets/<name>.png` | `assets/retro/chasers/<themeId>.png` |
| `chaser.runFrames` | 各主題精準裁切 | 固定 48 格 6 幀 |
| `chaser.attackFrames` | 各主題精準裁切 | 固定 48 格 3 幀 |
| `chaser.displayHeight` | 170～520 | 見 §3.4 |
| `chaser.assetAlias` | `chaser-<id>` | `retro:chaser-<id>` |
| 騎士 | `assets/rider.png` | `assets/retro/characters/rider.png` |
| 背景旗標 `showForest` 等 | 邏輯不變 | 同一旗標；素材改像素 props |
| 行為 `animSpeedMul` 等 | 不變 | 不變 |

**themeId 清單（必須檔名一致）：**  
`shiba` `bear` `godzilla` `redlady` `jiangshi` `alien` `dumptruck` `foodpanda` `grandma` `ambulance` `firetruck` `bikini`

---

## 10. 交件檢查清單（QA）

- [ ] 全 PNG-32，無黑底  
- [ ] 追逐者 sheet 皆為 **288×96**（或等比 48 格）  
- [ ] 騎士 **288×96**，上下列各 6 幀  
- [ ] 著地點貼 cell 底  
- [ ] 色數符合限制  
- [ ] 水平方向：主體朝右  
- [ ] 檔名 = themeId  
- [ ] 在 nearest ×6 下仍可辨認車輪／臉  
- [ ] 無 JPEG 壓縮塊、無半透明抗鋸齒紫邊（可預乘 alpha）

---

## 11. AI 圖像工具提示範本（英文可直接貼）

```
Game sprite sheet, Battle City / 8-bit NES style, side-view,
hard pixel edges, no anti-aliasing, limited 12-color palette,
transparent background, 48x48 tiles, 6 columns 2 rows,
top row: 6 frames of <SUBJECT> riding/running to the right,
bottom row: 3 frames of attack/threat pose,
clean outline, readable silhouette, retro pixel art
```

將 `<SUBJECT>` 換成例如：`orange shiba inu running`、`dump truck with angry face`。

---

## 12. 優先產出順序（給排程）

1. `characters/rider.png`  
2. `chasers/shiba.png`（驗證管線）  
3. 其餘 11 追逐者  
4. `tiles/road.png` + `props/lamp.png`  
5. `fx/*` + `hud/*`  

缺檔時程式會 **回落現代素材** 並仍套用 nearest + 掃描線，但正式復古體驗以本清單齊備為準。
