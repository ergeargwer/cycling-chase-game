// 可切換追逐者主題系統（Theme System）
//
// 如何新增下一個主題：
// 1. 在 assets/ 放入 chaser sheet（奔跑列 + 攻擊／吼叫列）
// 2. 定義 FrameRect 裁切（或沿用 DOG_* 作為 placeholder）
// 3. 在 THEMES 新增一筆 ChaseTheme，填 id / 素材 / 背景開關 / 路面色
// 4. 若需專屬背景繪製，在 chase-scene._buildBackground 的 switch 加 case
// 5. 選單或 URL ?theme=<id> 即可選用（見 getTheme / resolveThemeId）

/** Sprite sheet 單一幀裁切 */
export interface FrameRect {
  x: number
  y: number
  w: number
  h: number
}

/** 追逐者角色設定 */
export interface ChaserConfig {
  /** 顯示名稱（HUD 文案） */
  name: string
  /** 短名（休息橫幅等） */
  shortName: string
  /**
   * 素材路徑（相對 public/assets）。
   * bear / godzilla / redlady 目前暫用 dog.png 並以 tint 示意；
   * 正式素材就緒後改為例如 assets/bear.png、assets/redlady.png。
   *
   * redlady 造型需求（正式 sheet）：
   * 長髮、紅衣、紅高跟鞋騎單車；攻擊幀可為回頭／披髮揚起。
   */
  spriteSrc: string
  /** Assets 別名（須唯一） */
  assetAlias: string
  runFrames: FrameRect[]
  /** 攻擊／吼叫／特殊幀（對應原本吠叫） */
  attackFrames: FrameRect[]
  displayHeight: number
  /** 可選：整體著色（0xffffff = 原色） */
  tint: number
  /** 額外縮放倍率（在 displayHeight 之後） */
  scaleMul: number
}

/** 背景與場景元素開關／配色 */
export interface ThemeBackground {
  sky: number
  skyHaze: number
  farLayer: number
  midLayer: number
  road: number
  roadEdge: number
  roadDash: number
  roadside: number
  lamp: number
  /** 天空光暈色（月亮／霓虹／鬼火） */
  skyAccent: number

  showMoon: boolean
  showStars: boolean
  showMountains: boolean
  showLamps: boolean
  /** 森林：多層樹剪影 + 霧 + 螢火蟲 */
  showForest: boolean
  /** 城市：摩天樓剪影 + 霓虹 + 窗燈光 */
  showCity: boolean
  /** 台灣風格夜間墓地：墓碑、金紙、香燭、陰森樹、鬼火 */
  showCemetery: boolean
  showFog: boolean
  showFireflies: boolean
  showNeon: boolean
  showFallingLeaves: boolean
  /** 墓地用：藍綠鬼火粒子 */
  showWillOWisp: boolean
}

/** 可選行為／視覺微調 */
export interface ThemeBehavior {
  /** 追逐者動畫基礎速度倍率 */
  animSpeedMul: number
  /** 危險時震動強度倍率 */
  shakeMul: number
  /** 休息／退場橫幅用動詞 */
  restVerb: string
  returnVerb: string
}

export interface ChaseTheme {
  id: string
  label: string
  description: string
  chaser: ChaserConfig
  background: ThemeBackground
  behavior: ThemeBehavior
}

// ── 共用幀（dog.png 1320×400；placeholder 主題暫共用）────

/** 奔跑 6 幀 */
export const DOG_RUN_FRAMES: FrameRect[] = [
  { x: 12,   y: 51,  w: 196, h: 142 },
  { x: 233,  y: 35,  w: 194, h: 157 },
  { x: 457,  y: 16,  w: 185, h: 176 },
  { x: 672,  y: 70,  w: 196, h: 123 },
  { x: 896,  y: 15,  w: 187, h: 178 },
  { x: 1112, y: 38,  w: 196, h: 155 },
]

/** 吠叫／攻擊 3 幀（未來 bear 吼叫、godzilla 咆哮可另開 sheet） */
export const DOG_ATTACK_FRAMES: FrameRect[] = [
  { x: 12,  y: 263, w: 196, h: 130 },
  { x: 232, y: 263, w: 196, h: 130 },
  { x: 452, y: 217, w: 196, h: 176 },
]

export const DEFAULT_THEME_ID = 'shiba'

