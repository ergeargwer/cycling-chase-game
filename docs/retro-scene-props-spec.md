# 復古（Retro）場景物件與背景系統 — 設計規格

**專案：** 智慧騎行 · 追逐模式（cycling-chase-game）  
**配套文件：** [角色／通用素材規格](./retro-asset-spec.md)  
**風格錨點：** FC《坦克大戰》硬邊、有限色、清晰輪廓，但場景**必須可辨識內容**，禁止只剩抽象色塊剪影  

> 本文只定義視覺、圖層、無縫圖塊、主題物件與交件標準，**不涉及程式實作**。

---

## 0. 設計總則

### 0.1 構圖（全主題共用，不可改）

```
螢幕 ──────────────────────────────► 右
│
│  L0  天空 / 遠景（最慢視差）
│  L1  遠中景剪影帶（慢）
│  L2  中景主題建築／植被（中）
│  L3  路肩近景 props（快，接近 1:1 路面）
│  L4  路面 tile + 分道線（基準捲動 = 1.0）
│  L5  角色層（騎士右 ~78%、追逐者左）
│  L6  前景遮罩／粒子（可選，略快於路面）
│  L7  HUD（固定不捲）
```

- 騎士永遠在**右側**；追逐者在**左側**；道路**水平**無限捲動。  
- 場景物件以「側視、站在路肩或嵌在中景帶」為主，避免斜 3/4 透視。  
- **可辨識優先於寫實**：墓碑要看得出碑形與紋樣；騎樓要看得出柱與店招。

### 0.2 精緻 8-bit 的「可讀性」標準

| 層級 | 最低可讀要求（×4 nearest 後） |
|------|-------------------------------|
| 遠景 | 能分辨「山／樓／海平線」輪廓類型 |
| 中景 | 能說出「這是什麼建築／樹／塔」 |
| 近景 props | 能說出物件名稱（墓碑、消防栓、機車…） |
| 路面 | 看得出瀝青紋理 + 分道線節奏 |

**禁止：** 整片純黑剪影、無內部分割的色塊、過度抖動的噪點糊邊。  
**允許：** 1px 描邊、2～3 階內陰影、窗戶／門／文字用 1～2 px 細節。

### 0.3 捲軸與無縫原則（所有 tile）

1. **左右邊緣像素必須可對接**（seamless horizontal）。  
2. 垂直方向通常**不需**無縫（地面有明確上下界）。  
3. 重複週期內避免「單一超大獨特標記」出現超過 1 次，否則捲動時會穿幫。  
4. 可用「主 tile + 變體 tile」交錯（A-B-A-C）降低重複感。  
5. 動畫圖塊（火、煙、紙錢）幀與幀之間**外接矩形一致**，避免跳動。

### 0.4 建議視差速度比（給實作／動效對照）

| 圖層 | 相對路面速度 | 說明 |
|------|--------------|------|
| L0 天空／星 | 0.05～0.10 | 幾乎靜止，或極慢 |
| L1 遠山／遠樓 | 0.15～0.25 | 遠景 |
| L2 中景主題 | 0.40～0.55 | 墓地塔、騎樓、樹林 |
| L3 路肩 props | 0.85～0.95 | 路燈、墓碑、機車 |
| L4 路面 | **1.00** | 基準 |
| L6 前景粒子 | 1.05～1.20 | 紙錢、落葉、火花 |

---

## 1. 圖層結構與通用 tile

### 1.1 圖層職責

| ID | 名稱 | 內容類型 | 典型高度（源像素） |
|----|------|----------|-------------------|
| L0 | Sky | 夜空漸層條、星點、月亮、遠霞 | 全高或上 60% 條帶 |
| L1 | Far | 遠山、遠海線、遠城天際線 | 24～48 px 高，可平鋪寬 |
| L2 | Mid | 主題建築帶、樹帶、塔帶 | 48～96 px 高，**128～256 px 寬**循環段 |
| L3 | Roadside | 可擺放的獨立 props | 16～64 px 高，寬度依物件 |
| L4 | Road | 路面、路肩、分道線 | 路面帶 **32 或 48 px** 高 |
| L5 | Actors | 角色（另見角色規格） | 48 格 |
| L6 | FX | 煙、火、紙錢、霧條 | 8～32 px |
| L7 | HUD | UI | 固定 |

