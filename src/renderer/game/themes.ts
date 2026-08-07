// 可切換追逐者主題系統（Theme System）
//
// 如何新增下一個主題：
// 1. 在 assets/ 放入 chaser sheet（奔跑列 + 攻擊／吼叫列）
// 2. 定義 FrameRect 裁切（或沿用 DOG_* 作為 placeholder）
// 3. 在 THEMES 新增一筆 ChaseTheme，填 id / 素材 / 背景開關 / 路面色
// 4. 若需專屬背景繪製，在 chase-scene._buildBackground 的 switch 加 case
// 5. 選單或 URL ?theme=<id> 即可選用（見 getTheme / resolveThemeId）
// 6. 復古素材：assets/retro/chasers/<id>.png（見 docs/retro-asset-spec.md）

import {
  type VisualStyle,
  DEFAULT_VISUAL_STYLE,
  chaserSpriteSrc,
  styleAssetAlias,
  RETRO_RUN_FRAMES,
  RETRO_ATTACK_FRAMES,
  retroChaserDisplayHeight,
} from './visual-style'

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
   * 素材路徑（相對 public/assets，Vite publicDir）。
   * sheet 版面：上列 6 騎行／行駛、下列 3 威脅；幀見各 *_RUN/_ATTACK 與 assets/chaser-frames.json。
   */
  spriteSrc: string
  /** Assets 別名（須唯一） */
  assetAlias: string
  runFrames: FrameRect[]
  /** 攻擊／吼叫／特殊幀（對應原本吠叫） */
  attackFrames: FrameRect[]
  /**
   * 畫面顯示高度（px）。騎士 RIDER_DISPLAY_H = 320。
   * 柴犬等小動物 ~160–180；人物騎乘 ~290–320；
   * 大型壓迫感角色（熊／哥吉拉）~360–400；重型車輛 ~480–540。
   * chase-scene：scale = (displayHeight / 幀平均高) * scaleMul
   */
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
  /** 廢棄鄉下聚落／三合院剪影（跳殭屍） */
  showRuins: boolean
  /** 夜間田野／稻田／麥田圈（外星人） */
  showFarmland: boolean
  /** 夜間山路／工地便道（砂石車） */
  showMountainWorks: boolean
  showFog: boolean
  showFireflies: boolean
  showNeon: boolean
  showFallingLeaves: boolean
  /** 墓地／廢墟用：藍綠鬼火粒子 */
  showWillOWisp: boolean
  /** 田野異常光點／UFO 氛圍 */
  showUfoLights: boolean
  /** 砂石粉塵粒子 */
  showDust: boolean
  /** 施工警示燈 */
  showHazardBeacons: boolean
  /** 夜間市區街道（Foodpanda）：騎樓、招牌、號誌 */
  showUrbanStreet: boolean
  /** 傳統巷弄／老街（老太太）：舊公寓、鐵窗、溫暖路燈 */
  showTraditionalAlley: boolean
  /** 醫院／市區急診道（救護車）：醫院剪影、紅光暈 */
  showHospital: boolean
  /** 火災現場感（消防車）：火光、煙霧 */
  showFireScene: boolean
  /** 夜間海邊／河岸（比基尼）：海面反光、護欄 */
  showWaterfront: boolean
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

// ── Sprite 幀裁切（sheet 約 1320×400，上 6 騎行 / 下 3 威脅）────

/** 柴犬 dog.png / shiba.png — 奔跑 6 幀 */
export const DOG_RUN_FRAMES: FrameRect[] = [
  { x: 12,   y: 51,  w: 196, h: 142 },
  { x: 233,  y: 35,  w: 194, h: 157 },
  { x: 457,  y: 16,  w: 185, h: 176 },
  { x: 672,  y: 70,  w: 196, h: 123 },
  { x: 896,  y: 15,  w: 187, h: 178 },
  { x: 1112, y: 38,  w: 196, h: 155 },
]

