# 復古（Retro）場景物件與背景系統 — 設計規格 v2

**專案：** 智慧騎行 · 追逐模式（cycling-chase-game）  
**配套文件：** [角色／通用素材規格](./retro-asset-spec.md)  
**風格錨點：** 硬邊、有限色、清晰輪廓（Battle City 系可讀性）＋ **16-bit 級細節與材質分層**  
**構圖鎖定：** 側視；騎士在右、追逐者在左、道路水平捲動  

> 本文只定義視覺、圖層、無縫圖塊、主題物件與交件標準，**不涉及程式碼實作**。

---

## 0. 設計總則

### 0.1 風格定位（精緻 16-bit 像素）

| 要做 | 不要做 |
|------|--------|
| 硬邊輪廓、1px 描邊可讀 | 柔邊抗鋸齒、油畫糊邊 |
| 每物件「叫得出名字」 | 抽象色塊／純黑剪影山 |
| 2～4 階明暗 + 材質點綴 | 單色平塗無結構 |
| 有限色盤（每主題 16～32） | 全彩照片感 |
| 側視、站立於路肩／嵌中景 | 斜 45°、俯視、透視變形過大 |

**目標感受：** 比一般 8-bit 更密的像素敘事；比現代手繪更「遊戲 tile 化」。玩家應在 0.5 秒內讀出主題。

### 0.2 構圖（全主題共用，不可改）

```
螢幕 ──────────────────────────────────► 右
│
│  L0  天空／遠霞／星月          視差最慢
│  L1  遠景循環帶（山／海／遠城）  慢
│  L2  中景主題建築／植被 strip    中
│  L3  路肩近景 props（可點綴）    快（接近路面）
│  L4  路面 tile + 分道線          基準 = 1.0
│  L5  角色（騎士右 ~78%、追逐者左）
│  L6  前景粒子／FX（可選）        略快於路面
│  L7  HUD（固定不捲）
```

### 0.3 建議視差速度比

| 圖層 | 相對路面速度 | 說明 |
|------|--------------|------|
| L0 天空／星 | 0.05～0.10 | 幾乎靜止 |
| L1 遠景 | 0.15～0.25 | 山、海平線、遠城 |
| L2 中景 | 0.40～0.55 | 塔、騎樓、樹帶 |
| L3 路肩 props | 0.85～0.95 | 墓碑、路燈、機車 |
| L4 路面 | **1.00** | 捲動基準 |
| L6 前景 FX | 1.05～1.20 | 紙錢、落葉、火花 |

### 0.4 角色基準（與場景比例）

| 項目 | 規格 |
|------|------|
| 角色格 | **48×48** 源像素（sheet 另見角色規格） |
| 畫面顯示 | nearest 整數倍放大（常見 ×4～×6） |
| 場景 props | 可小於角色；高度多在 16～64 px 源圖 |
| 中景建築 | 高度常 48～96 px，寬 128～256 循環 |

---

## 1. 圖層結構與通用 Tile

### 1.1 圖層職責

| ID | 名稱 | 內容 | 源像素高度參考 |
|----|------|------|----------------|
| L0 | Sky | 夜空、星、月、遠霞 | 全高或上 60% 條帶 |
| L1 | Far | 遠山／遠海／遠城天際線 | **32～48 px** 高，寬可平鋪 |
| L2 | Mid | 主題建築帶、樹帶、塔帶 | **48～96 px** 高，**128～256 px** 寬無縫段 |
| L3 | Roadside | 可擺放獨立 props | 16～64 px 高 |
| L4 | Road | 路面、路肩、分道線 | 路面帶 **固定 48 px 高** |
| L5 | Actors | 騎士／追逐者 | 48 格角色 |
| L6 | FX | 煙、火、紙錢、霧條 | 8～32 px |
| L7 | HUD | UI | 固定 |

### 1.2 通用路面（全主題基底）— 高度固定 48px