### 1.2 通用路面（全主題基底）

| 檔名建議 | 尺寸 | 說明 |
|----------|------|------|
| `tiles/shared/road-body.png` | **64×32** 或 **96×48** | 瀝青主面，水平無縫；含細石點 2～3 色 |
| `tiles/shared/road-edge-top.png` | 64×8 | 路緣亮線／路肩銜接 |
| `tiles/shared/road-edge-bot.png` | 64×8 | 下緣暗邊 |
| `tiles/shared/road-dash.png` | **24×4** 或 32×4 | 中央虛線一節（黃或米白） |
| `tiles/shared/shoulder.png` | 64×16 | 路肩泥／草／磚（可被主題換色） |
| `tiles/shared/sky-night.png` | 128×96 或 256×128 | 可水平平鋪的夜空（星稀疏） |
| `tiles/shared/moon.png` | 16×16 或 24×24 | 單月，非整塊 tile |

**路面無縫注意：**

- 左右 1～2 欄像素做「過渡帶」，不要在邊緣放完整石塊。  
- 分道線長度：亮段 16～20 px、空段 12～16 px，節奏穩定。  
- 主題可 **tint 或換 shoulder 貼圖**，不要為每主題重畫整條瀝青（除非特殊：沙地、泥路、水泥板）。

### 1.3 中景「循環區段」規格

| 類型 | 建議尺寸 | 用途 |
|------|----------|------|
| 窄循環 | **128×64** | 樹帶、圍牆、欄杆 |
| 標準循環 | **192×80** 或 **256×96** | 騎樓、醫院、墓地塔群 |
| 遠景條 | **256×32**～**48** | 山脈、海平線、遠城 |

每個中景循環段應包含 **2～4 個可辨識物件**，而非單一重複圖騰。

---

## 2. 資料夾與命名

```
assets/retro/
├── tiles/
│   ├── shared/                 # 全主題共用
│   │   ├── road-body.png
│   │   ├── road-dash.png
│   │   ├── road-edge-top.png
│   │   ├── road-edge-bot.png
│   │   ├── shoulder.png
│   │   ├── sky-night.png
│   │   └── moon.png
│   ├── shiba/
│   ├── bear/
│   ├── godzilla/
│   ├── redlady/                # 墓地（重點）
│   ├── jiangshi/
│   ├── alien/
│   ├── dumptruck/
│   ├── foodpanda/
│   ├── grandma/
│   ├── ambulance/
│   ├── firetruck/
│   └── bikini/
├── props/
│   ├── shared/                 # 跨主題可重用
│   └── <themeId>/              # 主題專屬
├── mid/                        # 中景無縫長條（可選與 tiles 合併）
│   └── <themeId>/
└── fx/
    └── <themeId>/ 或 shared/
```

### 命名規則

```
<layer>-<subject>[-variant][-animN].png

範例：
props/redlady/tomb-round-a.png
props/redlady/tomb-stele-b.png
props/redlady/mound-a.png
mid/redlady/columbarium-strip.png     # 靈骨塔中景循環
tiles/redlady/shoulder-dirt.png
fx/redlady/joss-paper-4f.png          # 4 幀動畫，後綴 -4f
fx/firetruck/flame-4f.png
```

- 全小寫、`kebab-case`  
- `themeId` 與遊戲一致：`shiba` `bear` `godzilla` `redlady` `jiangshi` `alien` `dumptruck` `foodpanda` `grandma` `ambulance` `firetruck` `bikini`  
- 動畫：`-2f` `-4f`，幀橫向排列  
- 變體：`-a` `-b` `-c`（避免隨機數字難讀）

---

## 3. 色盤建議

### 3.1 全域夜騎基底（16 色核）

| Hex | 用途 |
|-----|------|
| `#0a0c14` | 最深夜空 |
| `#141828` | 天空次深、遠影 |
| `#1e2438` | 中景暗部 |
| `#2a3348` | 路面暗瀝青 |
| `#3d465c` | 路面亮階 |
| `#5c6578` | 石、混凝土 |
| `#8b92a4` | 亮石、字、欄杆 |
| `#c5cad4` | 高光灰白 |
| `#e8ecf4` | 月、燈心白 |
| `#3cbcfc` | 夜青強調 |
| `#f8b800` | 路燈金、警示 |
| `#e45c10` | 暖橙、火、紙錢 |
| `#ad1d3a` | 警戒紅 |
| `#4a7c23` | 植披暗綠 |
| `#5c3a21` | 土、木 |
| `#fce4a8` | 紙、淺膚、燈暈 |

