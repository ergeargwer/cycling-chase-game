# 智慧騎行 · 追逐模式

以遊戲化方式進行室內騎行功率訓練。維持目標功率，甩開後方柴犬的追趕；功率不足時距離縮短，緊張感隨之升高。

**平台：** Electron 桌面應用（Raspberry Pi 5 ARM64 / Windows x64）  
**版本：** 1.0.0

---

## 遊戲玩法

1. 在主選單選擇 **開始訓練**（可選：先以 BLE 連接騎行台）
2. 挑選訓練計畫（熱身、耐力、間歇、節奏、甜蜜點、自由騎乘）
3. 騎行過程中：
   - **功率 ≥ 目標** → 與柴犬拉開距離，進入安全區
   - **功率 < 目標** → 柴犬逼近；過近會觸發緊張表情與危險紅邊
4. 柴犬會間歇休息，再急速追上，節奏更有變化
5. 計畫結束後顯示訓練結算（時間、平均／最大功率等）

### 操作快捷鍵

| 按鍵 | 功能 |
|------|------|
| `Space` / `P` | 暫停／繼續 |
| `Esc` | 暫停；已暫停時返回主選單 |

畫面右上角也可點擊暫停按鈕。

---

## 主要特色

- **功率驅動的追逐機制** — 距離隨功率完成率即時變化（0–80 m）
- **多種訓練計畫** — 內建 6 套分段功率計畫，含自由騎乘
- **BLE 騎行台** — 透過 FTMS（`@abandonware/noble`）讀取功率／踏頻，並可下發目標功率；未連接時自動使用模擬數據
- **商業級介面** — 主選單、計畫選擇、儀表板 HUD、暫停與結算覆蓋層
- **高品質角色動畫** — 騎士（正常／緊張）與柴犬（奔跑／吠叫）多幀插畫 sprite
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
├── src/
│   ├── main/               # Electron 主進程 + BLE + IPC
│   │   ├── index.ts
│   │   ├── ble-manager.ts
│   │   ├── ipc-handlers.ts
│   │   └── preload.ts
│   └── renderer/           # 遊戲畫面（PixiJS）
│       ├── index.ts        # 場景切換、啟動
│       ├── game/
│       │   ├── chase-scene.ts
│       │   ├── game-state.ts
│       │   └── hud.ts
│       ├── scenes/
│       │   ├── menu-scene.ts
│       │   └── plan-scene.ts
│       ├── ui/
│       │   ├── theme.ts
│       │   └── components.ts
│       └── utils/
│           └── ble-bridge.ts
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

距離邏輯摘要：

- 距離範圍 **0–80 m**
- **≤ 10 m**：危險（畫面震動、紅邊、緊張表情）
- **≤ 25 m**：緊張狀態
- 每秒依 `當前功率 / 目標功率` 調整距離

---

## BLE 說明

- 協定：FTMS Indoor Bike（Service `0x1826`）
- 主選單可點 **連接騎行台 (BLE)** 掃描並連線
- 連線成功後關閉模擬模式，HUD 顯示裝置名稱
- 斷線後自動回到模擬模式

未安裝藍牙或 noble 建置失敗時，仍可完整使用模擬模式遊玩／展示。

---

## 開發備註

- 角色素材位於 `assets/rider.png`、`assets/dog.png`；舊版備份可為 `*.bak`
- 畫面設計 token 與元件：`src/renderer/ui/`
- 狀態機與計畫定義：`src/renderer/game/game-state.ts`

---

## 授權

私有專案／依專案擁有者約定使用。