| 檔名建議 | 尺寸 | 說明 |
|----------|------|------|
| `tiles/shared/road-body.png` | **64×48** 或 **96×48** | 瀝青主面，**水平無縫**；細石 2～3 色 |
| `tiles/shared/road-dash.png` | **24×4**～**32×4** | 中央分道虛線一節（黃／米白） |
| `tiles/shared/road-edge-top.png` | 64×8 | 上緣亮線／與路肩銜接 |
| `tiles/shared/road-edge-bot.png` | 64×8 | 下緣暗邊 |
| `tiles/shared/shoulder.png` | **64×16** | 預設路肩（泥／草／磚，主題可覆蓋） |
| `tiles/shared/sky-night.png` | 128×96 或 256×128 | 可水平平鋪夜空 |
| `tiles/shared/moon.png` | 16×16 或 24×24 | 單月，非整塊 tile |

**主題可換：** 路肩色／材質、特殊路面（泥路、沙地）；**不建議**每主題重畫整條瀝青，除非敘事需要。

### 1.3 中景循環區段尺寸

| 類型 | 建議尺寸 | 用途 |
|------|----------|------|
| 窄循環 | **128×64** | 樹帶、圍牆、欄杆 |
| 標準循環 | **192×80** 或 **256×96** | 騎樓、醫院、靈骨塔群 |
| 遠景條 | **256×32**～**48** | 山脈、海平線、遠城 |

每段中景應含 **2～4 個可辨識物件**，避免單一圖騰死板重複。

---

## 2. 可重複圖塊與無縫設計

### 2.1 捲軸原理

1. **左右邊緣像素必須可對接**（seamless horizontal）。  
2. 垂直方向通常**不需**無縫（地面有明確上下界）。  
3. 重複週期內，「超大獨特標記」最多 1 次，否則捲動穿幫。  
4. 用 **A/B 變體 strip** 交錯（A-B-A-C）降低重複感。  
5. 動畫幀（火、煙、紙錢）外接矩形一致，避免跳動。

### 2.2 尺寸總表

| 資產類 | 寬 | 高 | 無縫 |
|--------|----|----|------|
| 路面 body | 64 / 96 | **48** | 水平 |
| 分道線 | 24～32 | 4 | 水平（節奏型） |
| 路肩 | 64 | 12～16 | 水平 |
| 遠景條 | 256 | 32～48 | 水平 |
| 中景條 | 128～256 | 64～96 | 水平 |
| 欄杆段 | 32 | 12～24 | 水平 |
| 騎樓柱距單元 | 32～48 | 含於 strip | 水平 |

### 2.3 繪師自測清單

1. 影像軟體中 **水平複製兩次** 並排，接縫無斷線、無亮度跳變。  
2. 柱、窗格等垂直線不要壓在左右最外 1px。  
3. 接縫兩側細節密度相近（燈窗、碎石）。  
4. 動畫 strip：每一幀單獨通過 1～3。  
5. 放大 400% nearest：無半透明紫邊、無 JPEG 塊。

### 2.4 分道線節奏建議

- 亮段 16～20 px、空段 12～16 px（或由引擎間距控制）  
- 色：`#f8b800` / `#fce4a8`，勿過亮搶角色

---

## 3. 命名規則與資料夾結構

```
assets/retro/
├── characters/
│   └── rider.png                 # 角色規格（48 格 sheet）
├── chasers/
│   └── <themeId>.png             # 12 追逐者
├── tiles/
│   ├── shared/                   # 全主題共用路面／天空
│   │   ├── road-body.png         # 64×48 或 96×48
│   │   ├── road-dash.png
│   │   ├── road-edge-top.png
│   │   ├── road-edge-bot.png
│   │   ├── shoulder.png
│   │   ├── sky-night.png
│   │   └── moon.png
│   └── <themeId>/                # 主題路肩／特殊路面
│       └── shoulder-*.png | road-*.png
├── mid/                          # 中景／遠景無縫長條
│   └── <themeId>/
│       └── *-strip.png
├── props/
│   ├── shared/                   # 跨主題可重用
│   └── <themeId>/                # 主題專屬
├── fx/
│   ├── shared/
│   └── <themeId>/                # 含 2f / 4f 動畫
└── hud/                          # 復古 UI 磚（可選）
```

### 命名規則

```
<layer>-<subject>[-variant][-animN].png
```