### 3.2 各主題強調色（在基底上 +4～8 色）

| themeId | 強調色方向 |
|---------|------------|
| shiba | 路燈金、遠山藍紫 |
| bear | 霧青灰、螢火蟲黃綠 |
| godzilla | 霓虹粉紫、窗黃 |
| **redlady** | **墓石青灰、紙錢淺黃、香火橘、青苔綠** |
| jiangshi | 符紙黃、陰綠、 deriv 藍霧 |
| alien | 異常綠、麥田圈淺線、UFO 青 |
| dumptruck | 工程橘、泥黃、護欄紅白 |
| foodpanda | 店招粉紅／青、騎樓暖燈 |
| grandma | 鐵門綠、磚紅、燈光暖黃 |
| ambulance | 醫院白／十字紅、急診藍 |
| firetruck | 焰橙紅、煙灰、焦黑 |
| bikini | 海水深藍、浪白、沙米 |

**單張 props 建議 ≤ 12 色（含透明）。**

---

## 4. 墓地主題（redlady）— 特別詳細規格

> 目標：玩家 **0.5 秒內** 讀出「台灣風夜間墓地」，不是黑色三角山。

### 4.1 圖層配置（墓地）

| 圖層 | 內容 |
|------|------|
| L0 | 深紫夜空、淡月、稀星 |
| L1 | 遠方山影 + 稀疏墓群小點（低對比） |
| L2 | **靈骨塔／納骨堂長條** + 圍牆循環 |
| L3 | **墓碑、土丘、香爐、石燈、枯樹、鐵欄** 點綴於路肩 |
| L4 | 偏灰的路面；路肩改泥土／碎石 |
| L6 | 紙錢飄、鬼火點（2～4 幀） |

### 4.2 必備物件清單（可辨識）

#### A. 墓碑（至少 4 變體）

| 檔名 | 建議尺寸 | 必須看得到的細節 |
|------|----------|------------------|
| `props/redlady/tomb-stele-a.png` | 24×40 | 長方形碑、頂冠或斜頂、**中央直書紋樣**（可用 2～3 條垂直像素當「字」）、底座兩層 |
| `props/redlady/tomb-stele-b.png` | 20×36 | 較瘦碑、兩側紋、底座 |
| `props/redlady/tomb-round-a.png` | 28×32 | **圓頂／拱頂**碑，碑身有框線 |
| `props/redlady/tomb-double.png` | 40×36 | 雙連碑或家族墓寬碑，中有分線 |
| `props/redlady/tomb-broken.png` | 24×28 | 缺角／裂紋（增加敘事，可少用） |

**墓碑繪製要點：**

- 石材至少 **3 階**（暗、中、亮），不是單色灰。  
- 「文字」不需可讀漢字，但需有**直書欄**或橫額像素區。  
- 底座要比碑身寬 2～4 px，產生重量感。  
- 可加 1 px 青苔（`#4a7c23` 暗）在底部。  
- 禁止：純黑三角形、無底座浮空碑。

#### B. 土丘／墳堆（至少 3 變體）

| 檔名 | 建議尺寸 | 細節 |
|------|----------|------|
| `props/redlady/mound-a.png` | 40×20 | 半橢圓土堆，頂部可插 **小碑或香** |
| `props/redlady/mound-b.png` | 48×22 | 較寬墳，層次土色 3 階，可有小石 |
| `props/redlady/mound-c.png` | 32×18 | 矮丘 + 紙錢散落點 |

**土丘要點：** 亮邊在「月光側」（建議畫面上方／略左上），陰影在右下；輪廓圓潤但邊緣硬像素。

#### C. 靈骨塔／納骨塔（中景主角）

| 檔名 | 建議尺寸 | 細節 |
|------|----------|------|
| `mid/redlady/columbarium-strip.png` | **256×96** 無縫 | 見下節 |
| `props/redlady/columbarium-unit.png` | 48×64 | 單段塔樓，可拼 |

