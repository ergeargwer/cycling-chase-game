// 視覺風格（現代 / 復古）— 僅影響呈現，不改玩法
//
// 狀態流：主選單 → 風格選擇 → 計畫/主題 → ChaseScene
// 不支援遊戲中熱切換；回到主選單後再選才會改變。

import type { FrameRect } from './themes'

export type VisualStyle = 'modern' | 'retro'

export const VISUAL_STYLE_IDS = ['modern', 'retro'] as const

export const DEFAULT_VISUAL_STYLE: VisualStyle = 'modern'

export const VISUAL_STYLE_META: Record<
  VisualStyle,
  { id: VisualStyle; label: string; labelEn: string; description: string }
> = {
  modern: {
    id: 'modern',
    label: '現代',
    labelEn: 'MODERN',
    description: '精緻卡通渲染 · 平滑縮放 · 現有高清素材',
  },
  retro: {
    id: 'retro',
    label: '復古',
    labelEn: 'RETRO',
    description: '8-bit / 16-bit 像素 · 最近鄰縮放 · 可選掃描線 CRT',
  },
}

export function isVisualStyle(v: string | null | undefined): v is VisualStyle {
  return v === 'modern' || v === 'retro'
}

export function resolveVisualStyle(raw: string | null | undefined): VisualStyle {
  return isVisualStyle(raw) ? raw : DEFAULT_VISUAL_STYLE
}

// ── 路徑慣例 ──────────────────────────────────────────────
// modern：維持現有根目錄 assets/*.png（向後相容）
// retro ：assets/retro/...（見 docs/retro-asset-spec.md）

export function modernPath(file: string): string {
  return file.startsWith('assets/') ? file : `assets/${file}`
}

export function retroPath(...parts: string[]): string {
  return ['assets', 'retro', ...parts].join('/')
}

/** 騎士 sheet */
export function riderSpriteSrc(style: VisualStyle): string {
  return style === 'retro' ? retroPath('characters', 'rider.png') : modernPath('rider.png')
}

/** 汗珠／FX sheet（復古可選；缺檔時回落現代） */
export function sweatSpriteSrc(style: VisualStyle): string {
  return style === 'retro' ? retroPath('fx', 'sweat.png') : modernPath('sweat.png')
}

/**
 * 追逐者 sheet。
 * modern 沿用主題內 spriteSrc（如 assets/dog.png）；
 * retro 固定 assets/retro/chasers/<themeId>.png。
 */
export function chaserSpriteSrc(
  style: VisualStyle,
  themeId: string,
  modernSpriteSrc: string,
): string {
  if (style === 'retro') return retroPath('chasers', `${themeId}.png`)
  return modernSpriteSrc.startsWith('assets/') ? modernSpriteSrc : modernPath(modernSpriteSrc)
}

/** Assets 別名含風格，避免 modern/retro 共用同一 alias 造成快取錯圖 */
export function styleAssetAlias(style: VisualStyle, base: string): string {
  return `${style}:${base}`
}

// ── 復古像素 sheet 幀格（規格：48×48 格，上 6 騎行／下 3 威脅）──
// 完整繪製規格見 docs/retro-asset-spec.md

export const RETRO_CELL = 48
export const RETRO_RUN_COLS = 6
export const RETRO_ATK_COLS = 3

/** 均勻格狀幀（cell×cell） */
export function retroGridFrames(
  count: number,
  row: number,
  cell = RETRO_CELL,
): FrameRect[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i * cell,
    y: row * cell,
    w: cell,
    h: cell,
  }))
}

export const RETRO_RUN_FRAMES: FrameRect[] = retroGridFrames(RETRO_RUN_COLS, 0)
export const RETRO_ATTACK_FRAMES: FrameRect[] = retroGridFrames(RETRO_ATK_COLS, 1)

/** 騎士復古：上列 normal 6、下列 nervous 6 */
export const RETRO_RIDER_NORMAL_FRAMES: FrameRect[] = retroGridFrames(6, 0)
export const RETRO_RIDER_NERVOUS_FRAMES: FrameRect[] = retroGridFrames(6, 1)

/**
 * 復古顯示高度（整數倍放大 48px 源圖）。
 * 騎士 48×6 = 288；柴犬略小；大型威脅更大。
 */
export const RETRO_DISPLAY: {
  rider: number
  chaser: Record<string, number>
  defaultChaser: number
} = {
  rider: 288,
  defaultChaser: 288,
  chaser: {
    shiba: 168,
    bear: 336,
    godzilla: 360,
    redlady: 288,
    jiangshi: 288,
    alien: 276,
    dumptruck: 384,
    foodpanda: 312,
    grandma: 288,
    ambulance: 360,
    firetruck: 384,
    bikini: 300,
  },
}

export function retroChaserDisplayHeight(themeId: string): number {
  return RETRO_DISPLAY.chaser[themeId] ?? RETRO_DISPLAY.defaultChaser
}

/** 是否啟用掃描線／CRT 疊加（復古預設開） */
export function wantsCrtOverlay(style: VisualStyle): boolean {
  return style === 'retro'
}

/** Pixi scale mode 字串 */
export function textureScaleMode(style: VisualStyle): 'linear' | 'nearest' {
  return style === 'retro' ? 'nearest' : 'linear'
}