| 規則 | 範例 |
|------|------|
| 全小寫 kebab-case | `tomb-stele-a.png` |
| themeId 與遊戲一致 | `shiba` `redlady` `foodpanda`… |
| 變體 | `-a` `-b` `-c` |
| 動畫幀數後綴 | `flame-4f.png` `joss-paper-4f.png` |
| 中景循環 | `columbarium-strip.png` `arcade-strip.png` |

**themeId 清單：**  
`shiba` `bear` `godzilla` `redlady` `jiangshi` `alien` `dumptruck` `foodpanda` `grandma` `ambulance` `firetruck` `bikini`

---

## 4. 色盤建議

### 4.1 全域夜騎基底（16 色核）

| Hex | 用途 |
|-----|------|
| `#0a0c14` | 最深夜空 |
| `#141828` | 天空次深、遠影 |
| `#1e2438` | 中景暗部 |
| `#2a3348` | 路面暗瀝青 |
| `#3d465c` | 路面亮階 |
| `#5c6578` | 石、混凝土 |
| `#8b92a4` | 亮石、欄杆、字感 |
| `#c5cad4` | 高光灰白 |
| `#e8ecf4` | 月、燈心白 |
| `#3cbcfc` | 夜青強調、霓虹 |
| `#f8b800` | 路燈金、警示 |
| `#e45c10` | 暖橙、火、紙錢 |
| `#ad1d3a` | 警戒紅 |
| `#4a7c23` | 植披暗綠、青苔 |
| `#5c3a21` | 土、木 |
| `#fce4a8` | 紙、淺膚、燈暈 |

### 4.2 各主題強調色（基底上 +4～8 色，總 ≤32）

| themeId | 強調方向 |
|---------|----------|
| shiba | 路燈金、遠山藍紫 |
| bear | 霧青灰、螢火蟲黃綠 |
| godzilla | 霓虹粉紫、窗黃 |
| **redlady** | **墓石青灰、紙錢淺黃、香火橘、青苔綠** |
| jiangshi | 符紙黃、陰綠、藍霧 |
| alien | 異常綠、麥田圈淺線、UFO 青 |
| dumptruck | 工程橘、泥黃、護欄紅白 |
| foodpanda | 店招粉紅／青、騎樓暖燈 |
| grandma | 鐵門綠、磚紅、燈光暖黃 |
| ambulance | 醫院白、十字紅、急診藍 |
| firetruck | 焰橙紅、煙灰、焦黑 |
| bikini | 海水深藍、浪白、沙米 |

**單張 props 建議 ≤ 12 色（含透明）。**

---

## 5. 墓地主題（redlady）— 特別詳細規格

> **驗收標竿：** 玩家 0.5 秒內讀出「台灣風夜間墓地」，不是黑色三角山。

### 5.1 圖層配置

| 圖層 | 內容 |
|------|------|
| L0 | 深紫夜空、淡月、稀星 |
| L1 | 遠山 + 稀疏遠墓小點（低對比） |
| L2 | **靈骨塔／納骨堂長條** + 圍牆循環 |
| L3 | **墓碑、土丘、香爐、石燈、枯樹、鐵欄** |
| L4 | 偏灰路面；路肩泥土／碎石 |
| L6 | 紙錢飄、鬼火（2～4 幀） |

### 5.2 墓碑（至少 4 變體，必須可辨識）

| 檔名 | 建議尺寸 | 必須細節 |
|------|----------|----------|
| `props/redlady/tomb-stele-a.png` | 24×40 | 長方碑、頂冠或斜頂、**中央直書紋樣**（2～3 條垂直像素即可）、**雙層底座** |
| `props/redlady/tomb-stele-b.png` | 20×36 | 較瘦碑、兩側紋、底座 |
| `props/redlady/tomb-round-a.png` | 28×32 | **圓頂／拱頂**，碑身有框線 |
| `props/redlady/tomb-double.png` | 40×36 | 雙連／家族寬碑，中分線 |
| `props/redlady/tomb-broken.png` | 24×28 | 缺角／裂紋（少用點綴） |

**繪製要點：**

- 石材 **≥3 階**（暗／中／亮），禁止單色灰三角  
- 「字」不需可讀漢字，但要有直書欄或橫額像素區  
- 底座比碑身寬 2～4 px  
- 底部可加 1px 青苔（`#4a7c23`）  
- 禁止：無底座浮空碑、歐式十字架成排（至多 0～1 點綴）