**靈骨塔必須具備：**

1. **垂直分層**（至少 3 層窗戶或格位橫列）  
2. 每層有 **重複的小格／門洞**（納骨感），用 2×3 或 3×4 px 窗格即可  
3. **屋頂**可辨：平頂女兒牆，或傳統翹角簡化（2～3 階像素）  
4. 入口：**一扇較大的門**（深色洞 + 亮門框）  
5. 可選：塔側階梯、頂部小亭、霓虹／長明燈一點橘黃  
6. 牆色：青灰石 `#5c6578`～`#8b92a4`，窗洞 `#0a0c14`，燈 `#f8b800` / `#e45c10`

**中景無縫段 `columbarium-strip` 內容建議（左→右 256px 內）：**

```
[圍牆+門柱] — [主塔樓 3 層] — [矮連廊] — [側塔] — [鐵門缺口] — 接回圍牆
```

左右邊緣應落在「圍牆重複單元」上，方便 seamless。

#### D. 其他墓地道具（強烈建議）

| 檔名 | 尺寸 | 可辨識特徵 |
|------|------|------------|
| `props/redlady/censer.png` | 16×16 | 香爐三足或圓爐，**上升 1～2 px 煙**（可靜態） |
| `props/redlady/joss-stick.png` | 8×16 | 三炷香，頂端橘點 |
| `props/redlady/stone-lantern.png` | 16×28 | 石燈籠，燈窗亮 |
| `props/redlady/iron-fence.png` | 32×24 | 鐵柵段，可平鋪；尖頂 |
| `props/redlady/gate-pillar.png` | 16×40 | 墓園門柱、頂有飾 |
| `props/redlady/dead-tree.png` | 32×48 | 枯枝剪影但有分叉層次（≥3 主枝） |
| `props/redlady/path-stone.png` | 24×8 | 石徑一小段 |
| `fx/redlady/joss-paper-4f.png` | 4×(12×12) | 金紙／銀紙飄 4 幀 |
| `fx/redlady/will-o-wisp-2f.png` | 2×(8×8) | 青藍鬼火閃爍 |

### 4.3 墓地路肩擺放節奏（設計參考，非程式）

每 200～300 邏輯像素建議出現一組「可讀組合」，例如：

1. 雙碑 + 土丘 + 香爐  
2. 鐵欄一段 + 枯樹  
3. 中景塔 coinciding 時，近景少放高大 props，避免重疊糊成一團  
4. 紙錢粒子在中空路段較密  

### 4.4 墓地禁用與慎用

- ❌ 歐式十字架成排（可 0～1 個點綴，主體應為華人墓制）  
- ❌ 只有黑三角山  
- ❌ 血泊大量噴濺（保持陰森而非 gore）  
- ✅ 紙錢、香、塔、碑、土丘、鐵欄、長明燈  

---

## 5. 各主題場景物件清單

以下每個主題包含：**中景循環**、**近景 props**、**可選 FX**、**路面變體**。  
尺寸為源像素建議值。

---

### 5.1 柴犬公路 · `shiba`

**氣氛：** 夜間郊區／省道，乾淨、略空曠。

| 類型 | 檔名 | 尺寸 | 可辨識細節 |
|------|------|------|------------|
| 中景 | `mid/shiba/hills-strip.png` | 256×40 | 遠山層次 2～3 階，非單色 |
| 中景 | `mid/shiba/powerline-strip.png` | 192×48 | 電線杆節奏 + 水平電線 1px |
| Props | `props/shiba/lamp.png` | 16×48 | 彎臂路燈、燈罩亮 |
| Props | `props/shiba/utility-pole.png` | 12×56 | 電線杆、橫擔、絕緣子小點 |
| Props | `props/shiba/reflector.png` | 12×16 | 反光導標，紅白或黃 |
| Props | `props/shiba/sign-curve.png` | 20×24 | 彎道／速限牌簡化 |
| Props | `props/shiba/grass-tuft.png` | 16×12 | 路邊雜草叢 |
| Props | `props/shiba/mile-stone.png` | 12×16 | 里程碑 |
| 路肩 | `tiles/shiba/shoulder.png` | 64×16 | 泥草混合 |
| FX | `fx/shared/moth-2f.png` | 可選 | 燈下小蟲 |