/** 柴犬 — 吠叫 3 幀 */
export const DOG_ATTACK_FRAMES: FrameRect[] = [
  { x: 12,  y: 263, w: 196, h: 130 },
  { x: 232, y: 263, w: 196, h: 130 },
  { x: 452, y: 217, w: 196, h: 176 },
]

/** 黑熊 bear.png — 騎行 6 幀 */
export const BEAR_RUN_FRAMES: FrameRect[] = [
  { x: 35,   y: 5,  w: 161, h: 188 },
  { x: 257,  y: 6,  w: 160, h: 187 },
  { x: 478,  y: 0,  w: 161, h: 193 },
  { x: 697,  y: 6,  w: 162, h: 187 },
  { x: 917,  y: 6,  w: 160, h: 187 },
  { x: 1137, y: 6,  w: 161, h: 187 },
]

/** 黑熊 — 咆哮揮爪 3 幀 */
export const BEAR_ATTACK_FRAMES: FrameRect[] = [
  { x: 35,  y: 202, w: 183, h: 196 },
  { x: 257, y: 201, w: 183, h: 197 },
  { x: 478, y: 202, w: 161, h: 196 },
]

/** 哥吉拉 godzilla.png — 騎行 6 幀 */
export const GODZILLA_RUN_FRAMES: FrameRect[] = [
  { x: 7,    y: 7, w: 202, h: 187 },
  { x: 227,  y: 7, w: 202, h: 186 },
  { x: 447,  y: 7, w: 203, h: 187 },
  { x: 669,  y: 7, w: 202, h: 187 },
  { x: 889,  y: 7, w: 201, h: 187 },
  { x: 1108, y: 7, w: 202, h: 186 },
]

/** 哥吉拉 — 咆哮／噴火 3 幀 */
export const GODZILLA_ATTACK_FRAMES: FrameRect[] = [
  { x: 7,   y: 207, w: 213, h: 186 },
  { x: 220, y: 207, w: 220, h: 186 },
  { x: 440, y: 207, w: 220, h: 184 },
]

/** 紅衣小姐 redlady.png — 騎行 6 幀 */
export const REDLADY_RUN_FRAMES: FrameRect[] = [
  { x: 19,   y: 8, w: 190, h: 187 },
  { x: 239,  y: 8, w: 189, h: 187 },
  { x: 458,  y: 8, w: 189, h: 187 },
  { x: 677,  y: 8, w: 189, h: 187 },
  { x: 897,  y: 8, w: 189, h: 187 },
  { x: 1116, y: 8, w: 189, h: 187 },
]

/** 紅衣小姐 — 威脅／回頭／伸手 3 幀 */
export const REDLADY_ATTACK_FRAMES: FrameRect[] = [
  { x: 17,  y: 204, w: 191, h: 189 },
  { x: 237, y: 205, w: 190, h: 188 },
  { x: 458, y: 206, w: 189, h: 187 },
]

/** 跳殭屍 jiangshi.png — 僵硬騎行 6 幀 */
export const JIANGSHI_RUN_FRAMES: FrameRect[] = [
  { x: 23,   y: 7, w: 186, h: 187 },
  { x: 243,  y: 7, w: 186, h: 187 },
  { x: 463,  y: 7, w: 186, h: 187 },
  { x: 683,  y: 7, w: 185, h: 187 },
  { x: 902,  y: 7, w: 186, h: 187 },
  { x: 1123, y: 7, w: 186, h: 187 },
]

/** 跳殭屍 — 張嘴／前傾／符紙 3 幀 */
export const JIANGSHI_ATTACK_FRAMES: FrameRect[] = [
  { x: 23,  y: 208, w: 192, h: 185 },
  { x: 244, y: 207, w: 191, h: 186 },
  { x: 463, y: 205, w: 193, h: 188 },
]

/** 外星人 alien.png — 騎行 6 幀 */
export const ALIEN_RUN_FRAMES: FrameRect[] = [
  { x: 10,   y: 5, w: 198, h: 190 },
  { x: 241,  y: 5, w: 188, h: 191 },
  { x: 461,  y: 5, w: 187, h: 190 },
  { x: 681,  y: 5, w: 187, h: 191 },
  { x: 894,  y: 5, w: 195, h: 190 },
  { x: 1115, y: 5, w: 197, h: 190 },
]

