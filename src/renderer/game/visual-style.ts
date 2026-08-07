// 視覺風格（現代 / 復古）— 僅影響呈現，不改玩法
//
// 規格依據：
//   docs/retro-asset-spec.md       — 角色、通用路徑、幀格
//   docs/retro-scene-props-spec.md — 圖層 L0–L7、視差、tile/mid/props
//
// 狀態流：主選單 → StyleSelect → 計畫/主題 → ChaseScene（整場鎖定）

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
    description: '像素硬邊 · nearest · 多層視差 · 規格 tile/props',
  },
}

export function isVisualStyle(v: string | null | undefined): v is VisualStyle {
  return v === 'modern' || v === 'retro'
}

export function resolveVisualStyle(raw: string | null | undefined): VisualStyle {
  return isVisualStyle(raw) ? raw : DEFAULT_VISUAL_STYLE
}

// ── 路徑（嚴格對齊規格目錄）────────────────────────────────

export function modernPath(file: string): string {
  return file.startsWith('assets/') ? file : `assets/${file}`
}

/** assets/retro/<parts...> */
export function retroPath(...parts: string[]): string {
  return ['assets', 'retro', ...parts.filter(Boolean)].join('/')
}

export function riderSpriteSrc(style: VisualStyle): string {
  return style === 'retro'
    ? retroPath('characters', 'rider.png')
    : modernPath('rider.png')
}

export function sweatSpriteSrc(style: VisualStyle): string {
  // 規格：fx/sweat.png（retro-asset-spec）
  return style === 'retro'
    ? retroPath('fx', 'sweat.png')
    : modernPath('sweat.png')
}

export function chaserSpriteSrc(
  style: VisualStyle,
  themeId: string,
  modernSpriteSrc: string,
): string {
  if (style === 'retro') return retroPath('chasers', `${themeId}.png`)
  return modernSpriteSrc.startsWith('assets/')
    ? modernSpriteSrc
    : modernPath(modernSpriteSrc)
}

export function styleAssetAlias(style: VisualStyle, base: string): string {
  return `${style}:${base}`
}

// ── 圖層視差速度（retro-scene-props-spec §0.4，取中位）────

export type ParallaxLayerId = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L6'

/** 相對路面（L4 = 1.0）的捲動倍率 */
export const PARALLAX_SPEED: Record<ParallaxLayerId, number> = {
  L0: 0.08,  // 天空／星  0.05–0.10
  L1: 0.20,  // 遠景      0.15–0.25
  L2: 0.48,  // 中景      0.40–0.55
  L3: 0.90,  // 路肩 props 0.85–0.95
  L4: 1.00,  // 路面基準
  L6: 1.12,  // 前景粒子  1.05–1.20
}

// ── 共用 tile 路徑（scene-props §1.2）────────────────────

export const RETRO_SHARED_TILES = {
  roadBody:    retroPath('tiles', 'shared', 'road-body.png'),
  roadDash:    retroPath('tiles', 'shared', 'road-dash.png'),
  roadEdgeTop: retroPath('tiles', 'shared', 'road-edge-top.png'),
  roadEdgeBot: retroPath('tiles', 'shared', 'road-edge-bot.png'),
  shoulder:    retroPath('tiles', 'shared', 'shoulder.png'),
  skyNight:    retroPath('tiles', 'shared', 'sky-night.png'),
  moon:        retroPath('tiles', 'shared', 'moon.png'),
} as const

// ── 各主題場景清單（scene-props §5，主檔優先）────────────

export interface RetroThemeSceneManifest {
  themeId: string
  /** L1 遠景條（可選） */
  farStrips: string[]
  /** L2 中景無縫 strip（主視覺） */
  midStrips: string[]
  /** L3 路肩 props（依序輪換） */
  roadsideProps: string[]
  /** 主題路肩 tile（覆蓋 shared） */
  shoulder?: string
  /** 主題路面（如泥路） */
  roadBody?: string
  /** L6 FX 動畫 sheet */
  fxSheets: string[]
}

function p(...parts: string[]): string {
  return retroPath(...parts)
}