---

### 5.2 黑熊森林 · `bear`

**氣氛：** 密林夜路、濕、有霧。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/bear/pine-strip.png` | 256×80 | 針葉／闊葉混合，樹幹可辨 |
| 中景 | `mid/bear/fog-band.png` | 128×24 | 半透明霧條（2 階 alpha 色） |
| Props | `props/bear/tree-a.png` | 32×56 | 近樹，樹皮紋 2 色 |
| Props | `props/bear/tree-b.png` | 28×48 | 變體 |
| Props | `props/bear/stump.png` | 20×16 | 樹樁年輪簡化 |
| Props | `props/bear/mushroom.png` | 12×12 | 傘狀蘑菇 |
| Props | `props/bear/rock-a.png` | 20×12 | 苔石 |
| Props | `props/bear/log.png` | 28×12 | 橫倒木 |
| Props | `props/bear/fern.png` | 16×16 | 蕨類 |
| FX | `fx/bear/firefly-2f.png` | 2×(4×4) | 螢火蟲 |
| FX | `fx/bear/leaf-4f.png` | 落葉 | 4 幀 |

---

### 5.3 哥吉拉都市 · `godzilla`

**氣氛：** 夜間摩天樓、霓虹、災後感可淡。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/godzilla/skyline-strip.png` | 256×96 | 高低錯落樓，**窗網格**必須可讀 |
| 中景 | `mid/godzilla/neon-strip.png` | 192×32 | 霓虹條、看板色塊 |
| Props | `props/godzilla/building-a.png` | 40×72 | 單樓，窗 2×2 陣列 |
| Props | `props/godzilla/sign-shop.png` | 24×16 | 直式／橫式招牌 |
| Props | `props/godzilla/street-lamp.png` | 16×40 | 市電路燈 |
| Props | `props/godzilla/wreck-car.png` | 32×16 | 車輛殘骸側視 |
| Props | `props/godzilla/hydrant.png` | 12×16 | 消防栓（亦可給 firetruck 共用） |
| Props | `props/godzilla/rubble.png` | 24×12 | 碎石堆 |
| FX | `fx/godzilla/window-blink-2f.png` | 可選 | 窗燈光閃 |

**窗燈光：** 黃 `#fce4a8` 隨機點亮 30～50% 格子，避免整面同一亮度。

---

### 5.4 紅衣墓地 · `redlady`

見 **§4**（完整規格）。摘要必交檔：

- 墓碑 ≥4、土丘 ≥3、靈骨塔中景 strip、香爐、石燈、鐵欄、枯樹、紙錢 FX  

---

### 5.5 跳殭屍聚落 · `jiangshi`

**氣氛：** 廢棄鄉下、三合院感、陰。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/jiangshi/village-strip.png` | 256×80 | 廢屋屋頂線、門洞、牆裂 |
| Props | `props/jiangshi/house-ruin.png` | 48×40 | 破窗、塌角 |
| Props | `props/jiangshi/wall-broken.png` | 32×24 | 土角牆／磚牆缺口 |
| Props | `props/jiangshi/gate-old.png` | 24×32 | 舊門樓 |
| Props | `props/jiangshi/joss-paper-pile.png` | 16×12 | 紙錢堆 |
| Props | `props/jiangshi/candle.png` | 8×12 | 香燭，焰 1 px |
| Props | `props/jiangshi/talisman.png` | 8×12 | 符紙（掛樹上／牆上） |
| Props | `props/jiangshi/well.png` | 20×16 | 古井（可選） |
| FX | `fx/jiangshi/candle-flicker-2f.png` | 2 幀 | 燭火 |
| FX | `fx/jiangshi/joss-paper-4f.png` | 可與墓地共用 | 紙錢 |

---

### 5.6 外星人田野 · `alien`

**氣氛：** 夜間田野、不對勁的整齊感。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/alien/field-strip.png` | 256×48 | 稻／麥行列，可無縫 |
| 中景 | `mid/alien/crop-circle-hint.png` | 64×32 | 局部麥田圈弧（少用） |
| Props | `props/alien/scarecrow.png` | 24×40 | 稻草人，十字架身+頭 |
| Props | `props/alien/crop-a.png` | 16×24 | 作物叢 |
| Props | `props/alien/ufo-wreck.png` | 40×20 | 飛碟殘骸、破圓盤 |
| Props | `props/alien/weird-plant.png` | 16×24 | 球莖／觸手植物 |
| Props | `props/alien/fence-wood.png` | 32×16 | 木柵 |
| Props | `props/alien/light-pole.png` | 12×36 | 怪異探照燈 |
| FX | `fx/alien/ufo-glow-2f.png` | 2 幀 | 青光脈動 |
| 路面 | `tiles/alien/shoulder-soil.png` | 64×16 | 田埂土 |