/** 外星人 — 發光眼／伸手 3 幀 */
export const ALIEN_ATTACK_FRAMES: FrameRect[] = [
  { x: 14,  y: 210, w: 203, h: 184 },
  { x: 233, y: 210, w: 206, h: 184 },
  { x: 453, y: 210, w: 207, h: 184 },
]

/** 砂石車 dumptruck.png — 行駛 6 幀 */
export const DUMPTRUCK_RUN_FRAMES: FrameRect[] = [
  { x: 9,    y: 9, w: 210, h: 182 },
  { x: 229,  y: 10, w: 210, h: 180 },
  { x: 448,  y: 9, w: 210, h: 181 },
  { x: 668,  y: 9, w: 209, h: 182 },
  { x: 887,  y: 9, w: 209, h: 181 },
  { x: 1105, y: 9, w: 209, h: 182 },
]

/** 砂石車 — 閃燈／加速 3 幀 */
export const DUMPTRUCK_ATTACK_FRAMES: FrameRect[] = [
  { x: 7,   y: 205, w: 213, h: 186 },
  { x: 228, y: 203, w: 212, h: 188 },
  { x: 447, y: 200, w: 213, h: 191 },
]

/** Foodpanda 外送員 foodpanda.png — 騎行 6 幀 */
export const FOODPANDA_RUN_FRAMES: FrameRect[] = [
  { x: 17,   y: 7, w: 200, h: 188 },
  { x: 237,  y: 7, w: 200, h: 188 },
  { x: 457,  y: 7, w: 199, h: 188 },
  { x: 677,  y: 7, w: 200, h: 188 },
  { x: 897,  y: 7, w: 199, h: 188 },
  { x: 1116, y: 7, w: 200, h: 188 },
]

/** Foodpanda — 回頭／揮手／加速 3 幀 */
export const FOODPANDA_ATTACK_FRAMES: FrameRect[] = [
  { x: 17,  y: 204, w: 199, h: 189 },
  { x: 238, y: 204, w: 199, h: 189 },
  { x: 457, y: 221, w: 200, h: 172 },
]

/** 老太太三輪車 grandma.png — 騎行 6 幀 */
export const GRANDMA_RUN_FRAMES: FrameRect[] = [
  { x: 6,    y: 5, w: 204, h: 190 },
  { x: 227,  y: 5, w: 204, h: 190 },
  { x: 447,  y: 5, w: 205, h: 190 },
  { x: 667,  y: 5, w: 204, h: 190 },
  { x: 888,  y: 5, w: 204, h: 190 },
  { x: 1108, y: 5, w: 205, h: 190 },
]

/** 老太太 — 揮手／猛踩／怒視 3 幀 */
export const GRANDMA_ATTACK_FRAMES: FrameRect[] = [
  { x: 6,   y: 203, w: 204, h: 191 },
  { x: 227, y: 203, w: 204, h: 191 },
  { x: 447, y: 204, w: 205, h: 190 },
]

/** 救護車 ambulance.png — 行駛 6 幀 */
export const AMBULANCE_RUN_FRAMES: FrameRect[] = [
  { x: 14,   y: 33, w: 198, h: 137 },
  { x: 234,  y: 33, w: 200, h: 137 },
  { x: 453,  y: 33, w: 201, h: 137 },
  { x: 675,  y: 32, w: 199, h: 138 },
  { x: 893,  y: 32, w: 201, h: 138 },
  { x: 1115, y: 33, w: 198, h: 136 },
]

/** 救護車 — 喇叭／加速／閃燈 3 幀 */
export const AMBULANCE_ATTACK_FRAMES: FrameRect[] = [
  { x: 11,  y: 213, w: 209, h: 161 },
  { x: 221, y: 238, w: 216, h: 138 },
  { x: 445, y: 199, w: 215, h: 176 },
]