export const THEMES: Record<string, ChaseTheme> = {
  shiba: {
    id: 'shiba',
    label: '柴犬公路',
    description: '夜間公路 · 甩開柴犬追趕',
    chaser: {
      name: '柴犬',
      shortName: '柴犬',
      spriteSrc: 'assets/dog.png',
      assetAlias: 'chaser-shiba',
      runFrames: DOG_RUN_FRAMES,
      attackFrames: DOG_ATTACK_FRAMES,
      displayHeight: 140,
      tint: 0xffffff,
      scaleMul: 1,
    },
    background: {
      sky: 0x05050f,
      skyHaze: 0x1a1a3e,
      farLayer: 0x0a0a1c,
      midLayer: 0x0d0d22,
      road: 0x1c1c1c,
      roadEdge: 0x4a4a4a,
      roadDash: 0x8a7040,
      roadside: 0x0e1a0a,
      lamp: 0xffdc64,
      skyAccent: 0xe8e0c0,
      showMoon: true,
      showStars: true,
      showMountains: true,
      showLamps: true,
      showForest: false,
      showCity: false,
      showCemetery: false,
      showFog: false,
      showFireflies: false,
      showNeon: false,
      showFallingLeaves: false,
      showWillOWisp: false,
    },
    behavior: {
      animSpeedMul: 1,
      shakeMul: 1,
      restVerb: '喘口氣',
      returnVerb: '急速追上',
    },
  },

  bear: {
    id: 'bear',
    label: '黑熊森林',
    description: '夜間森林 · 黑熊騎單車追趕',
    chaser: {
      name: '黑熊騎單車',
      shortName: '黑熊',
      // TODO: 換成 assets/bear.png（奔跑 + 吼叫 sheet）
      spriteSrc: 'assets/dog.png',
      assetAlias: 'chaser-bear',
      runFrames: DOG_RUN_FRAMES,
      attackFrames: DOG_ATTACK_FRAMES,
      displayHeight: 168,
      tint: 0x4a3728,
      scaleMul: 1.12,
    },
    background: {
      sky: 0x04080a,
      skyHaze: 0x0a1a14,
      farLayer: 0x061410,
      midLayer: 0x0a1c14,
      road: 0x1a1814,
      roadEdge: 0x3a3530,
      roadDash: 0x6a5a38,
      roadside: 0x0a1810,
      lamp: 0xc4e87a,
      skyAccent: 0x9fd4a8,
      showMoon: false,
      showStars: true,
      showMountains: false,
      showLamps: false,
      showForest: true,
      showCity: false,
      showCemetery: false,
      showFog: true,
      showFireflies: true,
      showNeon: false,
      showFallingLeaves: true,
      showWillOWisp: false,
    },
    behavior: {
      animSpeedMul: 0.9,
      shakeMul: 1.15,
      restVerb: '歇腳',
      returnVerb: '衝出叢林',
    },
  },

  godzilla: {
    id: 'godzilla',
    label: '哥吉拉都市',
    description: '黑夜高樓 · 哥吉拉騎單車追趕',
    chaser: {
      name: '哥吉拉騎單車',
      shortName: '哥吉拉',
      // TODO: 換成 assets/godzilla.png（奔跑 + 咆哮 sheet）
      spriteSrc: 'assets/dog.png',
      assetAlias: 'chaser-godzilla',
      runFrames: DOG_RUN_FRAMES,
      attackFrames: DOG_ATTACK_FRAMES,
      displayHeight: 200,
      tint: 0x3d6b4a,
      scaleMul: 1.25,
    },
    background: {
      sky: 0x060618,
      skyHaze: 0x12122e,
      farLayer: 0x0c0c22,
      midLayer: 0x10102a,
      road: 0x18181c,
      roadEdge: 0x555566,
      roadDash: 0x6a8a9a,
      roadside: 0x121218,
      lamp: 0xff66aa,
      skyAccent: 0x66e0ff,
      showMoon: false,
      showStars: true,
      showMountains: false,
      showLamps: true,
      showForest: false,
      showCity: true,
      showCemetery: false,
      showFog: false,
      showFireflies: false,
      showNeon: true,
      showFallingLeaves: false,
      showWillOWisp: false,
    },
    behavior: {
      animSpeedMul: 0.85,
      shakeMul: 1.35,
      restVerb: '蓄力',
      returnVerb: '城市衝刺',
    },
  },

  /**
   * 紅衣小姐 · 台灣風格夜間墓地
   * 氣氛：陰森、民間信仰意象，但不血腥、適合作為運動遊戲主題。
   */
  redlady: {
    id: 'redlady',
    label: '紅衣墓地',
    description: '夜間墓地 · 紅衣小姐騎單車追趕',
    chaser: {
      name: '紅衣長髮小姐',
      shortName: '紅衣小姐',
      // TODO: 換成 assets/redlady.png
      // 造型：長髮、紅衣、紅高跟鞋騎單車；攻擊幀可為披髮／回頭
      spriteSrc: 'assets/dog.png',
      assetAlias: 'chaser-redlady',
      runFrames: DOG_RUN_FRAMES,
      attackFrames: DOG_ATTACK_FRAMES,
      displayHeight: 175,
      tint: 0xc41e3a,
      scaleMul: 1.08,
    },
    background: {
      // 深青黑／微綠陰森天空
      sky: 0x050a0c,
      skyHaze: 0x0a1816,
      farLayer: 0x0a1210,
      midLayer: 0x101a16,
      // 灰綠偏濕路面
      road: 0x1a1e1c,
      roadEdge: 0x3a4540,
      roadDash: 0x5a6a58,
      roadside: 0x0c1410,
      // 暗淡舊燈／香燭暖橙
      lamp: 0xd4a056,
      skyAccent: 0x6ee7b0,
      showMoon: true,
      showStars: true,
      showMountains: false,
      showLamps: true,
      showForest: false,
      showCity: false,
      showCemetery: true,
      showFog: true,
      showFireflies: false,
      showNeon: false,
      showFallingLeaves: false,
      showWillOWisp: true,
    },
    behavior: {
      animSpeedMul: 0.95,
      shakeMul: 1.1,
      restVerb: '徘徊',
      returnVerb: '悄然逼近',
    },
  },
}

export const THEME_LIST: ChaseTheme[] = Object.values(THEMES)

export function getTheme(id: string | null | undefined): ChaseTheme {
  if (id && THEMES[id]) return THEMES[id]
  return THEMES[DEFAULT_THEME_ID]
}

export function resolveThemeId(raw: string | null | undefined): string {
  return getTheme(raw).id
}

export function isThemeId(id: string): boolean {
  return id in THEMES
}