### 5.3 土丘／墳堆（至少 3 變體）

| 檔名 | 建議尺寸 | 細節 |
|------|----------|------|
| `props/redlady/mound-a.png` | 40×20 | 半橢圓土堆，頂可插小碑或香 |
| `props/redlady/mound-b.png` | 48×22 | 較寬、土色 3 階、可有小石 |
| `props/redlady/mound-c.png` | 32×18 | 矮丘 + 紙錢散落點 |

**光影：** 亮邊在上／略左上（月側），陰影右下；輪廓硬像素但形體圓潤。

### 5.4 靈骨塔／納骨塔（中景主角）

| 檔名 | 建議尺寸 | 細節 |
|------|----------|------|
| `mid/redlady/columbarium-strip.png` | **256×96** 無縫 | 見下 |
| `props/redlady/columbarium-unit.png` | 48×64 | 單段可拼 |

**必須具備：**

1. **垂直 ≥3 層** 窗戶或納骨格位橫列  
2. 每層 **重複小格／門洞**（2×3 或 3×4 px 即可）  
3. **可辨屋頂**（平頂女兒牆或簡化翹角 2～3 階）  
4. **較大門洞**（深色洞 + 亮門框）  
5. 可選：側階、頂亭、長明燈一點橘黃  
6. 牆：`#5c6578`～`#8b92a4`；窗洞 `#0a0c14`；燈 `#f8b800` / `#e45c10`

**256px 無縫段建議節奏（左→右）：**

```
[圍牆+門柱] — [主塔 3 層] — [矮連廊] — [側塔] — [鐵門缺口] — 接回圍牆
```

左右邊緣落在「圍牆重複單元」上。

### 5.5 其他墓地 props（強烈建議）

| 檔名 | 尺寸 | 可辨識特徵 |
|------|------|------------|
| `props/redlady/censer.png` | 16×16 | 香爐；可靜態 1～2 px 煙 |
| `props/redlady/joss-stick.png` | 8×16 | 三炷香，頂端橘點 |
| `props/redlady/stone-lantern.png` | 16×28 | 石燈籠，燈窗亮 |
| `props/redlady/iron-fence.png` | 32×24 | 尖頂鐵柵，可平鋪 |
| `props/redlady/gate-pillar.png` | 16×40 | 墓園門柱 |
| `props/redlady/dead-tree.png` | 32×48 | 枯枝 ≥3 主分叉 |
| `props/redlady/path-stone.png` | 24×8 | 石徑一小段 |
| `fx/redlady/joss-paper-4f.png` | 4×(12×12) | 金紙／銀紙飄 |
| `fx/redlady/will-o-wisp-2f.png` | 2×(8×8) | 青藍鬼火 |

### 5.6 路肩擺放節奏（設計參考）

每 200～300 邏輯像素一組可讀組合，例如：

1. 雙碑 + 土丘 + 香爐  
2. 鐵欄一段 + 枯樹  
3. 中景塔對齊時，近景少放高大 props（避免糊成一團）  
4. 紙錢粒子在空段較密  

### 5.7 墓地禁用

- ❌ 只有黑三角山  
- ❌ 大面積血泊 gore  
- ❌ 歐式墓園為主視覺  
- ✅ 紙錢、香、塔、碑、丘、鐵欄、長明燈  

---

## 6. 各主題場景物件清單

每主題建議至少：**1× mid strip（192～256 寬）** + **≥3 可辨識 props** + **路肩或路面變體（若需要）** + **可選 FX**。

---

### 6.1 柴犬公路 · `shiba`

**氣氛：** 夜間郊區／省道，乾淨略空曠。