/** 消防車 firetruck.png — 行駛 6 幀 */
export const FIRETRUCK_RUN_FRAMES: FrameRect[] = [
  { x: 15,   y: 41, w: 203, h: 152 },
  { x: 236,  y: 41, w: 203, h: 152 },
  { x: 449,  y: 41, w: 211, h: 152 },
  { x: 677,  y: 41, w: 203, h: 153 },
  { x: 896,  y: 41, w: 202, h: 152 },
  { x: 1115, y: 41, w: 203, h: 152 },
]

/** 消防車 — 噴水／閃燈／衝刺 3 幀 */
export const FIRETRUCK_ATTACK_FRAMES: FrameRect[] = [
  { x: 0,   y: 225, w: 220, h: 167 },
  { x: 220, y: 199, w: 220, h: 193 },
  { x: 440, y: 209, w: 220, h: 183 },
]

/** 比基尼騎手 bikini.png — 騎行 6 幀 */
export const BIKINI_RUN_FRAMES: FrameRect[] = [
  { x:   12, y:   0, w: 207, h: 199 },
  { x:  231, y:   0, w: 207, h: 194 },
  { x:  451, y:   0, w: 206, h: 199 },
  { x:  670, y:   0, w: 207, h: 194 },
  { x:  889, y:   0, w: 207, h: 194 },
  { x: 1109, y:   0, w: 206, h: 194 },
]