---

### 5.7 砂石車山路 · `dumptruck`

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
| FX | `fx/dumptruck/dust-4f.png` | 4 幀 | 揚塵 |
| 路面 | `tiles/dumptruck/road-dirt.png` | 64×32 | 泥石路面變體 |

---

### 5.8 外送市區 · `foodpanda`

**氣氛：** 台灣騎樓夜街、招牌、機車。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/foodpanda/arcade-strip.png` | **256×96** | **騎樓柱列+店鋪**，柱距規律無縫 |
| Props | `props/foodpanda/shop-a.png` | 40×40 | 店面、捲門紋 |
| Props | `props/foodpanda/sign-vert.png` | 12×28 | 直式招牌，色塊字 |
| Props | `props/foodpanda/sign-horiz.png` | 28×12 | 橫招 |
| Props | `props/foodpanda/scooter.png` | 28×20 | 停放機車側視 |
| Props | `props/foodpanda/scooter-b.png` | 28×20 | 變體 |
| Props | `props/foodpanda/plant-pot.png` | 12×16 | 騎樓盆栽 |
| Props | `props/foodpanda/traffic-light.png` | 12×24 | 號誌 |
| Props | `props/foodpanda/hydrant.png` | 可共用 | |
| FX | `fx/foodpanda/neon-flicker-2f.png` | 2 幀 | 招牌閃 |

**騎樓 strip 必備：** 柱、骑楼天花板線、店門、至少一種招牌、地面騎樓陰影帶。

---

### 5.9 巷弄阿嬤 · `grandma`

**氣氛：** 老巷、鐵窗、生活感。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/grandma/alley-strip.png` | 256×80 | 舊公寓、鐵窗格 |
| Props | `props/grandma/iron-door.png` | 24×40 | 鐵門、門花紋 |
| Props | `props/grandma/window-cage.png` | 20×20 | 鐵窗 |
| Props | `props/grandma/clothes-rack.png` | 28×24 | 晾衣架+衣物色塊 |
| Props | `props/grandma/pot-plant.png` | 12×16 | 盆栽 |
| Props | `props/grandma/scooter-old.png` | 28×18 | 老機車 |
| Props | `props/grandma/mailbox.png` | 12×12 | 信箱 |
| Props | `props/grandma/bai-bai-table.png` | 20×16 | 可選：門口小桌 |
| Props | `props/grandma/brick-wall.png` | 32×24 | 紅磚牆段 |

---

### 5.10 救護車 · `ambulance`

**氣氛：** 醫院外、急診動線。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/ambulance/hospital-strip.png` | 256×96 | 醫院外牆、帶狀窗、**十字或紅字標** |
| Props | `props/ambulance/er-sign.png` | 28×16 | 急救／ER 標 |
| Props | `props/ambulance/cross-sign.png` | 16×16 | 醫療十字 |
| Props | `props/ambulance/barrier-red.png` | 24×16 | 路障 |
| Props | `props/ambulance/stretcher.png` | 24×12 | 可選推床（靜置） |
| Props | `props/ambulance/entrance.png` | 32×40 | 急診雨棚入口 |
| Props | `props/ambulance/lamp-blue.png` | 12×20 | 藍燈警示柱 |
| FX | `fx/ambulance/beacon-2f.png` | 2 幀 | 紅藍閃燈點 |

---

### 5.11 消防車 · `firetruck`

**氣氛：** 火災現場餘韻、熱、煙。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/firetruck/burnt-street-strip.png` | 256×64 | 焦黑建築輪廓、破窗 |
| Props | `props/firetruck/hydrant.png` | 12×16 | 消防栓（亮紅） |
| Props | `props/firetruck/scorch.png` | 32×12 | 地面燒痕 |
| Props | `props/firetruck/debris.png` | 24×12 | 殘骸 |
| Props | `props/firetruck/hose.png` | 28×10 | 水帶盤 |
| Props | `props/firetruck/cone.png` | 12×16 | 錐 |
| FX | `fx/firetruck/flame-4f.png` | 4×(16×20) | 小火 4 幀 |
| FX | `fx/firetruck/smoke-4f.png` | 4×(24×24) | 濃煙 |
| FX | `fx/firetruck/ember-2f.png` | 2 幀 | 火花 |