| 類型 | 檔名 | 尺寸 | 可辨識細節 |
|------|------|------|------------|
| 遠／中 | `mid/shiba/hills-strip.png` | 256×40～48 | 遠山 2～3 階層次，非單色 |
| 中景 | `mid/shiba/powerline-strip.png` | 192×48 | 電線杆節奏 + 1px 電線 |
| Props | `props/shiba/lamp.png` | 16×48 | 彎臂路燈、燈罩亮 |
| Props | `props/shiba/utility-pole.png` | 12×56 | 橫擔、絕緣子小點 |
| Props | `props/shiba/reflector.png` | 12×16 | 反光導標紅白／黃 |
| Props | `props/shiba/sign-curve.png` | 20×24 | 彎道／速限簡化牌 |
| Props | `props/shiba/grass-tuft.png` | 16×12 | 路邊雜草叢 |
| Props | `props/shiba/mile-stone.png` | 12×16 | 里程碑 |
| 路肩 | `tiles/shiba/shoulder.png` | 64×16 | 泥草混合 |
| FX | `fx/shared/moth-2f.png` | 可選 | 燈下小蟲 |

---

### 6.2 黑熊森林 · `bear`

**氣氛：** 密林夜路、濕、有霧。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/bear/pine-strip.png` | 256×80 | 針／闊葉混合，**樹幹可辨** |
| 中景 | `mid/bear/fog-band.png` | 128×24 | 半透明霧條 2 階 alpha 色 |
| Props | `props/bear/tree-a.png` | 32×56 | 近樹，樹皮 2 色 |
| Props | `props/bear/tree-b.png` | 28×48 | 變體 |
| Props | `props/bear/stump.png` | 20×16 | 樹樁年輪簡化 |
| Props | `props/bear/mushroom.png` | 12×12 | 傘狀蘑菇 |
| Props | `props/bear/rock-a.png` | 20×12 | 苔石 |
| Props | `props/bear/log.png` | 28×12 | 橫倒木 |
| Props | `props/bear/fern.png` | 16×16 | 蕨類 |
| FX | `fx/bear/firefly-2f.png` | 2×(4×4) | 螢火蟲 |
| FX | `fx/bear/leaf-4f.png` | 落葉 4 幀 | |

---

### 6.3 哥吉拉都市 · `godzilla`

**氣氛：** 夜間摩天樓峽谷、霓虹。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/godzilla/skyline-strip.png` | 256×96 | 高低樓，**窗網格可讀** |
| 中景 | `mid/godzilla/neon-strip.png` | 192×32 | 霓虹條、看板色塊 |
| Props | `props/godzilla/building-a.png` | 40×72 | 單樓，窗 2×2 陣列 |
| Props | `props/godzilla/sign-shop.png` | 24×16 | 直／橫招牌 |
| Props | `props/godzilla/street-lamp.png` | 16×40 | 市電路燈 |
| Props | `props/godzilla/wreck-car.png` | 32×16 | 車輛殘骸側視 |
| Props | `props/godzilla/hydrant.png` | 12×16 | 消防栓 |
| Props | `props/godzilla/rubble.png` | 24×12 | 碎石堆 |
| FX | `fx/godzilla/window-blink-2f.png` | 可選 | 窗燈光閃 |

**窗燈：** 黃 `#fce4a8` 隨機點亮約 30～50% 格子，避免整面同一亮度。

---

### 6.4 紅衣墓地 · `redlady`

見 **§5**。摘要必交：

- 墓碑 ≥4、土丘 ≥3、靈骨塔 mid strip、香爐、石燈、鐵欄、枯樹、紙錢 FX  

---

### 6.5 跳殭屍聚落 · `jiangshi`

