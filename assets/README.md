# 遊戲素材目錄

## 現代模式（最終版）

根目錄 PNG 為 **現代模式正式素材**（v1.3 透明底 sheet）：

| 檔案 | 用途 |
|------|------|
| `rider.png` | 騎士 |
| `dog.png` / `shiba.png` | 柴犬追逐者 |
| `alien.png` … `firetruck.png` 等 | 其餘 11 追逐者 sheet |
| `sweat.png` | 汗珠 FX |
| `chaser-frames.json` / `sprite-frames.json` | 幀參考資料 |
| `backgrounds/<theme>.png` | 主題夜間背景圖（1920×1080，可選接入） |

追逐者 sheet 約 **1320×398**，幀裁切見 `src/renderer/game/themes.ts`。

## 復古模式

見 `retro/` 與 `docs/retro-asset-spec.md`、`docs/retro-scene-props-spec.md`。

## 請勿提交

中間稿／備份檔（`*.pre_*`、`_gen/`、`_hq_backup/`）已列入 `.gitignore`。