**火焰：** 每幀輪廓硬邊，色階 暗紅→橘→黃→白芯（3～4 色）。

---

### 5.12 海邊騎行 · `bikini`

**氣氛：** 夜間海岸／河岸公路。

| 類型 | 檔名 | 尺寸 | 細節 |
|------|------|------|------|
| 中景 | `mid/bikini/sea-strip.png` | 256×40 | 海平線+深淺海兩帶 |
| 中景 | `mid/bikini/wave-strip-2f.png` | 128×16×2 幀 | 近海浪線輕動畫 |
| Props | `props/bikini/lighthouse.png` | 20×48 | 燈塔層層收分、頂燈 |
| Props | `props/bikini/rock.png` | 24×16 | 礁石 |
| Props | `props/bikini/rock-b.png` | 20×12 | 變體 |
| Props | `props/bikini/umbrella.png` | 20×20 | 遮陽傘（收或開） |
| Props | `props/bikini/beach-chair.png` | 16×12 | 可選 |
| Props | `props/bikini/rail.png` | 32×12 | 河岸護欄段 |
| Props | `props/bikini/lifebuoy.png` | 12×12 | 救生圈 |
| 路肩 | `tiles/bikini/shoulder-sand.png` | 64×16 | 沙 |
| FX | `fx/bikini/sparkle-2f.png` | 浪光 | 可選 |

---

## 6. 可重複圖塊 — 尺寸總表與無縫檢查

### 6.1 尺寸總表

| 資產類 | 寬 | 高 | 無縫方向 |
|--------|----|----|----------|
| 路面 body | 64 / 96 | 32 / 48 | 水平 |
| 分道線 | 24～32 | 4 | 水平（節奏型） |
| 路肩 | 64 | 12～16 | 水平 |
| 遠景條 | 256 | 32～48 | 水平 |
| 中景條 | 128～256 | 64～96 | 水平 |
| 欄杆／護欄段 | 32 | 12～24 | 水平 |
| 騎樓柱距單元 | 32～48 | 全高於 strip 內 | 含於 strip |

### 6.2 無縫檢查清單（繪師自測）

1. 將圖在影像軟體中 **水平複製兩次** 並排，接縫無斷線、無亮度跳變。  
2. 重要垂直線（柱、窗格）不要壓在左右最外 1px。  
3. 隨機細節（石頭、窗戶亮燈）在接縫兩側密度相近。  
4. 動畫 strip：每幀單獨通過 1～3。  
5. 放大 400% nearest 檢查是否有半透明抗鋸齒紫邊。

### 6.3 降低重複感的設計技巧

- 同一主題準備 **A/B 兩條 mid strip**，節奏交錯。  
- Props 變體 2～3 個輪換。  
- 遠景用低對比，中景才放「記憶點」建築（如靈骨塔、燈塔、醫院十字）。

---

## 7. 簡單動畫物件規格

| 類型 | 幀數 | 格大小 | 排列 | 備註 |
|------|------|--------|------|------|
| 火焰 | 4 | 16×20 | 橫向 | 中心大致對齊 |
| 煙 | 4 | 24×24 | 橫向 | 向上飄可每幀 Y 內容上移 |
| 紙錢 | 4 | 12×12 | 橫向 | 旋轉感用 2 色面切換 |
| 燭火／燈 | 2 | 8×8 | 橫向 | 明暗 |
| 海浪線 | 2 | 128×16 | 各幀整條 | 相位差 |
| 鬼火 | 2 | 8×8 | 橫向 | 藍綠 |

檔名：`*-4f.png` 表示 4 幀橫拼；總寬 = 幀寬 × 幀數。

---

## 8. 跨主題共用 props（`props/shared/`）

可減少重複繪製：