**氣氛：** 廢棄鄉下、三合院感、陰。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/jiangshi/village-strip.png` | 256×80 | 廢屋屋頂線、門洞、牆裂 |
| Props | `props/jiangshi/house-ruin.png` | 48×40 | 破窗、塌角 |
| Props | `props/jiangshi/wall-broken.png` | 32×24 | 土角牆／磚牆缺口 |
| Props | `props/jiangshi/gate-old.png` | 24×32 | 舊門樓 |
| Props | `props/jiangshi/joss-paper-pile.png` | 16×12 | 紙錢堆 |
| Props | `props/jiangshi/candle.png` | 8×12 | 香燭，焰 1 px |
| Props | `props/jiangshi/talisman.png` | 8×12 | 符紙 |
| Props | `props/jiangshi/well.png` | 20×16 | 古井（可選） |
| FX | `fx/jiangshi/candle-flicker-2f.png` | 2 幀 | 燭火 |
| FX | `fx/jiangshi/joss-paper-4f.png` | 可與墓地共用 | |

---

### 6.6 外星人田野 · `alien`

**氣氛：** 夜間田野、「整齊得不對勁」。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/alien/field-strip.png` | 256×48 | 稻／麥行列，可無縫 |
| 中景 | `mid/alien/crop-circle-hint.png` | 64×32 | 局部麥田圈弧（少用） |
| Props | `props/alien/scarecrow.png` | 24×40 | 稻草人 |
| Props | `props/alien/crop-a.png` | 16×24 | 作物叢 |
| Props | `props/alien/ufo-wreck.png` | 40×20 | 飛碟殘骸 |
| Props | `props/alien/weird-plant.png` | 16×24 | 球莖／觸手植物 |
| Props | `props/alien/fence-wood.png` | 32×16 | 木柵 |
| Props | `props/alien/light-pole.png` | 12×36 | 怪異探照燈 |
| 路肩 | `tiles/alien/shoulder-soil.png` | 64×16 | 田埂土 |
| FX | `fx/alien/ufo-glow-2f.png` | 2 幀 | 青光脈動 |

---

### 6.7 砂石車山路 · `dumptruck`

**氣氛：** 便道、工地、粉塵。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/dumptruck/cliff-strip.png` | 256×64 | 岩壁／切坡層理 |
| Props | `props/dumptruck/guardrail.png` | 32×16 | 護欄段，可平鋪 |
| Props | `props/dumptruck/barrier.png` | 24×20 | 工程圍籬、斜紋 |
| Props | `props/dumptruck/cone.png` | 12×16 | 交通錐 |
| Props | `props/dumptruck/rubble-pile.png` | 28×16 | 碎石堆 |
| Props | `props/dumptruck/dirt-mound.png` | 36×18 | 土堆 |
| Props | `props/dumptruck/sign-work.png` | 20×20 | 施工標誌 |
| Props | `props/dumptruck/barrel.png` | 12×16 | 拒馬／油桶 |
| 路面 | `tiles/dumptruck/road-dirt.png` | **64×48** | 泥石路面變體（高仍 48） |
| FX | `fx/dumptruck/dust-4f.png` | 4 幀 | 揚塵 |

---

### 6.8 外送市區 · `foodpanda`

**氣氛：** 台灣騎樓夜街。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/foodpanda/arcade-strip.png` | **256×96** | **騎樓柱列+店面**，柱距規律無縫 |
| Props | `props/foodpanda/shop-a.png` | 40×40 | 店面、捲門紋 |
| Props | `props/foodpanda/sign-vert.png` | 12×28 | 直式招牌 |
| Props | `props/foodpanda/sign-horiz.png` | 28×12 | 橫招 |
| Props | `props/foodpanda/scooter.png` | 28×20 | 停放機車側視 |
| Props | `props/foodpanda/scooter-b.png` | 28×20 | 變體 |
| Props | `props/foodpanda/plant-pot.png` | 12×16 | 盆栽 |
| Props | `props/foodpanda/traffic-light.png` | 12×24 | 號誌 |
| FX | `fx/foodpanda/neon-flicker-2f.png` | 2 幀 | 招牌閃 |

**騎樓 strip 必備：** 柱、騎樓頂線、店門、至少一種招牌、地面陰影帶。

---

### 6.9 巷弄阿嬤 · `grandma`

**氣氛：** 老巷、鐵窗、生活感。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/grandma/alley-strip.png` | 256×80 | 舊公寓、鐵窗格 |
| Props | `props/grandma/iron-door.png` | 24×40 | 鐵門、門花 |
| Props | `props/grandma/window-cage.png` | 20×20 | 鐵窗 |
| Props | `props/grandma/clothes-rack.png` | 28×24 | 晾衣架+衣物色塊 |
| Props | `props/grandma/pot-plant.png` | 12×16 | 盆栽 |
| Props | `props/grandma/scooter-old.png` | 28×18 | 老機車 |
| Props | `props/grandma/mailbox.png` | 12×12 | 信箱 |
| Props | `props/grandma/brick-wall.png` | 32×24 | 紅磚牆段 |
| Props | `props/grandma/bai-bai-table.png` | 20×16 | 可選門口小桌 |

---

### 6.10 救護車 · `ambulance`

**氣氛：** 醫院外、急診動線。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/ambulance/hospital-strip.png` | 256×96 | 醫院外牆、帶狀窗、**十字／紅標** |
| Props | `props/ambulance/er-sign.png` | 28×16 | 急救／ER 標 |
| Props | `props/ambulance/cross-sign.png` | 16×16 | 醫療十字 |
| Props | `props/ambulance/barrier-red.png` | 24×16 | 路障 |
| Props | `props/ambulance/entrance.png` | 32×40 | 急診雨棚入口 |
| Props | `props/ambulance/lamp-blue.png` | 12×20 | 藍燈警示柱 |
| Props | `props/ambulance/stretcher.png` | 24×12 | 可選推床 |
| FX | `fx/ambulance/beacon-2f.png` | 2 幀 | 紅藍閃 |

