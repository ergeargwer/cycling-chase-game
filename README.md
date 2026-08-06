# 智慧騎行 · 追逐模式

以遊戲化方式進行室內騎行功率訓練。維持目標功率，甩開後方追逐者；功率不足時距離縮短，緊張感隨之升高。訓練路線含**平路／上坡／下坡**起伏，並支援**多種追逐者主題**與對應場景。

**平台：** Electron 桌面應用（Raspberry Pi 5 ARM64 / Windows x64）  
**版本：** 1.2.0

---

## 遊戲畫面

### 主選單

星空與遠山背景，可直接以模擬模式開始，或先連接 BLE 騎行台。

![主選單](docs/screenshots/01-menu.png)

### 訓練計畫選擇

內建六套分段功率計畫；上方可切換**追逐者主題**（柴犬公路／黑熊森林／哥吉拉都市／紅衣墓地）。

![選擇訓練計畫](docs/screenshots/02-plan.png)

### 主題 · 柴犬公路（shiba）

夜間公路、月亮、遠山與路燈；柴犬追逐。右上角**路線剖面**以紅點標示進度與坡度。

![柴犬公路](docs/screenshots/03-chase-shiba.png)

### 主題 · 黑熊森林（bear）

夜間森林、樹剪影、霧氣與螢火蟲（追逐者目前為 placeholder 著色示意）。

![黑熊森林](docs/screenshots/05-chase-bear.png)

### 主題 · 哥吉拉都市（godzilla）

黑夜高樓、窗燈、霓虹與粉紫路燈。

![哥吉拉都市](docs/screenshots/06-chase-godzilla.png)

### 主題 · 紅衣墓地（redlady）

台灣風格夜間墓地：墓碑、金紙、香燭、鬼火與薄霧（陰森但不血腥）。

![紅衣墓地](docs/screenshots/07-chase-redlady.png)

### 追逐場景 · 下坡

同一路線不同進度：剖面圖進入下坡區段。

![追逐場景（下坡）](docs/screenshots/04-chase-descent.png)

### 角色素材

| 騎士（正常／緊張） | 柴犬（奔跑／吠叫） |
|:---:|:---:|
| ![騎士](docs/screenshots/character-rider.png) | ![柴犬](docs/screenshots/character-dog.png) |

完整 sprite sheet 見 `assets/rider.png`、`assets/dog.png`。  
`bear`／`godzilla`／`redlady` 正式素材就緒後，在 `src/renderer/game/themes.ts` 改 `spriteSrc` 即可。

---

## 遊戲玩法

1. 在主選單選擇 **開始訓練**（可選：先以 BLE 連接騎行台）
2. 挑選**追逐者主題**與訓練計畫（熱身、耐力、間歇、節奏、甜蜜點、自由騎乘）
3. 騎行過程中：
   - **功率 ≥ 目標** → 與追逐者拉開距離，進入安全區
   - **功率 < 目標** → 追逐者逼近；過近會觸發緊張表情與危險紅邊
4. 追逐者會間歇休息，再急速追上，節奏更有變化
5. 計畫結束後顯示訓練結算（時間、平均／最大功率等）

### 操作快捷鍵

| 按鍵 | 功能 |
|------|------|
| `Space` / `P` | 暫停／繼續 |
| `Esc` | 暫停；已暫停時返回主選單 |

畫面右上角也可點擊暫停按鈕。

### 主題切換

| 方式 | 說明 |
|------|------|
| 計畫選擇頁 | 點選「追逐者主題」chip |
| URL（開發） | `?theme=shiba\|bear\|godzilla\|redlady` |
| 直接進追逐 | `?screen=chase&theme=redlady` |

---

## 主要特色