/** 依 themeId 回傳規格中的優先場景路徑 */
export function getRetroSceneManifest(themeId: string): RetroThemeSceneManifest {
  const table: Record<string, Omit<RetroThemeSceneManifest, 'themeId'>> = {
    shiba: {
      farStrips: [p('mid', 'shiba', 'hills-strip.png')],
      midStrips: [p('mid', 'shiba', 'powerline-strip.png')],
      roadsideProps: [
        p('props', 'shiba', 'lamp.png'),
        p('props', 'shiba', 'utility-pole.png'),
        p('props', 'shiba', 'reflector.png'),
        p('props', 'shiba', 'sign-curve.png'),
        p('props', 'shiba', 'grass-tuft.png'),
        p('props', 'shiba', 'mile-stone.png'),
      ],
      shoulder: p('tiles', 'shiba', 'shoulder.png'),
      fxSheets: [p('fx', 'shared', 'moth-2f.png')],
    },
    bear: {
      farStrips: [],
      midStrips: [
        p('mid', 'bear', 'pine-strip.png'),
        p('mid', 'bear', 'fog-band.png'),
      ],
      roadsideProps: [
        p('props', 'bear', 'tree-a.png'),
        p('props', 'bear', 'tree-b.png'),
        p('props', 'bear', 'stump.png'),
        p('props', 'bear', 'mushroom.png'),
        p('props', 'bear', 'rock-a.png'),
        p('props', 'bear', 'log.png'),
        p('props', 'bear', 'fern.png'),
      ],
      fxSheets: [
        p('fx', 'bear', 'firefly-2f.png'),
        p('fx', 'bear', 'leaf-4f.png'),
      ],
    },
    godzilla: {
      farStrips: [],
      midStrips: [
        p('mid', 'godzilla', 'skyline-strip.png'),
        p('mid', 'godzilla', 'neon-strip.png'),
      ],
      roadsideProps: [
        p('props', 'godzilla', 'building-a.png'),
        p('props', 'godzilla', 'sign-shop.png'),
        p('props', 'godzilla', 'street-lamp.png'),
        p('props', 'godzilla', 'wreck-car.png'),
        p('props', 'godzilla', 'hydrant.png'),
        p('props', 'godzilla', 'rubble.png'),
      ],
      fxSheets: [p('fx', 'godzilla', 'window-blink-2f.png')],
    },
    redlady: {
      farStrips: [],
      midStrips: [p('mid', 'redlady', 'columbarium-strip.png')],
      roadsideProps: [
        p('props', 'redlady', 'tomb-stele-a.png'),
        p('props', 'redlady', 'tomb-stele-b.png'),
        p('props', 'redlady', 'tomb-round-a.png'),
        p('props', 'redlady', 'tomb-double.png'),
        p('props', 'redlady', 'mound-a.png'),
        p('props', 'redlady', 'mound-b.png'),
        p('props', 'redlady', 'mound-c.png'),
        p('props', 'redlady', 'censer.png'),
        p('props', 'redlady', 'stone-lantern.png'),
        p('props', 'redlady', 'iron-fence.png'),
        p('props', 'redlady', 'dead-tree.png'),
        p('props', 'redlady', 'gate-pillar.png'),
      ],
      shoulder: p('tiles', 'redlady', 'shoulder-dirt.png'),
      fxSheets: [
        p('fx', 'redlady', 'joss-paper-4f.png'),
        p('fx', 'redlady', 'will-o-wisp-2f.png'),
      ],
    },
    jiangshi: {
      farStrips: [],
      midStrips: [p('mid', 'jiangshi', 'village-strip.png')],
      roadsideProps: [
        p('props', 'jiangshi', 'house-ruin.png'),
        p('props', 'jiangshi', 'wall-broken.png'),
        p('props', 'jiangshi', 'gate-old.png'),
        p('props', 'jiangshi', 'joss-paper-pile.png'),
        p('props', 'jiangshi', 'candle.png'),
        p('props', 'jiangshi', 'talisman.png'),
      ],
      fxSheets: [
        p('fx', 'jiangshi', 'candle-flicker-2f.png'),
        p('fx', 'jiangshi', 'joss-paper-4f.png'),
      ],
    },
    alien: {
      farStrips: [],
      midStrips: [
        p('mid', 'alien', 'field-strip.png'),
        p('mid', 'alien', 'crop-circle-hint.png'),
      ],
      roadsideProps: [
        p('props', 'alien', 'scarecrow.png'),
        p('props', 'alien', 'crop-a.png'),
        p('props', 'alien', 'ufo-wreck.png'),
        p('props', 'alien', 'weird-plant.png'),
        p('props', 'alien', 'fence-wood.png'),
        p('props', 'alien', 'light-pole.png'),
      ],
      shoulder: p('tiles', 'alien', 'shoulder-soil.png'),
      fxSheets: [p('fx', 'alien', 'ufo-glow-2f.png')],
    },
    dumptruck: {
      farStrips: [],
      midStrips: [p('mid', 'dumptruck', 'cliff-strip.png')],
      roadsideProps: [
        p('props', 'dumptruck', 'guardrail.png'),
        p('props', 'dumptruck', 'barrier.png'),
        p('props', 'dumptruck', 'cone.png'),
        p('props', 'dumptruck', 'rubble-pile.png'),
        p('props', 'dumptruck', 'dirt-mound.png'),
        p('props', 'dumptruck', 'sign-work.png'),
        p('props', 'dumptruck', 'barrel.png'),
      ],
      roadBody: p('tiles', 'dumptruck', 'road-dirt.png'),
      fxSheets: [p('fx', 'dumptruck', 'dust-4f.png')],
    },
    foodpanda: {
      farStrips: [],
      midStrips: [p('mid', 'foodpanda', 'arcade-strip.png')],
      roadsideProps: [
        p('props', 'foodpanda', 'shop-a.png'),
        p('props', 'foodpanda', 'sign-vert.png'),
        p('props', 'foodpanda', 'sign-horiz.png'),
        p('props', 'foodpanda', 'scooter.png'),
        p('props', 'foodpanda', 'scooter-b.png'),
        p('props', 'foodpanda', 'plant-pot.png'),
        p('props', 'foodpanda', 'traffic-light.png'),
      ],
      fxSheets: [p('fx', 'foodpanda', 'neon-flicker-2f.png')],
    },
    grandma: {
      farStrips: [],
      midStrips: [p('mid', 'grandma', 'alley-strip.png')],
      roadsideProps: [
        p('props', 'grandma', 'iron-door.png'),
        p('props', 'grandma', 'window-cage.png'),
        p('props', 'grandma', 'clothes-rack.png'),
        p('props', 'grandma', 'pot-plant.png'),
        p('props', 'grandma', 'scooter-old.png'),
        p('props', 'grandma', 'mailbox.png'),
        p('props', 'grandma', 'brick-wall.png'),
      ],
      fxSheets: [],
    },
    ambulance: {
      farStrips: [],
      midStrips: [p('mid', 'ambulance', 'hospital-strip.png')],
      roadsideProps: [
        p('props', 'ambulance', 'er-sign.png'),
        p('props', 'ambulance', 'cross-sign.png'),
        p('props', 'ambulance', 'barrier-red.png'),
        p('props', 'ambulance', 'entrance.png'),
        p('props', 'ambulance', 'lamp-blue.png'),
      ],
      fxSheets: [p('fx', 'ambulance', 'beacon-2f.png')],
    },
    firetruck: {
      farStrips: [],
      midStrips: [p('mid', 'firetruck', 'burnt-street-strip.png')],
      roadsideProps: [
        p('props', 'firetruck', 'hydrant.png'),
        p('props', 'firetruck', 'scorch.png'),
        p('props', 'firetruck', 'debris.png'),
        p('props', 'firetruck', 'hose.png'),
        p('props', 'firetruck', 'cone.png'),
      ],
      fxSheets: [
        p('fx', 'firetruck', 'flame-4f.png'),
        p('fx', 'firetruck', 'smoke-4f.png'),
        p('fx', 'firetruck', 'ember-2f.png'),
      ],
    },
    bikini: {
      farStrips: [p('mid', 'bikini', 'sea-strip.png')],
      midStrips: [p('mid', 'bikini', 'wave-strip-2f.png')],
      roadsideProps: [
        p('props', 'bikini', 'lighthouse.png'),
        p('props', 'bikini', 'rock.png'),
        p('props', 'bikini', 'rock-b.png'),
        p('props', 'bikini', 'umbrella.png'),
        p('props', 'bikini', 'rail.png'),
        p('props', 'bikini', 'lifebuoy.png'),
      ],
      shoulder: p('tiles', 'bikini', 'shoulder-sand.png'),
      fxSheets: [p('fx', 'bikini', 'sparkle-2f.png')],
    },
  }

  const row = table[themeId] ?? table.shiba
  return { themeId, ...row }
}