---

### 6.11 消防車 · `firetruck`

**氣氛：** 火災餘韻、熱、煙。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/firetruck/burnt-street-strip.png` | 256×64 | 焦黑建築、破窗 |
| Props | `props/firetruck/hydrant.png` | 12×16 | 消防栓亮紅 |
| Props | `props/firetruck/scorch.png` | 32×12 | 地面燒痕 |
| Props | `props/firetruck/debris.png` | 24×12 | 殘骸 |
| Props | `props/firetruck/hose.png` | 28×10 | 水帶盤 |
| Props | `props/firetruck/cone.png` | 12×16 | 錐 |
| FX | `fx/firetruck/flame-4f.png` | 4×(16×20) | 小火 |
| FX | `fx/firetruck/smoke-4f.png` | 4×(24×24) | 濃煙 |
| FX | `fx/firetruck/ember-2f.png` | 2 幀 | 火花 |

**火焰色階：** 暗紅 → 橘 → 黃 → 白芯（3～4 色），硬邊。

---

### 6.12 海邊騎行 · `bikini`

**氣氛：** 夜間海岸／河岸公路。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 遠／中 | `mid/bikini/sea-strip.png` | 256×40～48 | 海平線+深淺海兩帶 |
| 中景 | `mid/bikini/wave-strip-2f.png` | 128×16×2 幀 | 近海浪線輕動畫 |
| Props | `props/bikini/lighthouse.png` | 20×48 | 燈塔層層收分、頂燈 |
| Props | `props/bikini/rock.png` | 24×16 | 礁石 |
| Props | `props/bikini/rock-b.png` | 20×12 | 變體 |
| Props | `props/bikini/umbrella.png` | 20×20 | 遮陽傘 |
| Props | `props/bikini/rail.png` | 32×12 | 護欄段 |
| Props | `props/bikini/lifebuoy.png` | 12×12 | 救生圈 |
| Props | `props/bikini/beach-chair.png` | 16×12 | 可選 |
| 路肩 | `tiles/bikini/shoulder-sand.png` | 64×16 | 沙 |
| FX | `fx/bikini/sparkle-2f.png` | 可選 | 浪光 |

---

## 7. 跨主題共用 props（`props/shared/`）

| 檔名 | 可重用主題 |
|------|------------|
| `lamp-street.png` | shiba, godzilla, foodpanda |
| `cone.png` | dumptruck, firetruck, ambulance |
| `hydrant.png` | godzilla, foodpanda, firetruck |
| `guardrail.png` | dumptruck, bikini（可調色） |
| `moon.png` | 幾乎全部（或放 tiles/shared） |

---

## 8. 簡單動畫規格

| 類型 | 幀數 | 格大小 | 排列 | 備註 |
|------|------|--------|------|------|
| 火焰 | 4 | 16×20 | 橫向 | 中心大致對齊 |
| 煙 | 4 | 24×24 | 橫向 | 可逐幀上移內容 |
| 紙錢 | 4 | 12×12 | 橫向 | 2 色面切換模擬翻轉 |
| 燭火／燈 | 2 | 8×8 | 橫向 | 明暗 |
| 海浪線 | 2 | 128×16 | 各幀整條 | 相位差 |
| 鬼火 | 2 | 8×8 | 橫向 | 藍綠 |

檔名：`*-4f.png` → 總寬 = 幀寬 × 幀數。

---

## 9. 交件優先級

### P0 — 管線驗證

1. `tiles/shared/road-body.png`（**×48 高**）+ `road-dash.png`  
2. `mid/redlady/columbarium-strip.png`  
3. `props/redlady/tomb-stele-a.png` + `mound-a.png`  
4. `props/shiba/lamp.png`  

### P1 — 12 主題「能辨識」最低集

每主題：1× mid strip + ≥3 props + 路肩／路面變體（若需要）

### P2 — 氛圍與動畫

FX 2～4 幀、mid A/B 變體、shared props 齊

### P3 — 打磨

墓地全變體、騎樓／醫院第二版、比例與色盤統一 pass

---

## 10. 主題氛圍一句話（給繪師／AI）

| ID | 一句話 |
|----|--------|
| shiba | 安靜省道夜騎，路燈與電線杆節奏 |
| bear | 濕冷林道，樹幹與螢火蟲 |
| godzilla | 霓虹摩天樓峽谷，窗燈如星 |
| redlady | 台灣墓園夜：碑、丘、納骨塔、紙錢 |
| jiangshi | 廢村三合院，符與燭 |
| alien | 整齊田壟裡的不對勁 |
| dumptruck | 山路工地，塵土與護欄 |
| foodpanda | 騎樓夜街的招牌與機車 |
| grandma | 鐵窗巷弄的生活痕跡 |
| ambulance | 急診燈火的醫院外牆 |
| firetruck | 焦味未散的火場邊緣 |
| bikini | 月下海岸線公路 |

---

## 11. AI 提示詞範本（英文可直接貼）

**中景無縫條：**

```
Seamless horizontal pixel art tileset strip, 256x96, side-view,
16-bit-detailed NES-hard edges, limited 24-color palette, no anti-aliasing,
night time, [THEME DESCRIPTION], readable architecture not flat silhouette,
midground band, can tile left-right seamlessly, transparent or solid sky-separated
```

**靈骨塔：**

```
Pixel art side-view Taiwanese columbarium, 3 floor levels, rows of niche windows,
entrance door, stone gray 3-value shading, hard pixel edges, readable building,
48x64 or strip 256x96, not a black silhouette, transparent background
```

**墓碑：**

```
Pixel art tombstone stele game prop, 24x40, stone 3-value shading,
vertical inscription lines, wider base plinth, moss hint, hard edge,
transparent background, side-view readable
```

---

## 12. 與角色規格的關係

| 項目 | 角色規格 | 本文件 |
|------|----------|--------|
| 騎士／追逐者 48 格 sheet | `retro-asset-spec.md` | — |
| 路面 48 高／mid／props | 概要 | **本文件為準** |
| 色盤 | 總盤 | 總盤 + 主題強調 |
| 目錄 | `assets/retro/...` | `tiles/` `mid/` `props/` `fx/` |

角色 48×48；**場景 props 不必強行 48 對齊**，以可讀與路肩比例為準。

---

## 13. 最終驗收（場景）

- [ ] 路面 **高度 48px**、水平無縫、分道線節奏穩定  
- [ ] 每主題中景靜止截圖可命名「建築／植被類型」  
- [ ] 墓地：碑、丘、塔三者同時可辨  
- [ ] 無大面積純黑剪影塊  
- [ ] 動畫幀對齊、無跳動  
- [ ] 檔名與 themeId、本文件路徑一致  
- [ ] PNG-32 透明；nearest ×4 無彩邊  
- [ ] 每主題色數控制在 16～32  

---

## 14. 輸出內容對照（你要求的 6 點）

| # | 要求 | 本文章節 |
|---|------|----------|
| 1 | 各主題場景物件清單 | **§6**（§5 墓地加深） |
| 2 | 圖層結構 | **§0.2、§1.1** + 視差 **§0.3** |
| 3 | 可重複圖塊尺寸與無縫注意 | **§1.2～1.3、§2** |
| 4 | 墓地特別細節 | **§5** |
| 5 | 命名與資料夾 | **§3** |
| 6 | 色盤建議 | **§4** |

---

**文件結束（v2）。** 以墓地 §5 為品質標竿，其餘主題對齊同一「精緻 16-bit、可辨識、可無縫捲動」標準。