- **功率驅動的追逐機制** — 距離向功率平衡點平滑收斂（0–80 m，達標約 40 m）
- **可切換追逐者主題** — 資料驅動 `themes.ts`：角色、背景、路面色、行為微調
- **可變坡度 + 路線剖面** — 平路／上坡／下坡；HUD 簡圖紅點即時進度
- **多種訓練計畫** — 內建 6 套分段功率計畫，含自由騎乘
- **BLE 騎行台** — FTMS 讀取功率／踏頻，可下發目標功率；未連接時模擬模式
- **商業級介面** — 主選單、計畫選擇、儀表板 HUD、暫停與結算
- **跨平台打包** — electron-builder 支援 Linux ARM64（Pi）與 Windows x64

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 殼層 | Electron 32 |
| 畫面 | PixiJS 8 + TypeScript |
| 建置 | Vite 6（renderer）+ tsc（main） |
| BLE | `@abandonware/noble`（FTMS 0x1826） |
| 打包 | electron-builder |

### 專案結構

```
cycling-chase-game/
├── assets/                 # 角色與粒子素材（rider / dog / sweat）
├── docs/screenshots/       # README 遊戲畫面截圖
├── src/
│   ├── main/               # Electron 主進程 + BLE + IPC
│   └── renderer/
│       ├── game/
│       │   ├── chase-scene.ts   # 場景、地形、主題背景
│       │   ├── themes.ts        # 追逐者主題定義
│       │   ├── game-state.ts
│       │   └── hud.ts
│       ├── scenes/         # 主選單、計畫選擇
│       └── ui/
├── package.json
├── vite.config.ts
└── electron-builder.yml
```

---

## 環境需求

- **Node.js** 22+（建議）
- **npm** 10+
- BLE 實機測試：具備藍牙的主機（Pi 5 需已安裝系統藍牙堆疊）
- 開發預覽可僅用瀏覽器／Electron（模擬模式，無需騎行台）

---

## 安裝與執行

```bash
# 安裝依賴（會 rebuild native BLE 模組）
npm install

# 開發模式（Vite + Electron）
npm run dev
```

僅預覽 renderer（不開 Electron）時：

```bash
npx vite --host 127.0.0.1 --port 5173
# 瀏覽器開啟 http://127.0.0.1:5173
```

除錯捷徑（開發用）：

- `?screen=plan` — 直接進入計畫選擇
- `?screen=chase` — 直接進入追逐場景
- `?theme=bear` — 指定主題

---

## 建置與發行

```bash
# 完整建置（TypeScript + Vite + Electron main）
npm run build

# 打包 Raspberry Pi 5（Linux arm64 AppImage）
npm run dist:pi

# 打包 Windows x64
npm run dist:win
```

產物目錄由 `electron-builder.yml` 設定（預設 `release/`）。

---

## 訓練計畫一覽

| 計畫 | 時長 | 說明 |
|------|------|------|
| 基礎熱身 30分 | 30 min | 暖身 → 輕度有氧 → 節奏 → 緩和 |
| 耐力提升 30分 | 30 min | 有氧穩態為主 |
| 間歇訓練 60分 | 60 min | 多次高強度 220W + 恢復 |
| 節奏騎乘 60分 | 60 min | 節奏區間持續騎 |
| 甜蜜點訓練 60分 | 60 min | Sweet Spot 三段 |
| 自由騎乘 | 不限 | 固定目標 120W，無時限 |

距離與狗狀態邏輯摘要：

- 距離範圍 **0–80 m**；剛好達標（100%）時平衡點約 **40 m**
- 距離向「功率完成率對應的平衡距離」平滑收斂（不足時狗較積極、過剩時拉開需持續出力）
- **≤ 10 m**：危險（畫面震動、紅邊、緊張表情）
- **≤ 25 m**：緊張狀態
- 狗節奏：**追逐 → 退場 → 休息 → 急速追回 → 追逐**（危險貼近時不休息）

---

## 追逐者主題一覽

| Theme ID | 追逐者 | 背景風格 |
|----------|--------|----------|
| `shiba` | 柴犬 | 夜間公路：月亮、星星、遠山、路燈 |
| `bear` | 黑熊騎單車（placeholder） | 夜間森林：樹、霧、螢火蟲、落葉 |
| `godzilla` | 哥吉拉騎單車（placeholder） | 黑夜高樓：摩天樓、霓虹、窗燈 |
| `redlady` | 紅衣長髮小姐（placeholder） | 台灣風墓地：墓碑、金紙、香燭、鬼火 |