/** 本場 chase 可能用到的復古場景 URL 列表（供預載） */
export function listRetroSceneUrls(themeId: string): string[] {
  const m = getRetroSceneManifest(themeId)
  const urls = [
    RETRO_SHARED_TILES.roadBody,
    RETRO_SHARED_TILES.roadDash,
    RETRO_SHARED_TILES.skyNight,
    RETRO_SHARED_TILES.moon,
    RETRO_SHARED_TILES.shoulder,
    ...m.farStrips,
    ...m.midStrips,
    ...m.roadsideProps,
    ...m.fxSheets,
  ]
  if (m.shoulder) urls.push(m.shoulder)
  if (m.roadBody) urls.push(m.roadBody)
  return [...new Set(urls)]
}

// ── 角色幀格（retro-asset-spec §3）────────────────────────

export const RETRO_CELL = 48
export const RETRO_RUN_COLS = 6
export const RETRO_ATK_COLS = 3

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
export const RETRO_RIDER_NORMAL_FRAMES: FrameRect[] = retroGridFrames(6, 0)
export const RETRO_RIDER_NERVOUS_FRAMES: FrameRect[] = retroGridFrames(6, 1)

export const RETRO_DISPLAY: {
  rider: number
  chaser: Record<string, number>
  defaultChaser: number
  /** 場景 tile 顯示倍率（nearest 整數倍） */
  worldScale: number
} = {
  rider: 288,
  defaultChaser: 288,
  worldScale: 3,
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

export function wantsCrtOverlay(style: VisualStyle): boolean {
  return style === 'retro'
}

export function textureScaleMode(style: VisualStyle): 'linear' | 'nearest' {
  return style === 'retro' ? 'nearest' : 'linear'
}