/** 比基尼 — 回頭／加速／揮手 3 幀 */
export const BIKINI_ATTACK_FRAMES: FrameRect[] = [
  { x:   12, y: 199, w: 207, h: 195 },
  { x:  231, y: 211, w: 207, h: 183 },
  { x:  450, y: 199, w: 207, h: 195 },
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
      // 柴犬應明顯小於騎士（320）；過大則比例失衡
      displayHeight: 170,
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
      showRuins: false,
      showFarmland: false,
      showMountainWorks: false,
      showFog: false,
      showFireflies: false,
      showNeon: false,
      showFallingLeaves: false,
      showWillOWisp: false,
      showUfoLights: false,
      showDust: false,
      showHazardBeacons: false,
      showUrbanStreet: false,
      showTraditionalAlley: false,
      showHospital: false,
      showFireScene: false,
      showWaterfront: false,
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
      spriteSrc: 'assets/bear.png',
      assetAlias: 'chaser-bear',
      runFrames: BEAR_RUN_FRAMES,
      attackFrames: BEAR_ATTACK_FRAMES,
      // 大於騎士，騎單車黑熊的壓迫感
      displayHeight: 380,
      tint: 0xffffff,
      scaleMul: 1,
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
      showRuins: false,
      showFarmland: false,
      showMountainWorks: false,
      showFog: true,
      showFireflies: true,
      showNeon: false,
      showFallingLeaves: true,
      showWillOWisp: false,
      showUfoLights: false,
      showDust: false,
      showHazardBeacons: false,
      showUrbanStreet: false,
      showTraditionalAlley: false,
      showHospital: false,
      showFireScene: false,
      showWaterfront: false,
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
      spriteSrc: 'assets/godzilla.png',
      assetAlias: 'chaser-godzilla',
      runFrames: GODZILLA_RUN_FRAMES,
      attackFrames: GODZILLA_ATTACK_FRAMES,
      // 哥吉拉明顯高於騎士，製造壓迫
      displayHeight: 400,
      tint: 0xffffff,
      scaleMul: 1,
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
      showRuins: false,
      showFarmland: false,
      showMountainWorks: false,
      showFog: false,
      showFireflies: false,
      showNeon: true,
      showFallingLeaves: false,
      showWillOWisp: false,
      showUfoLights: false,
      showDust: false,
      showHazardBeacons: false,
      showUrbanStreet: false,
      showTraditionalAlley: false,
      showHospital: false,
      showFireScene: false,
      showWaterfront: false,
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
      spriteSrc: 'assets/redlady.png',
      assetAlias: 'chaser-redlady',
      runFrames: REDLADY_RUN_FRAMES,
      attackFrames: REDLADY_ATTACK_FRAMES,
      displayHeight: 300,
      tint: 0xffffff,
      scaleMul: 1,
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
      showRuins: false,
      showFarmland: false,
      showMountainWorks: false,
      showFog: true,
      showFireflies: false,
      showNeon: false,
      showFallingLeaves: false,
      showWillOWisp: true,
      showUfoLights: false,
      showDust: false,
      showHazardBeacons: false,
      showUrbanStreet: false,
      showTraditionalAlley: false,
      showHospital: false,
      showFireScene: false,
      showWaterfront: false,
    },
    behavior: {
      animSpeedMul: 0.95,
      shakeMul: 1.1,
      restVerb: '徘徊',
      returnVerb: '悄然逼近',
    },
  },

  /** 跳殭屍 · 廢棄鄉下／舊墓仔埔 */
  jiangshi: {
    id: 'jiangshi',
    label: '跳殭屍聚落',
    description: '廢棄鄉下夜間 · 跳殭屍騎車追趕',
    chaser: {
      name: '跳殭屍',
      shortName: '殭屍',
      spriteSrc: 'assets/jiangshi.png',
      assetAlias: 'chaser-jiangshi',
      runFrames: JIANGSHI_RUN_FRAMES,
      attackFrames: JIANGSHI_ATTACK_FRAMES,
      displayHeight: 300,
      tint: 0xffffff,
      scaleMul: 1,
    },
    background: {
      sky: 0x060c0e,
      skyHaze: 0x0c1a18,
      farLayer: 0x0a1412,
      midLayer: 0x101c18,
      road: 0x1a1e1c,
      roadEdge: 0x3a4540,
      roadDash: 0x4a5a50,
      roadside: 0x0c1410,
      lamp: 0x8aa898,
      skyAccent: 0x5eead4,
      showMoon: true,
      showStars: true,
      showMountains: false,
      showLamps: false,
      showForest: false,
      showCity: false,
      showCemetery: false,
      showRuins: true,
      showFarmland: false,
      showMountainWorks: false,
      showFog: true,
      showFireflies: false,
      showNeon: false,
      showFallingLeaves: false,
      showWillOWisp: true,
      showUfoLights: false,
      showDust: false,
      showHazardBeacons: false,
      showUrbanStreet: false,
      showTraditionalAlley: false,
      showHospital: false,
      showFireScene: false,
      showWaterfront: false,
    },
    behavior: {
      animSpeedMul: 0.75,
      shakeMul: 1.05,
      restVerb: '僵直',
      returnVerb: '跳近',
    },
  },

  /** 外星人 · 鄉下田野 */
  alien: {
    id: 'alien',
    label: '外星人田野',
    description: '夜間田野 · 外星人騎科幻單車',
    chaser: {
      name: '外星人',
      shortName: '外星人',
      spriteSrc: 'assets/alien.png',
      assetAlias: 'chaser-alien',
      runFrames: ALIEN_RUN_FRAMES,
      attackFrames: ALIEN_ATTACK_FRAMES,
      displayHeight: 290,
      tint: 0xffffff,
      scaleMul: 1,
    },
    background: {
      sky: 0x040818,
      skyHaze: 0x0a1a28,
      farLayer: 0x0a1420,
      midLayer: 0x0c1c18,
      road: 0x1a1c1e,
      roadEdge: 0x3a4a48,
      roadDash: 0x4a8a7a,
      roadside: 0x0a1810,
      lamp: 0x5eead4,
      skyAccent: 0x2dd4bf,
      showMoon: false,
      showStars: true,
      showMountains: true,
      showLamps: false,
      showForest: false,
      showCity: false,
      showCemetery: false,
      showRuins: false,
      showFarmland: true,
      showMountainWorks: false,
      showFog: true,
      showFireflies: false,
      showNeon: false,
      showFallingLeaves: false,
      showWillOWisp: false,
      showUfoLights: true,
      showDust: false,
      showHazardBeacons: false,
      showUrbanStreet: false,
      showTraditionalAlley: false,
      showHospital: false,
      showFireScene: false,
      showWaterfront: false,
    },
    behavior: {
      animSpeedMul: 1.05,
      shakeMul: 0.95,
      restVerb: '掃描',
      returnVerb: '鎖定',
    },
  },

  /** 台灣砂石車 · 山路／工地 */
  dumptruck: {
    id: 'dumptruck',
    label: '砂石車山路',
    description: '夜間山路 · 砂石車追趕',
    chaser: {
      name: '砂石車',
      shortName: '砂石車',
      spriteSrc: 'assets/dumptruck.png',
      assetAlias: 'chaser-dumptruck',
      runFrames: DUMPTRUCK_RUN_FRAMES,
      attackFrames: DUMPTRUCK_ATTACK_FRAMES,
      // 重型砂石車壓過畫面，壓迫感優先
      displayHeight: 520,
      tint: 0xffffff,
      scaleMul: 1,
    },
    background: {
      sky: 0x0a080c,
      skyHaze: 0x1a1210,
      farLayer: 0x141018,
      midLayer: 0x1c1410,
      road: 0x222018,
      roadEdge: 0x5a4a30,
      roadDash: 0xc9a227,
      roadside: 0x1a1208,
      lamp: 0xfbbf24,
      skyAccent: 0xf97316,
      showMoon: false,
      showStars: true,
      showMountains: true,
      showLamps: false,
      showForest: false,
      showCity: false,
      showCemetery: false,
      showRuins: false,
      showFarmland: false,
      showMountainWorks: true,
      showFog: false,
      showFireflies: false,
      showNeon: false,
      showFallingLeaves: false,
      showWillOWisp: false,
      showUfoLights: false,
      showDust: true,
      showHazardBeacons: true,
      showUrbanStreet: false,
      showTraditionalAlley: false,
      showHospital: false,
      showFireScene: false,
      showWaterfront: false,
    },
    behavior: {
      animSpeedMul: 0.8,
      shakeMul: 1.4,
      restVerb: '怠速',
      returnVerb: '加速逼近',
    },
  },

  /** Foodpanda 外送 · 夜間市區 */
  foodpanda: {
    id: 'foodpanda',
    label: '外送市區',
    description: '夜間市區 · Foodpanda 外送員追趕',
    chaser: {
      name: '外送員',
      shortName: '外送',
      spriteSrc: 'assets/foodpanda.png',
      assetAlias: 'chaser-foodpanda',
      runFrames: FOODPANDA_RUN_FRAMES,
      attackFrames: FOODPANDA_ATTACK_FRAMES,
      // 與騎士同級、保溫袋加大存在感
      displayHeight: 360,
      tint: 0xffffff,
      scaleMul: 1,
    },
    background: {
      sky: 0x0c0a14,
      skyHaze: 0x1a1220,
      farLayer: 0x12101c,
      midLayer: 0x1a1628,
      road: 0x1c1c22,
      roadEdge: 0x4a4a55,
      roadDash: 0xc9a040,
      roadside: 0x141418,
      lamp: 0xff8ab8,
      skyAccent: 0xff6b9d,
      showMoon: false,
      showStars: true,
      showMountains: false,
      showLamps: true,
      showForest: false,
      showCity: false,
      showCemetery: false,
      showRuins: false,
      showFarmland: false,
      showMountainWorks: false,
      showFog: false,
      showFireflies: false,
      showNeon: true,
      showFallingLeaves: false,
      showWillOWisp: false,
      showUfoLights: false,
      showDust: false,
      showHazardBeacons: false,
      showUrbanStreet: true,
      showTraditionalAlley: false,
      showHospital: false,
      showFireScene: false,
      showWaterfront: false,
    },
    behavior: {
      animSpeedMul: 1.15,
      shakeMul: 1.0,
      restVerb: '等單',
      returnVerb: '趕單衝刺',
    },
  },

  /** 老太太三輪車 · 傳統巷弄 */
  grandma: {
    id: 'grandma',
    label: '巷弄阿嬤',
    description: '傳統巷弄夜間 · 三輪車老太太追趕',
    chaser: {
      name: '三輪車阿嬤',
      shortName: '阿嬤',
      spriteSrc: 'assets/grandma.png',
      assetAlias: 'chaser-grandma',
      runFrames: GRANDMA_RUN_FRAMES,
      attackFrames: GRANDMA_ATTACK_FRAMES,
      displayHeight: 295,
      tint: 0xffffff,
      scaleMul: 1,
    },
    background: {
      sky: 0x0a0a10,
      skyHaze: 0x1a1410,
      farLayer: 0x12100e,
      midLayer: 0x1c1814,
      road: 0x1e1c18,
      roadEdge: 0x5a4a38,
      roadDash: 0xb8860b,
      roadside: 0x14120e,
      lamp: 0xf0c060,
      skyAccent: 0xe8b84a,
      showMoon: false,
      showStars: true,
      showMountains: false,
      showLamps: true,
      showForest: false,
      showCity: false,
      showCemetery: false,
      showRuins: false,
      showFarmland: false,
      showMountainWorks: false,
      showFog: false,
      showFireflies: false,
      showNeon: false,
      showFallingLeaves: false,
      showWillOWisp: false,
      showUfoLights: false,
      showDust: false,
      showHazardBeacons: false,
      showUrbanStreet: false,
      showTraditionalAlley: true,
      showHospital: false,
      showFireScene: false,
      showWaterfront: false,
    },
    behavior: {
      animSpeedMul: 0.7,
      shakeMul: 0.9,
      restVerb: '歇腳',
      returnVerb: '緊跟不放',
    },
  },

  /** 救護車 · 醫院／急診道 */
  ambulance: {
    id: 'ambulance',
    label: '救護車',
    description: '夜間市區 · 救護車追趕',
    chaser: {
      name: '救護車',
      shortName: '救護車',
      spriteSrc: 'assets/ambulance.png',
      assetAlias: 'chaser-ambulance',
      runFrames: AMBULANCE_RUN_FRAMES,
      attackFrames: AMBULANCE_ATTACK_FRAMES,
      displayHeight: 400,
      tint: 0xffffff,
      scaleMul: 1,
    },
    background: {
      sky: 0x0a0c12,
      skyHaze: 0x141820,
      farLayer: 0x101418,
      midLayer: 0x181c22,
      road: 0x1e2024,
      roadEdge: 0x555a62,
      roadDash: 0xffffff,
      roadside: 0x141618,
      lamp: 0xef4444,
      skyAccent: 0x60a5fa,
      showMoon: false,
      showStars: true,
      showMountains: false,
      showLamps: true,
      showForest: false,
      showCity: false,
      showCemetery: false,
      showRuins: false,
      showFarmland: false,
      showMountainWorks: false,
      showFog: false,
      showFireflies: false,
      showNeon: false,
      showFallingLeaves: false,
      showWillOWisp: false,
      showUfoLights: false,
      showDust: false,
      showHazardBeacons: false,
      showUrbanStreet: false,
      showTraditionalAlley: false,
      showHospital: true,
      showFireScene: false,
      showWaterfront: false,
    },
    behavior: {
      animSpeedMul: 1.2,
      shakeMul: 1.15,
      restVerb: '待命',
      returnVerb: '緊急出動',
    },
  },

  /** 消防車 · 火災現場感 */
  firetruck: {
    id: 'firetruck',
    label: '消防車',
    description: '夜間火場 · 消防車追趕',
    chaser: {
      name: '消防車',
      shortName: '消防車',
      spriteSrc: 'assets/firetruck.png',
      assetAlias: 'chaser-firetruck',
      runFrames: FIRETRUCK_RUN_FRAMES,
      attackFrames: FIRETRUCK_ATTACK_FRAMES,
      displayHeight: 440,
      tint: 0xffffff,
      scaleMul: 1,
    },
    background: {
      sky: 0x0c0808,
      skyHaze: 0x2a1208,
      farLayer: 0x1a0c0a,
      midLayer: 0x241410,
      road: 0x1c1816,
      roadEdge: 0x5a4030,
      roadDash: 0xfbbf24,
      roadside: 0x14100c,
      lamp: 0xf97316,
      skyAccent: 0xef4444,
      showMoon: false,
      showStars: true,
      showMountains: false,
      showLamps: false,
      showForest: false,
      showCity: false,
      showCemetery: false,
      showRuins: false,
      showFarmland: false,
      showMountainWorks: false,
      showFog: true,
      showFireflies: false,
      showNeon: false,
      showFallingLeaves: false,
      showWillOWisp: false,
      showUfoLights: false,
      showDust: true,
      showHazardBeacons: false,
      showUrbanStreet: false,
      showTraditionalAlley: false,
      showHospital: false,
      showFireScene: true,
      showWaterfront: false,
    },
    behavior: {
      animSpeedMul: 0.95,
      shakeMul: 1.35,
      restVerb: '整裝',
      returnVerb: '破火前衝',
    },
  },

  /** 比基尼騎手 · 夜間海邊／河岸 */
  bikini: {
    id: 'bikini',
    label: '海邊騎行',
    description: '夜間河岸 · 比基尼美女騎單車',
    chaser: {
      name: '比基尼騎手',
      shortName: '騎手',
      spriteSrc: 'assets/bikini.png',
      assetAlias: 'chaser-bikini',
      runFrames: BIKINI_RUN_FRAMES,
      attackFrames: BIKINI_ATTACK_FRAMES,
      // 女騎士與主角同量級，略大一點增加逼近感
      displayHeight: 340,
      tint: 0xffffff,
      scaleMul: 1,
    },
    background: {
      sky: 0x060a18,
      skyHaze: 0x0c1428,
      farLayer: 0x0a1220,
      midLayer: 0x10182a,
      road: 0x1a1e24,
      roadEdge: 0x4a5560,
      roadDash: 0xd4c4a0,
      roadside: 0x0e1418,
      lamp: 0xf0c878,
      skyAccent: 0x60a5fa,
      showMoon: true,
      showStars: true,
      showMountains: false,
      showLamps: true,
      showForest: false,
      showCity: false,
      showCemetery: false,
      showRuins: false,
      showFarmland: false,
      showMountainWorks: false,
      showFog: false,
      showFireflies: false,
      showNeon: false,
      showFallingLeaves: false,
      showWillOWisp: false,
      showUfoLights: false,
      showDust: false,
      showHazardBeacons: false,
      showUrbanStreet: false,
      showTraditionalAlley: false,
      showHospital: false,
      showFireScene: false,
      showWaterfront: true,
    },
    behavior: {
      animSpeedMul: 1.1,
      shakeMul: 0.85,
      restVerb: '歇腳',
      returnVerb: '追上來了',
    },
  },
}