新增主題：編輯 `src/renderer/game/themes.ts` 的 `THEMES`，必要時在 `chase-scene.ts` 的 `_buildBackground` 加背景繪製。詳見該檔頂部註解。

---

## BLE 說明

- 協定：FTMS Indoor Bike（Service `0x1826`）
- 主選單可點 **連接騎行台 (BLE)** 掃描並連線
- 連線成功後關閉模擬模式，HUD 顯示裝置名稱
- 斷線後自動回到模擬模式

未安裝藍牙或 noble 建置失敗時，仍可完整使用模擬模式遊玩／展示。

---

## 開發歷程

本專案以「功率訓練 + 追逐遊戲」為核心，從規格草稿走到可在 Pi 5 / Windows 打包的 Electron 應用。重點演進如下。

### 時間軸

| 階段 | 版本 | 重點 |
|------|------|------|
| **0. 概念與規格** | — | Antigravity prompt 定義 Electron + PixiJS 8 + FTMS BLE、訓練計畫與追逐狀態機。 |
| **1. 核心玩法原型** | 0.x | 路面捲動、距離依功率變化、像素風驗證手感。 |
| **2. 場景與殼層** | 0.x | 主選單、計畫選擇、暫停／結算；模擬功率。 |
| **3. 商業級 UI** | 1.0 | 設計 token、完成率環、段落進度、儀表卡。 |
| **4. 角色與特效** | 1.0 | 插畫騎士／柴犬多幀、汗珠粒子。 |
| **5. BLE 與發行** | 1.0 | FTMS 連線；`dist:pi` / `dist:win`。 |
| **6. 追逐手感重構** | 1.1 | 功率平衡距離、狗狀態機、平滑退場／追回。 |
| **7. 可變坡度 + 剖面** | 1.1 | 地形段落、動態路面、路線簡圖紅點。 |
| **8. 追逐者主題系統** | 1.2 | 資料驅動 `themes.ts`：shiba／bear／godzilla／redlady；計畫頁 chip 與 `?theme=` 切換。 |

### 早期原型 vs 現況

早期以簡化像素角色驗證機制（約 2026-06）：

![早期追逐原型](docs/screenshots/00-early-prototype.png)

現況為插畫角色、商業級 HUD、可變坡度、多主題場景（見上方「遊戲畫面」）。

### 設計決策摘要

- **為什麼是「追逐」**：把功率區間轉成可見威脅距離，動機強、失敗成本低。
- **模擬模式優先**：無騎行台也能完整展示與調 UI。
- **Renderer / Main 分離**：Pixi 只負責畫面；BLE 在 main + preload。
- **主題資料驅動**：角色、背景開關、路面色集中在 `themes.ts`，方便加新主題。
- **距離平衡模型**：達標約 40 m；不足狗較積極、過剩拉開需持續出力。
- **坡度與進度綁定**：海拔隨訓練進度變化。

### 主要模組對照

| 模組 | 職責 |
|------|------|
| `src/renderer/game/themes.ts` | 主題介面與四主題設定 |
| `src/renderer/game/game-state.ts` | 計畫、距離平衡、狗狀態機、tick |
| `src/renderer/game/chase-scene.ts` | 地形、動態路面、主題背景、追逐者、特效 |
| `src/renderer/game/hud.ts` | 儀表板、進度、暫停與結算（文案隨主題） |
| `src/renderer/scenes/*` | 主選單、計畫＋主題選擇 |
| `src/main/ble-manager.ts` | FTMS 掃描、連線、控制點 |
| `src/renderer/ui/*` | 設計 token 與共用元件 |

### 後續可延伸

- 正式 bear／godzilla／redlady sprite sheet
- 坡度連動目標功率或模擬阻力
- 實機心率帶、歷史成績曲線
- 音效與震動回饋、多語系

---

## 開發備註

- 角色素材：`assets/rider.png`、`assets/dog.png`；舊版 `*.bak`
- 主題定義：`src/renderer/game/themes.ts`
- 完整規格草稿：`cycling-chase-game-prompt.md`
- 畫面截圖：`docs/screenshots/`
- 狀態機與計畫：`src/renderer/game/game-state.ts`

---

## 授權

私有專案／依專案擁有者約定使用。