| 檔名 | 用途主題 |
|------|----------|
| `lamp-street.png` | shiba, godzilla, foodpanda |
| `cone.png` | dumptruck, firetruck, ambulance |
| `hydrant.png` | godzilla, foodpanda, firetruck |
| `guardrail.png` | dumptruck, bikini（調色） |
| `moon.png` | 幾乎全部 |

共用檔畫好後，主題可 **整體染色** 或覆蓋 1～2 色強調。

---

## 9. 交件優先級（場景向）

### P0 — 管線驗證

1. `tiles/shared/road-body.png` + `road-dash.png`  
2. `mid/redlady/columbarium-strip.png`  
3. `props/redlady/tomb-stele-a.png` + `mound-a.png`  
4. 任一公路 `props/shiba/lamp.png`  

### P1 — 12 主題「能辨識」最低集

每主題至少：

- 1× mid strip（192～256 寬）  
- 3× 可辨識 props  
- 1× 路肩或路面變體（若與 shared 不同）  

### P2 — 氛圍與動畫

- 各主題 FX 2～4 幀  
- mid A/B 變體  
- 共用 props 補齊  

### P3 — 打磨

- 墓碑全變體、靈骨塔 unit 拼裝  
- 騎樓／醫院等高細節 strip 第二版  

---

## 10. 主題氛圍一句話（給 AI／繪師對焦）

| ID | 一句話 |
|----|--------|
| shiba | 安靜省道夜騎，路燈與電線杆節奏 |
| bear | 濕冷林道，樹幹與螢火蟲 |
| godzilla | 霓虹摩天樓峽谷，窗燈如星 |
| redlady | 台灣墓園夜，碑、丘、納骨塔、紙錢 |
| jiangshi | 廢村三合院，符與燭 |
| alien | 整齊田壟裡的不對勁 |
| dumptruck | 山路工地，塵土與護欄 |
| foodpanda | 騎樓夜市氣味的街 |
| grandma | 鐵窗巷弄的生活痕跡 |
| ambulance | 急診燈火的醫院外牆 |
| firetruck | 焦味未散的火場邊緣 |
| bikini | 月下海岸線公路 |

---

## 11. AI 提示詞範本（場景／tile）

**中景無縫條：**

```
Seamless horizontal pixel art tileset strip, 256x96, side-view,
Battle City / NES hard-edged pixels, no anti-aliasing, limited palette,
night time, [THEME DESCRIPTION], readable details not flat silhouette,
transparent or solid sky-separated midground band, game background,
clean 1px outlines, can tile left-right seamlessly
```

**墓地靈骨塔：**

```
Pixel art side-view Taiwanese columbarium building, 3 floor levels,
rows of small niche windows, entrance door, stone gray palette,
hard pixels NES style, readable architecture, 48x64 sprite,
transparent background, not a black silhouette
```

**墓碑：**

```
Pixel art tombstone stele, side-view game prop, 24x40, stone 3-value shading,
vertical inscription lines, base plinth wider than body, moss hint,
hard edge 8-bit, transparent background
```

---

## 12. 與角色規格的關係

| 項目 | 角色文件 | 本文件 |
|------|----------|--------|
| 騎士／追逐者 sheet | `docs/retro-asset-spec.md` | — |
| 路面／中景／props | 概要 | **本文件為準** |
| 色盤 | 24 色總盤 | 總盤 + 主題強調 |
| 目錄 | `assets/retro/...` | 細分 `tiles/` `mid/` `props/` `fx/` |

角色仍為 48×48 格；**場景 props 可小於角色**（路燈細長、墓碑約半身高等），以人眼比例可讀為準，不必強行 48 對齊。

---

## 13. 最終驗收（場景）

- [ ] 路面水平無縫，分道線節奏穩定  
- [ ] 每主題中景在靜止截圖中可命名「建築／植被類型」  
- [ ] 墓地：碑、丘、塔三者同時可辨  
- [ ] 無大面積純黑剪影塊  
- [ ] 動畫幀對齊、無跳動  
- [ ] 檔名與 `themeId`、本文件路徑一致  
- [ ] PNG-32 透明，nearest ×4 無彩邊  

---

**文件結束。** 繪製時以 §4 墓地為品質標竿，其餘主題對齊同一「可辨識精緻 8-bit」標準。