export const THEME_LIST: ChaseTheme[] = Object.values(THEMES)

/**
 * 取得主題定義。
 * @param style 視覺風格；retro 時改寫 sprite 路徑、幀格與 displayHeight。
 *              玩法／背景旗標／行為倍率不變。
 */
export function getTheme(
  id: string | null | undefined,
  style: VisualStyle = DEFAULT_VISUAL_STYLE,
): ChaseTheme {
  const base = (id && THEMES[id]) ? THEMES[id] : THEMES[DEFAULT_THEME_ID]
  if (style === 'modern') return base

  // 復古：路徑 + 像素幀 + 整數倍顯示高；背景／行為沿用
  return {
    ...base,
    chaser: {
      ...base.chaser,
      spriteSrc: chaserSpriteSrc('retro', base.id, base.chaser.spriteSrc),
      assetAlias: styleAssetAlias('retro', base.chaser.assetAlias),
      runFrames: RETRO_RUN_FRAMES,
      attackFrames: RETRO_ATTACK_FRAMES,
      displayHeight: retroChaserDisplayHeight(base.id),
      scaleMul: 1,
    },
  }
}

export function resolveThemeId(raw: string | null | undefined): string {
  return getTheme(raw, 'modern').id
}

export function isThemeId(id: string): boolean {
  return id in THEMES
}
