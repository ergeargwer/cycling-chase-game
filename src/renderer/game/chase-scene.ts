// 追逐遊戲主場景 — PixiJS v8
// 可變坡度、路線剖面、可切換追逐者主題（Theme System）
//
// 新增主題：編輯 themes.ts 的 THEMES，並在下方 _buildBackground
// 若有新背景類型再加 case。建構時傳 themeId，或 setTheme() 後 load()。

import * as PIXI from 'pixi.js'
import { GameState } from './game-state'
import { GameHud } from './hud'
import { Theme, textStyle } from '../ui/theme'
import {
  getTheme,
  resolveThemeId,
  type ChaseTheme,
  type FrameRect,
} from './themes'

// ── 地形資料 ─────────────────────────────────────────────

interface TerrainSegment {
  start: number
  end: number
  h0: number
  h1: number
  label: string
}

const TERRAIN_PROFILE: TerrainSegment[] = [
  { start: 0.00, end: 0.20, h0: 0.28, h1: 0.28, label: '平路' },
  { start: 0.20, end: 0.40, h0: 0.28, h1: 0.55, label: '緩上坡' },
  { start: 0.40, end: 0.55, h0: 0.55, h1: 0.92, label: '陡上坡' },
  { start: 0.55, end: 0.75, h0: 0.92, h1: 0.22, label: '下坡' },
  { start: 0.75, end: 1.00, h0: 0.22, h1: 0.26, label: '平路' },
]

const TERRAIN_SCREEN_SPAN = 0.10
const TERRAIN_MAX_ELEV_PX = 96
const FREE_RIDE_TERRAIN_CYCLE_SEC = 20 * 60
const MINIMAP_W = 200
const MINIMAP_H = 58
const MINIMAP_PAD_X = 10

const RIDER_NORMAL_FRAMES: FrameRect[] = [
  { x: 14,   y: 61,  w: 228, h: 232 },
  { x: 270,  y: 61,  w: 227, h: 232 },
  { x: 526,  y: 61,  w: 228, h: 232 },
  { x: 782,  y: 61,  w: 228, h: 232 },
  { x: 1038, y: 61,  w: 228, h: 232 },
  { x: 1295, y: 61,  w: 227, h: 231 },
]
const RIDER_NERVOUS_FRAMES: FrameRect[] = [
  { x: 14,   y: 361, w: 227, h: 232 },
  { x: 270,  y: 361, w: 227, h: 232 },
  { x: 526,  y: 361, w: 228, h: 232 },
  { x: 782,  y: 361, w: 227, h: 232 },
  { x: 1038, y: 361, w: 228, h: 232 },
  { x: 1294, y: 361, w: 228, h: 232 },
]

const SWEAT_W = 176, SWEAT_H = 192, SWEAT_COLS = 8
const RIDER_DISPLAY_H = 320
const ROAD_TOP_RATIO  = 0.60
const GROUND_IN_ROAD  = 0.50
const RIDER_X_RATIO   = 0.78

interface SweatParticle {
  sprite: PIXI.Sprite
  vx: number; vy: number
  life: number; maxLife: number
}

interface FxParticle {
  g: PIXI.Graphics
  vx: number
  vy: number
  life: number
  maxLife: number
  baseAlpha: number
}

export class ChaseScene extends PIXI.Container {
  private app:         PIXI.Application
  private state:       GameState
  private chaseTheme:  ChaseTheme
  private elapsed:     number = 0
  private roadOffset:  number = 0
  private chaserScreenX: number = 0

  private bgLayer:   PIXI.Container = new PIXI.Container()
  private midLayer:  PIXI.Container = new PIXI.Container()
  private roadLayer: PIXI.Container = new PIXI.Container()
  private gameLayer: PIXI.Container = new PIXI.Container()
  private fxLayer:   PIXI.Container = new PIXI.Container()
  private hudLayer:  PIXI.Container = new PIXI.Container()

  private roadBody!:   PIXI.Graphics
  private roadEdge!:   PIXI.Graphics
  private roadShade!:  PIXI.Graphics
  private roadGrass!:  PIXI.Graphics
  private roadDashes:  PIXI.Graphics[] = []
  private lampSprites: PIXI.Container[] = []
  private lampXs:      number[]  = []

  private riderSprite!:      PIXI.AnimatedSprite
  private riderNervSprite!:  PIXI.AnimatedSprite
  private chaserRunSprite!:  PIXI.AnimatedSprite
  private chaserAtkSprite!:  PIXI.AnimatedSprite

  private sweatParticles: SweatParticle[] = []
  private sweatTimer:     number = 0
  private sweatTextures:  PIXI.Texture[] = []

  private ambientParticles: FxParticle[] = []
  private leafParticles:    FxParticle[] = []

  private hud!: GameHud
  private dangerOverlay!: PIXI.Graphics
  private vignette!: PIXI.Graphics
  private shakeAmount:    number = 0
  private dangerAlpha:    number = 0
  private riderBaseScale: number = 1
  private chaserBaseScale: number = 1

  private minimapRoot!:   PIXI.Container
  private minimapBg!:     PIXI.Graphics
  private minimapLine!:   PIXI.Graphics
  private minimapFill!:   PIXI.Graphics
  private minimapMarker!: PIXI.Graphics
  private minimapLabel!:  PIXI.Text
  private minimapGrade!:  PIXI.Text

  private moonGfx: PIXI.Graphics | null = null
  private stars: Array<{ g: PIXI.Graphics; baseAlpha: number; phase: number }> = []

  private onQuit?: () => void
  private onRestart?: () => void
  /** 已載入過的素材 alias，避免重複 load */
  private loadedAliases = new Set<string>()
  private ready = false

  constructor(
    app: PIXI.Application,
    state: GameState,
    handlers: { onQuit?: () => void; onRestart?: () => void } = {},
    themeId: string = 'shiba',
  ) {
    super()
    this.app   = app
    this.state = state
    this.chaseTheme = getTheme(themeId)
    this.onQuit = handlers.onQuit
    this.onRestart = handlers.onRestart
    this.addChild(
      this.bgLayer, this.midLayer, this.roadLayer,
      this.gameLayer, this.fxLayer, this.hudLayer,
    )
  }

  get themeId(): string { return this.chaseTheme.id }
  get theme(): ChaseTheme { return this.chaseTheme }

  /** 切換主題（需再呼叫 load() 才重建場景） */
  setTheme(themeId: string) {
    this.chaseTheme = getTheme(themeId)
  }

  async load() {
    this.ready = false
    await this._ensureAssets()

    this._clearLayers()
    this._buildBackground()
    this._buildRoad()
    this._buildLamps()
    this._buildRider()
    this._buildChaser()
    this._buildSweat()
    this._buildVignette()
    this._buildHud()
    this._buildTerrainMinimap()
    this._buildDangerOverlay()

    const progress = this._getWorkoutProgress()
    this._redrawRoadSurface(progress)
    this.chaserScreenX = this._calcTargetChaserX()
    this._updateTerrainMinimap(progress)
    this.ready = true
  }

  private async _ensureAssets() {
    const chaser = this.chaseTheme.chaser
    const jobs: { alias: string; src: string }[] = []

    if (!this.loadedAliases.has('rider')) {
      jobs.push({ alias: 'rider', src: 'assets/rider.png' })
    }
    if (!this.loadedAliases.has('sweat')) {
      jobs.push({ alias: 'sweat', src: 'assets/sweat.png' })
    }
    if (!this.loadedAliases.has(chaser.assetAlias)) {
      jobs.push({ alias: chaser.assetAlias, src: chaser.spriteSrc })
    }

    if (jobs.length > 0) {
      await PIXI.Assets.load(jobs)
      for (const j of jobs) this.loadedAliases.add(j.alias)
    }
  }

  private _clearLayers() {
    for (const layer of [
      this.bgLayer, this.midLayer, this.roadLayer,
      this.gameLayer, this.fxLayer, this.hudLayer,
    ]) {
      layer.removeChildren()
    }
    this.roadDashes = []
    this.lampSprites = []
    this.lampXs = []
    this.sweatParticles = []
    this.ambientParticles = []
    this.leafParticles = []
    this.stars = []
    this.moonGfx = null
  }

  private _riderX(): number {
    return this.app.screen.width * RIDER_X_RATIO
  }

  private _roadTopBase(): number {
    return this.app.screen.height * ROAD_TOP_RATIO
  }

  private _baseGroundY(): number {
    const H = this.app.screen.height
    const roadH = H * (1 - ROAD_TOP_RATIO)
    return this._roadTopBase() + roadH * GROUND_IN_ROAD
  }

  private _getWorkoutProgress(): number {
    const finite = this.state.plan.segments.filter(s => s.durationMin < 999)
    const totalMin = finite.reduce((a, s) => a + s.durationMin, 0)
    if (totalMin <= 0) {
      const t = this.state.totalElapsedSec % FREE_RIDE_TERRAIN_CYCLE_SEC
      return t / FREE_RIDE_TERRAIN_CYCLE_SEC
    }
    return Math.max(0, Math.min(1, this.state.totalElapsedSec / (totalMin * 60)))
  }

  private _smoothstep(t: number): number {
    const x = Math.max(0, Math.min(1, t))
    return x * x * (3 - 2 * x)
  }

  private _getTerrainHeight(progress: number): number {
    const p = Math.max(0, Math.min(1, progress))
    const segs = TERRAIN_PROFILE
    if (p <= segs[0].start) return segs[0].h0
    if (p >= segs[segs.length - 1].end) return segs[segs.length - 1].h1

    for (const seg of segs) {
      if (p >= seg.start && p <= seg.end) {
        const t = (p - seg.start) / Math.max(1e-6, seg.end - seg.start)
        const e = this._smoothstep(t)
        return seg.h0 + (seg.h1 - seg.h0) * e
      }
    }
    return segs[segs.length - 1].h1
  }

  private _getTerrainLabel(progress: number): string {
    const p = Math.max(0, Math.min(1, progress))
    for (const seg of TERRAIN_PROFILE) {
      if (p >= seg.start && p <= seg.end) return seg.label
    }
    return TERRAIN_PROFILE[TERRAIN_PROFILE.length - 1].label
  }

  private _getTerrainGrade(progress: number): number {
    const eps = 0.008
    const h0 = this._getTerrainHeight(progress - eps)
    const h1 = this._getTerrainHeight(progress + eps)
    return (h1 - h0) / (2 * eps)
  }

  private _progressAtScreenX(screenX: number): number {
    const W = this.app.screen.width
    const riderX = this._riderX()
    const base = this._getWorkoutProgress()
    return Math.max(0, Math.min(1,
      base + ((screenX - riderX) / Math.max(1, W)) * TERRAIN_SCREEN_SPAN))
  }

  private _groundYAt(screenX: number): number {
    const elev = this._getTerrainHeight(this._progressAtScreenX(screenX))
    return this._baseGroundY() - elev * TERRAIN_MAX_ELEV_PX
  }

  private _groundY(): number {
    return this._groundYAt(this._riderX())
  }

  private _chaserDisplayH(): number {
    return this.chaseTheme.chaser.displayHeight * this.chaseTheme.chaser.scaleMul
  }

  // ── 背景（依主題）─────────────────────────────────────

  private _buildBackground() {
    const bg = this.chaseTheme.background
    const W = this.app.screen.width
    const H = this.app.screen.height
    const gY = H * 0.60

    const sky = new PIXI.Graphics()
    sky.rect(0, 0, W, gY).fill({ color: bg.sky })
    this.bgLayer.addChild(sky)

    const haze = new PIXI.Graphics()
    for (let i = 0; i < 8; i++) {
      const y = (gY / 8) * i
      const a = 0.04 * (1 - i / 8)
      haze.rect(0, y, W, gY / 8 + 1).fill({ color: bg.skyHaze, alpha: a })
    }
    this.bgLayer.addChild(haze)

    if (bg.showMoon) this._buildMoon(W, H, bg.sky, bg.skyAccent)
    if (bg.showStars) this._buildStars(W, gY)
    if (bg.showMountains) this._buildMountains(W, H, gY, bg.farLayer, bg.midLayer)
    if (bg.showForest) this._buildForest(W, H, gY, bg)
    if (bg.showCity) this._buildCity(W, H, gY, bg)
    if (bg.showCemetery) this._buildCemetery(W, H, gY, bg)
    if (bg.showRuins) this._buildRuins(W, H, gY, bg)
    if (bg.showFarmland) this._buildFarmland(W, H, gY, bg)
    if (bg.showMountainWorks) this._buildMountainWorks(W, H, gY, bg)
    if (bg.showUrbanStreet) this._buildUrbanStreet(W, H, gY, bg)
    if (bg.showTraditionalAlley) this._buildTraditionalAlley(W, H, gY, bg)
    if (bg.showHospital) this._buildHospital(W, H, gY, bg)
    if (bg.showFireScene) this._buildFireScene(W, H, gY, bg)
    if (bg.showWaterfront) this._buildWaterfront(W, H, gY, bg)
    if (bg.showFog) this._buildFog(W, H, gY)
    if (bg.showFireflies) this._initFireflies(W, gY)
    if (bg.showWillOWisp) this._initWillOWisps(W, gY, bg.skyAccent)
    if (bg.showUfoLights) this._initUfoLights(W, gY, bg.skyAccent)
    if (bg.showDust) this._initDust(W, gY)
    if (bg.showHazardBeacons) this._buildHazardBeacons(W, gY, bg)
    if (bg.showFallingLeaves) this._initLeaves(W, gY)
    if (bg.showNeon && (bg.showCity || bg.showUrbanStreet)) {
      this._buildNeonAccents(W, H, gY, bg)
    }
  }

  private _buildMoon(W: number, H: number, skyColor: number, accent: number) {
    this.moonGfx = new PIXI.Graphics()
    for (let r = 55; r > 22; r -= 6) {
      this.moonGfx.circle(0, 0, r).fill({ color: accent, alpha: (55 - r) / 55 * 0.05 })
    }
    this.moonGfx.circle(0, 0, 22).fill({ color: accent })
    const moonMask = new PIXI.Graphics()
    moonMask.circle(12, -4, 18).fill({ color: skyColor })
    this.moonGfx.addChild(moonMask)
    this.moonGfx.x = W * 0.85
    this.moonGfx.y = H * 0.10
    this.bgLayer.addChild(this.moonGfx)
  }

  private _buildStars(W: number, gY: number) {
    for (let i = 0; i < 55; i++) {
      const g = new PIXI.Graphics()
      const r = Math.random() * 1.4 + 0.4
      g.circle(0, 0, r).fill({ color: 0xffffff })
      g.x = Math.random() * W
      g.y = Math.random() * gY * 0.88
      g.alpha = Math.random() * 0.6 + 0.2
      this.bgLayer.addChild(g)
      this.stars.push({ g, baseAlpha: g.alpha, phase: Math.random() * Math.PI * 2 })
    }
  }

  private _buildMountains(W: number, H: number, gY: number, far: number, mid: number) {
    const mtn1 = new PIXI.Graphics()
    mtn1.poly([
      0, gY,
      W*0.06, H*0.38, W*0.16, H*0.26, W*0.26, H*0.41,
      W*0.37, H*0.20, W*0.47, H*0.34, W*0.58, H*0.23,
      W*0.68, H*0.37, W*0.78, H*0.28, W*0.88, H*0.40,
      W, H*0.35, W, gY,
    ]).fill({ color: far })
    this.bgLayer.addChild(mtn1)

    const mtn2 = new PIXI.Graphics()
    mtn2.poly([
      0, gY,
      W*0.08, H*0.44, W*0.20, H*0.35, W*0.32, H*0.46,
      W*0.42, H*0.32, W*0.55, H*0.44, W*0.65, H*0.36,
      W*0.78, H*0.48, W*0.88, H*0.38, W, H*0.52, W, gY,
    ]).fill({ color: mid })
    this.bgLayer.addChild(mtn2)
  }

  /** 森林：多層樹剪影 */
  private _buildForest(W: number, H: number, gY: number, bg: ChaseTheme['background']) {
    // 遠層矮樹叢
    const far = new PIXI.Graphics()
    far.rect(0, gY - 40, W, 40).fill({ color: bg.farLayer, alpha: 0.9 })
    for (let x = -20; x < W + 40; x += 28 + Math.random() * 20) {
      const h = 50 + Math.random() * 70
      this._drawTree(far, x, gY, 18 + Math.random() * 14, h, bg.farLayer, 0.95)
    }
    this.bgLayer.addChild(far)

    // 中層較高樹木
    const mid = new PIXI.Graphics()
    for (let x = -30; x < W + 50; x += 55 + Math.random() * 40) {
      const h = 90 + Math.random() * 120
      this._drawTree(mid, x, gY + 4, 22 + Math.random() * 18, h, bg.midLayer, 1)
    }
    this.midLayer.addChild(mid)
  }

  private _drawTree(
    g: PIXI.Graphics,
    x: number, groundY: number,
    trunkW: number, height: number,
    color: number, alpha: number,
  ) {
    const trunkH = height * 0.28
    g.rect(x - trunkW * 0.18, groundY - trunkH, trunkW * 0.36, trunkH)
      .fill({ color, alpha })
    // 三層三角樹冠
    const crownBase = groundY - trunkH + 8
    for (let i = 0; i < 3; i++) {
      const cy = crownBase - i * height * 0.22
      const hw = trunkW * (1.35 - i * 0.28)
      const ch = height * 0.28
      g.poly([x, cy - ch, x - hw, cy, x + hw, cy]).fill({ color, alpha })
    }
  }

  /** 城市：摩天樓剪影 + 窗燈 */
  private _buildCity(W: number, H: number, gY: number, bg: ChaseTheme['background']) {
    const skyline = new PIXI.Graphics()
    let x = -10
    while (x < W + 40) {
      const bw = 28 + Math.random() * 52
      const bh = 60 + Math.random() * (gY * 0.72)
      const bx = x
      skyline.rect(bx, gY - bh, bw, bh).fill({ color: bg.farLayer, alpha: 0.98 })
      // 頂部天線／水塔
      if (Math.random() > 0.55) {
        skyline.rect(bx + bw * 0.4, gY - bh - 14, 2, 14).fill({ color: bg.midLayer })
      }
      // 窗燈光
      const cols = Math.max(2, Math.floor(bw / 10))
      const rows = Math.max(3, Math.floor(bh / 14))
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > 0.55) {
            const wx = bx + 4 + c * (bw - 8) / cols
            const wy = gY - bh + 8 + r * (bh - 12) / rows
            const lit = Math.random() > 0.35
            skyline.rect(wx, wy, 3, 4).fill({
              color: lit ? (Math.random() > 0.7 ? bg.skyAccent : 0xffe08a) : 0x1a1a28,
              alpha: lit ? 0.55 + Math.random() * 0.4 : 0.25,
            })
          }
        }
      }
      x += bw + 4 + Math.random() * 12
    }
    this.bgLayer.addChild(skyline)

    // 中景較矮樓列
    const front = new PIXI.Graphics()
    x = -20
    while (x < W + 30) {
      const bw = 36 + Math.random() * 40
      const bh = 40 + Math.random() * 70
      front.rect(x, gY - bh + 6, bw, bh).fill({ color: bg.midLayer, alpha: 0.92 })
      x += bw + 6
    }
    this.midLayer.addChild(front)
  }

  private _buildNeonAccents(W: number, H: number, gY: number, bg: ChaseTheme['background']) {
    const neon = new PIXI.Graphics()
    const colors = [bg.lamp, bg.skyAccent, 0xa78bfa, 0x22d3ee]
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * W
      const y = gY * 0.25 + Math.random() * gY * 0.55
      const c = colors[i % colors.length]
      for (let r = 10; r > 0; r -= 3) {
        neon.circle(x, y, r).fill({ color: c, alpha: (10 - r) / 10 * 0.12 })
      }
      neon.circle(x, y, 1.5).fill({ color: c, alpha: 0.85 })
    }
    // 地平霓虹反射
    neon.rect(0, gY - 8, W, 6).fill({ color: bg.lamp, alpha: 0.06 })
    this.bgLayer.addChild(neon)
  }

  private _buildFog(W: number, H: number, gY: number) {
    const fog = new PIXI.Graphics()
    const isGrave = this.chaseTheme.background.showCemetery
    const fogColor = isGrave ? 0x8aa898 : 0xa8c4b0
    for (let i = 0; i < 5; i++) {
      const y = gY - 30 - i * 18
      fog.ellipse(W * (0.15 + i * 0.18), y, W * 0.35, 22 + i * 4)
        .fill({ color: fogColor, alpha: (isGrave ? 0.05 : 0.04) + i * 0.01 })
    }
    this.midLayer.addChild(fog)
  }

  /**
   * 台灣風格夜間墓地（陰森但不血腥）：
   * 稀疏陰森樹、墓碑、金紙堆、香爐／香燭光、薄霧與鬼火另建。
   */
  private _buildCemetery(W: number, H: number, gY: number, bg: ChaseTheme['background']) {
    // 遠景：稀疏扭曲樹剪影
    const trees = new PIXI.Graphics()
    for (let i = 0; i < 7; i++) {
      const x = (W / 7) * i + 20 + Math.random() * 30
      const h = 70 + Math.random() * 90
      // 細長樹幹
      trees.rect(x - 3, gY - h * 0.45, 6, h * 0.45).fill({ color: bg.farLayer, alpha: 0.95 })
      // 稀疏枝椏
      trees.moveTo(x, gY - h * 0.4).lineTo(x - 28, gY - h * 0.55)
        .stroke({ color: bg.farLayer, width: 2.5, alpha: 0.9 })
      trees.moveTo(x, gY - h * 0.5).lineTo(x + 32, gY - h * 0.65)
        .stroke({ color: bg.farLayer, width: 2.5, alpha: 0.9 })
      trees.moveTo(x, gY - h * 0.55).lineTo(x - 12, gY - h * 0.75)
        .stroke({ color: bg.midLayer, width: 2, alpha: 0.85 })
      // 小葉團
      trees.circle(x - 26, gY - h * 0.55, 8).fill({ color: bg.farLayer, alpha: 0.7 })
      trees.circle(x + 30, gY - h * 0.65, 10).fill({ color: bg.farLayer, alpha: 0.65 })
    }
    this.bgLayer.addChild(trees)

    // 中景：墓碑群
    const graves = new PIXI.Graphics()
    let gx = 30
    while (gx < W - 20) {
      const bw = 18 + Math.random() * 22
      const bh = 28 + Math.random() * 36
      const tilt = (Math.random() - 0.5) * 0.18
      const baseY = gY + 2
      // 碑座
      graves.rect(gx - 4, baseY - 6, bw + 8, 6).fill({ color: bg.midLayer, alpha: 0.9 })
      // 碑身（簡易旋轉以模擬傾斜）
      const topY = baseY - 6 - bh
      const midX = gx + bw / 2
      const ox = Math.sin(tilt) * bh * 0.15
      // 圓頂或方頂
      if (Math.random() > 0.45) {
        graves.roundRect(gx + ox * 0.3, topY, bw, bh, 4)
          .fill({ color: bg.midLayer, alpha: 0.92 })
      } else {
        graves.poly([
          gx + ox, baseY - 6,
          gx + ox * 0.5, topY + 8,
          midX + ox, topY,
          gx + bw - ox * 0.5, topY + 8,
          gx + bw - ox, baseY - 6,
        ]).fill({ color: bg.midLayer, alpha: 0.92 })
      }
      // 碑面細線（忌諱符號感，僅裝飾）
      graves.rect(gx + bw * 0.35 + ox * 0.2, topY + bh * 0.35, bw * 0.3, 2)
        .fill({ color: 0x2a3530, alpha: 0.5 })

      // 偶有金紙堆（橙黃小堆）
      if (Math.random() > 0.55) {
        const px = gx + bw + 6
        graves.ellipse(px, baseY - 3, 10, 4).fill({ color: 0xc9a227, alpha: 0.55 })
        graves.ellipse(px + 4, baseY - 5, 6, 3).fill({ color: 0xe8c547, alpha: 0.4 })
        graves.ellipse(px - 3, baseY - 4, 5, 2.5).fill({ color: 0xb8860b, alpha: 0.45 })
      }

      // 香爐 + 香燭光
      if (Math.random() > 0.5) {
        const cx = gx + bw / 2
        graves.roundRect(cx - 6, baseY - 10, 12, 6, 2).fill({ color: 0x3a3028, alpha: 0.85 })
        // 三炷香（細線 + 頂端暖光）
        for (let k = -1; k <= 1; k++) {
          const ix = cx + k * 3
          graves.rect(ix - 0.5, baseY - 22, 1, 12).fill({ color: 0x8b7355, alpha: 0.8 })
          graves.circle(ix, baseY - 23, 1.8).fill({ color: 0xffaa44, alpha: 0.55 })
          for (let r = 6; r > 0; r -= 2) {
            graves.circle(ix, baseY - 23, r)
              .fill({ color: 0xff8833, alpha: (6 - r) / 6 * 0.06 })
          }
        }
      }

      gx += bw + 28 + Math.random() * 40
    }
    this.midLayer.addChild(graves)

    // 近景草地／陰濕邊
    const verge = new PIXI.Graphics()
    verge.rect(0, gY - 4, W, 8).fill({ color: bg.roadside, alpha: 0.5 })
    this.midLayer.addChild(verge)
  }

  /** 淡藍綠鬼火：緩慢飄動的小光點（運動遊戲向，不恐怖） */
  private _initWillOWisps(W: number, gY: number, accent: number) {
    for (let i = 0; i < 16; i++) {
      const g = new PIXI.Graphics()
      const core = accent
      for (let r = 7; r > 0; r -= 2) {
        g.circle(0, 0, r).fill({ color: core, alpha: (7 - r) / 7 * 0.12 })
      }
      g.circle(0, 0, 1.4).fill({ color: 0xd1fae5, alpha: 0.85 })
      g.x = Math.random() * W
      g.y = gY * 0.4 + Math.random() * gY * 0.5
      g.alpha = 0.45 + Math.random() * 0.4
      this.midLayer.addChild(g)
      this.ambientParticles.push({
        g,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 8,
        life: 4 + Math.random() * 6,
        maxLife: 6,
        baseAlpha: g.alpha,
      })
    }
  }

  /**
   * 廢棄鄉下聚落（跳殭屍）：三合院剪影、枯樹、傾斜舊碑、青灰夜色。
   */
  private _buildRuins(W: number, H: number, gY: number, bg: ChaseTheme['background']) {
    const far = new PIXI.Graphics()
    // 枯樹
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * (W / 5.5) + Math.random() * 30
      const h = 55 + Math.random() * 70
      far.rect(x - 2, gY - h * 0.5, 4, h * 0.5).fill({ color: bg.farLayer, alpha: 0.95 })
      far.moveTo(x, gY - h * 0.45).lineTo(x - 22, gY - h * 0.6)
        .stroke({ color: bg.farLayer, width: 2, alpha: 0.9 })
      far.moveTo(x, gY - h * 0.5).lineTo(x + 26, gY - h * 0.7)
        .stroke({ color: bg.farLayer, width: 2, alpha: 0.9 })
    }
    this.bgLayer.addChild(far)

    const mid = new PIXI.Graphics()
    // 三合院簡化剪影：中堂 + 左右廂
    const baseX = W * 0.12
    const roofY = gY - 70
    mid.rect(baseX, roofY + 20, 120, 50).fill({ color: bg.midLayer, alpha: 0.95 })
    mid.poly([baseX - 8, roofY + 22, baseX + 60, roofY, baseX + 128, roofY + 22])
      .fill({ color: bg.midLayer, alpha: 0.98 })
    mid.rect(baseX - 40, roofY + 30, 36, 40).fill({ color: bg.farLayer, alpha: 0.9 })
    mid.rect(baseX + 124, roofY + 30, 36, 40).fill({ color: bg.farLayer, alpha: 0.9 })
    // 另一組較遠廢屋
    const bx2 = W * 0.62
    mid.rect(bx2, gY - 48, 90, 48).fill({ color: bg.midLayer, alpha: 0.85 })
    mid.poly([bx2 - 4, gY - 46, bx2 + 45, gY - 68, bx2 + 94, gY - 46])
      .fill({ color: bg.midLayer, alpha: 0.9 })
    // 傾斜舊墓碑點綴
    for (let i = 0; i < 5; i++) {
      const gx = 80 + i * (W / 5.2)
      const bh = 22 + Math.random() * 18
      const tilt = (Math.random() - 0.5) * 12
      mid.roundRect(gx + tilt * 0.2, gY - bh, 14, bh, 2)
        .fill({ color: bg.midLayer, alpha: 0.75 })
    }
    this.midLayer.addChild(mid)
  }

  /**
   * 夜間田野（外星人）：稻田線條、遠處山、麥田圈痕跡、異常綠霧。
   */
  private _buildFarmland(W: number, H: number, gY: number, bg: ChaseTheme['background']) {
    const fields = new PIXI.Graphics()
    // 稻田橫線層次
    for (let i = 0; i < 8; i++) {
      const y = gY - 8 - i * 6
      const a = 0.12 + i * 0.03
      fields.rect(0, y, W, 3).fill({ color: bg.midLayer, alpha: a })
      // 稀疏稻叢剪影
      for (let x = i * 17; x < W; x += 28 + (i % 3) * 6) {
        fields.rect(x, y - 4, 2, 5).fill({ color: bg.farLayer, alpha: 0.35 })
      }
    }
    // 麥田圈：兩個橢圓環
    const cx = W * 0.35
    const cy = gY - 28
    for (const [rx, ry, a] of [[90, 18, 0.18], [50, 10, 0.22]] as const) {
      fields.ellipse(cx, cy, rx, ry).stroke({ color: bg.skyAccent, width: 2, alpha: a })
    }
    fields.ellipse(W * 0.72, gY - 22, 40, 9).stroke({ color: bg.skyAccent, width: 1.5, alpha: 0.15 })
    this.midLayer.addChild(fields)
  }

  /**
   * 夜間山路／工地便道（砂石車）：陡坡山體、護欄、遠處工地燈光。
   */
  private _buildMountainWorks(W: number, H: number, gY: number, bg: ChaseTheme['background']) {
    const mtn = new PIXI.Graphics()
    // 已由 showMountains 可能畫遠山；此處加近側陡坡塊
    mtn.poly([
      0, gY,
      0, gY - 40,
      W * 0.15, gY - 90,
      W * 0.28, gY - 50,
      W * 0.4, gY - 100,
      W * 0.55, gY - 45,
      W * 0.7, gY - 80,
      W * 0.85, gY - 40,
      W, gY - 70,
      W, gY,
    ]).fill({ color: bg.farLayer, alpha: 0.95 })
    this.bgLayer.addChild(mtn)

    const works = new PIXI.Graphics()
    // 護欄柱
    for (let x = 20; x < W; x += 48) {
      works.rect(x, gY - 18, 3, 16).fill({ color: 0x6a5a40, alpha: 0.7 })
      works.rect(x, gY - 18, 40, 2).fill({ color: 0x8a7040, alpha: 0.5 })
    }
    // 遠處工地燈光塊
    for (let i = 0; i < 6; i++) {
      const x = W * 0.55 + i * 50 + Math.random() * 20
      const y = gY - 55 - Math.random() * 40
      works.circle(x, y, 2.5).fill({ color: bg.lamp, alpha: 0.55 })
      for (let r = 10; r > 0; r -= 3) {
        works.circle(x, y, r).fill({ color: bg.skyAccent, alpha: (10 - r) / 10 * 0.04 })
      }
    }
    this.midLayer.addChild(works)
  }

  private _buildHazardBeacons(W: number, gY: number, bg: ChaseTheme['background']) {
    const g = new PIXI.Graphics()
    for (let x = 60; x < W; x += 140) {
      // 三角警示錐簡化
      g.poly([x, gY - 2, x - 8, gY - 18, x + 8, gY - 18])
        .fill({ color: 0xf97316, alpha: 0.75 })
      g.rect(x - 2, gY - 22, 4, 4).fill({ color: bg.lamp, alpha: 0.9 })
      for (let r = 12; r > 0; r -= 3) {
        g.circle(x, gY - 24, r).fill({ color: bg.lamp, alpha: (12 - r) / 12 * 0.06 })
      }
    }
    this.roadLayer.addChild(g)
  }

  /**
   * 夜間市區街道（Foodpanda）：騎樓列、招牌塊、紅綠燈、便利商店暖光、遠樓。
   */
  private _buildUrbanStreet(W: number, H: number, gY: number, bg: ChaseTheme['background']) {
    const far = new PIXI.Graphics()
    // 遠方高樓剪影
    let x = 0
    while (x < W) {
      const bw = 36 + Math.random() * 50
      const bh = 50 + Math.random() * 90
      far.rect(x, gY - bh, bw, bh).fill({ color: bg.farLayer, alpha: 0.9 })
      x += bw + 6
    }
    this.bgLayer.addChild(far)

    const mid = new PIXI.Graphics()
    // 騎樓／店面列
    x = -10
    while (x < W + 40) {
      const bw = 70 + Math.random() * 40
      const bh = 55 + Math.random() * 25
      mid.rect(x, gY - bh, bw, bh).fill({ color: bg.midLayer, alpha: 0.95 })
      // 騎樓柱
      mid.rect(x + 6, gY - bh * 0.55, 5, bh * 0.55).fill({ color: bg.farLayer, alpha: 0.8 })
      mid.rect(x + bw - 12, gY - bh * 0.55, 5, bh * 0.55).fill({ color: bg.farLayer, alpha: 0.8 })
      // 招牌（粉／橙／黃）
      const signs = [bg.lamp, bg.skyAccent, 0xfbbf24, 0x22d3ee]
      const sc = signs[Math.floor(Math.random() * signs.length)]
      mid.roundRect(x + 10, gY - bh + 8, bw * 0.55, 10, 2).fill({ color: sc, alpha: 0.55 })
      // 店內暖光窗
      mid.rect(x + 14, gY - 28, 18, 14).fill({ color: 0xffe08a, alpha: 0.25 + Math.random() * 0.2 })
      x += bw + 4
    }
    // 紅綠燈柱
    for (const lx of [W * 0.25, W * 0.7]) {
      mid.rect(lx, gY - 70, 4, 70).fill({ color: 0x555566, alpha: 0.85 })
      mid.roundRect(lx - 6, gY - 78, 16, 28, 3).fill({ color: 0x2a2a32, alpha: 0.9 })
      mid.circle(lx + 2, gY - 70, 3).fill({ color: 0x22c55e, alpha: 0.85 })
      mid.circle(lx + 2, gY - 62, 3).fill({ color: 0xeab308, alpha: 0.4 })
      mid.circle(lx + 2, gY - 54, 3).fill({ color: 0xef4444, alpha: 0.35 })
    }
    // 地面燈光反射帶
    mid.rect(0, gY - 6, W, 5).fill({ color: bg.skyAccent, alpha: 0.05 })
    this.midLayer.addChild(mid)
  }

  /**
   * 醫院／急診道（救護車）：醫院建築、十字燈箱、冷白與紅光暈、遠方車燈。
   */
  private _buildHospital(W: number, H: number, gY: number, bg: ChaseTheme['background']) {
    const far = new PIXI.Graphics()
    // 醫院主樓
    const hx = W * 0.55
    far.rect(hx, gY - 110, 160, 110).fill({ color: bg.farLayer, alpha: 0.95 })
    far.rect(hx + 40, gY - 140, 80, 30).fill({ color: bg.midLayer, alpha: 0.9 })
    // 窗格
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        far.rect(hx + 12 + c * 28, gY - 95 + r * 22, 14, 12)
          .fill({ color: 0xa8d4ff, alpha: 0.12 + Math.random() * 0.15 })
      }
    }
    // 紅色十字燈箱
    far.roundRect(hx + 60, gY - 128, 40, 22, 3).fill({ color: 0xffffff, alpha: 0.85 })
    far.rect(hx + 76, gY - 124, 8, 14).fill({ color: 0xef4444, alpha: 0.95 })
    far.rect(hx + 70, gY - 120, 20, 6).fill({ color: 0xef4444, alpha: 0.95 })
    this.bgLayer.addChild(far)

    const mid = new PIXI.Graphics()
    // 路側標線感
    mid.rect(0, gY - 4, W, 3).fill({ color: 0xffffff, alpha: 0.12 })
    // 遠方車燈點
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * W
      mid.circle(x, gY - 8, 2).fill({ color: 0xffe08a, alpha: 0.4 })
      mid.circle(x + 14, gY - 8, 2).fill({ color: 0xef4444, alpha: 0.35 })
    }
    // 紅色緊急光暈
    for (let r = 80; r > 0; r -= 12) {
      mid.circle(W * 0.2, gY - 40, r).fill({ color: 0xef4444, alpha: (80 - r) / 80 * 0.03 })
    }
    this.midLayer.addChild(mid)
  }

  /**
   * 火災現場感（消防車）：建築剪影、橘紅火光、煙霧、警示反射。
   */
  private _buildFireScene(W: number, H: number, gY: number, bg: ChaseTheme['background']) {
    const far = new PIXI.Graphics()
    let x = 0
    while (x < W) {
      const bw = 40 + Math.random() * 55
      const bh = 45 + Math.random() * 80
      far.rect(x, gY - bh, bw, bh).fill({ color: bg.farLayer, alpha: 0.92 })
      x += bw + 5
    }
    this.bgLayer.addChild(far)

    const fire = new PIXI.Graphics()
    // 遠方火光簇
    for (const cx of [W * 0.3, W * 0.55, W * 0.75]) {
      for (let i = 0; i < 5; i++) {
        const px = cx + (Math.random() - 0.5) * 40
        const py = gY - 30 - Math.random() * 50
        for (let r = 18; r > 0; r -= 4) {
          fire.circle(px, py, r).fill({
            color: r > 10 ? 0xf97316 : 0xfbbf24,
            alpha: (18 - r) / 18 * 0.12,
          })
        }
      }
    }
    // 煙霧橢圓
    for (let i = 0; i < 6; i++) {
      fire.ellipse(
        W * 0.2 + i * 90,
        gY - 70 - Math.random() * 30,
        40 + Math.random() * 30,
        12 + Math.random() * 8,
      ).fill({ color: 0x6b7280, alpha: 0.08 })
    }
    // 地面橘光反射
    fire.rect(0, gY - 8, W, 6).fill({ color: 0xf97316, alpha: 0.06 })
    this.midLayer.addChild(fire)
  }

  /**
   * 夜間海邊／河岸（比基尼）：海面反光、護欄、遠城燈光、水波光點。
   */
  private _buildWaterfront(W: number, H: number, gY: number, bg: ChaseTheme['background']) {
    const water = new PIXI.Graphics()
    // 海／河帶（地平線下半偏下）
    const waterTop = gY - 28
    water.rect(0, waterTop, W, gY - waterTop).fill({ color: 0x0a1828, alpha: 0.85 })
    // 反光橫紋
    for (let i = 0; i < 10; i++) {
      const y = waterTop + 4 + i * 3
      water.rect(0, y, W, 1).fill({ color: bg.skyAccent, alpha: 0.04 + (i % 3) * 0.02 })
    }
    // 遠城燈光點列
    for (let i = 0; i < 20; i++) {
      water.circle(20 + i * (W / 18), waterTop - 8 - Math.random() * 20, 1.2)
        .fill({ color: 0xffe08a, alpha: 0.35 + Math.random() * 0.3 })
    }
    this.bgLayer.addChild(water)

    const rail = new PIXI.Graphics()
    // 簡易護欄
    for (let x = 10; x < W; x += 36) {
      rail.rect(x, gY - 22, 3, 18).fill({ color: 0x6a7080, alpha: 0.7 })
    }
    rail.rect(0, gY - 22, W, 2).fill({ color: 0x8a90a0, alpha: 0.55 })
    // 水波光點粒子錨點（靜態裝飾）
    for (let i = 0; i < 15; i++) {
      rail.circle(Math.random() * W, waterTop + 6 + Math.random() * 16, 1)
        .fill({ color: 0xffffff, alpha: 0.2 + Math.random() * 0.25 })
    }
    this.midLayer.addChild(rail)
  }

  /**
   * 傳統巷弄／老街（阿嬤）：低矮舊公寓、鐵窗、電線桿、溫黃路燈、廟角剪影。
   */
  private _buildTraditionalAlley(W: number, H: number, gY: number, bg: ChaseTheme['background']) {
    const far = new PIXI.Graphics()
    // 遠處廟或騎樓輪廓
    far.rect(W * 0.7, gY - 55, 80, 55).fill({ color: bg.farLayer, alpha: 0.85 })
    far.poly([
      W * 0.68, gY - 52,
      W * 0.74, gY - 78,
      W * 0.82, gY - 52,
    ]).fill({ color: bg.farLayer, alpha: 0.9 })
    this.bgLayer.addChild(far)

    const mid = new PIXI.Graphics()
    // 兩側低矮公寓塊
    let x = 0
    while (x < W) {
      const bw = 55 + Math.random() * 35
      const floors = 2 + Math.floor(Math.random() * 2)
      const bh = 36 + floors * 22
      mid.rect(x, gY - bh, bw, bh).fill({ color: bg.midLayer, alpha: 0.95 })
      // 鐵窗格
      for (let f = 0; f < floors; f++) {
        const wy = gY - 18 - f * 22
        mid.rect(x + 8, wy - 12, 14, 12).stroke({ color: 0x4a4038, width: 1, alpha: 0.6 })
        mid.rect(x + 28, wy - 12, 14, 12).stroke({ color: 0x4a4038, width: 1, alpha: 0.6 })
        // 暖燈窗
        if (Math.random() > 0.4) {
          mid.rect(x + 10, wy - 10, 10, 8).fill({ color: 0xffe4a0, alpha: 0.3 })
        }
      }
      // 空調／水塔小塊
      if (Math.random() > 0.5) {
        mid.rect(x + bw * 0.3, gY - bh - 6, 16, 6).fill({ color: bg.farLayer, alpha: 0.7 })
      }
      x += bw + 3
    }
    // 電線桿 + 橫線
    for (const px of [W * 0.2, W * 0.55, W * 0.85]) {
      mid.rect(px, gY - 85, 4, 85).fill({ color: 0x3a3530, alpha: 0.8 })
      mid.moveTo(px, gY - 80).lineTo(px + 80, gY - 70)
        .stroke({ color: 0x2a2820, width: 1, alpha: 0.5 })
    }
    // 路邊攤殘影（矮桌＋暖光）
    mid.roundRect(W * 0.4, gY - 14, 36, 12, 2).fill({ color: 0x3a3020, alpha: 0.7 })
    for (let r = 16; r > 0; r -= 4) {
      mid.circle(W * 0.4 + 18, gY - 20, r).fill({ color: bg.lamp, alpha: (16 - r) / 16 * 0.05 })
    }
    this.midLayer.addChild(mid)
  }

  private _initUfoLights(W: number, gY: number, accent: number) {
    for (let i = 0; i < 12; i++) {
      const g = new PIXI.Graphics()
      for (let r = 8; r > 0; r -= 2) {
        g.circle(0, 0, r).fill({ color: accent, alpha: (8 - r) / 8 * 0.1 })
      }
      g.circle(0, 0, 1.8).fill({ color: 0xccfff5, alpha: 0.9 })
      g.x = Math.random() * W
      g.y = gY * 0.15 + Math.random() * gY * 0.45
      g.alpha = 0.5 + Math.random() * 0.4
      this.bgLayer.addChild(g)
      this.ambientParticles.push({
        g,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 4,
        life: 6,
        maxLife: 6,
        baseAlpha: g.alpha,
      })
    }
  }

  private _initDust(W: number, gY: number) {
    for (let i = 0; i < 20; i++) {
      const g = new PIXI.Graphics()
      g.ellipse(0, 0, 6 + Math.random() * 10, 2 + Math.random() * 3)
        .fill({ color: 0xc4a574, alpha: 0.25 })
      g.x = Math.random() * W
      g.y = gY - 10 + Math.random() * 20
      this.midLayer.addChild(g)
      this.leafParticles.push({
        g,
        vx: 40 + Math.random() * 50,
        vy: (Math.random() - 0.5) * 8,
        life: 5,
        maxLife: 5,
        baseAlpha: 0.25,
      })
    }
  }

  private _initFireflies(W: number, gY: number) {
    for (let i = 0; i < 28; i++) {
      const g = new PIXI.Graphics()
      g.circle(0, 0, 1.6 + Math.random()).fill({ color: 0xc8ff7a })
      g.x = Math.random() * W
      g.y = gY * 0.35 + Math.random() * gY * 0.55
      g.alpha = 0.3 + Math.random() * 0.5
      this.midLayer.addChild(g)
      this.ambientParticles.push({
        g,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.5) * 12,
        life: 2 + Math.random() * 4,
        maxLife: 4,
        baseAlpha: g.alpha,
      })
    }
  }

  private _initLeaves(W: number, gY: number) {
    for (let i = 0; i < 14; i++) {
      const g = new PIXI.Graphics()
      const c = Math.random() > 0.5 ? 0x8b5a2b : 0xc4783a
      g.ellipse(0, 0, 4 + Math.random() * 3, 2 + Math.random() * 2).fill({ color: c, alpha: 0.7 })
      g.x = Math.random() * W
      g.y = Math.random() * gY * 0.7
      g.rotation = Math.random() * Math.PI
      this.midLayer.addChild(g)
      this.leafParticles.push({
        g,
        vx: 12 + Math.random() * 28,
        vy: 20 + Math.random() * 35,
        life: 8,
        maxLife: 8,
        baseAlpha: 0.7,
      })
    }
  }

  // ── 路面 ──────────────────────────────────────────────

  private _buildRoad() {
    const W = this.app.screen.width
    const dashColor = this.chaseTheme.background.roadDash

    this.roadBody  = new PIXI.Graphics()
    this.roadEdge  = new PIXI.Graphics()
    this.roadShade = new PIXI.Graphics()
    this.roadGrass = new PIXI.Graphics()
    this.roadLayer.addChild(this.roadBody, this.roadEdge, this.roadShade, this.roadGrass)

    for (let x = 0; x < W + 160; x += 160) {
      const dash = new PIXI.Graphics()
      dash.roundRect(0, 0, 60, 3, 1.5).fill({ color: dashColor, alpha: 0.65 })
      this.roadLayer.addChild(dash)
      this.roadDashes.push(dash)
    }

    this._redrawRoadSurface(this._getWorkoutProgress())
  }

  private _redrawRoadSurface(progress: number) {
    const W = this.app.screen.width
    const H = this.app.screen.height
    const bg = this.chaseTheme.background
    const samples = Math.max(24, Math.ceil(W / 40))
    const topPts: number[] = []

    for (let i = 0; i <= samples; i++) {
      const x = (i / samples) * W
      const localP = Math.max(0, Math.min(1,
        progress + ((x - this._riderX()) / Math.max(1, W)) * TERRAIN_SCREEN_SPAN))
      const y = this._baseGroundY() - this._getTerrainHeight(localP) * TERRAIN_MAX_ELEV_PX
      topPts.push(x, y - 6)
    }

    this.roadBody.clear()
    this.roadBody.poly([...topPts, W, H, 0, H]).fill({ color: bg.road })

    this.roadEdge.clear()
    this.roadEdge.moveTo(topPts[0], topPts[1])
    for (let i = 2; i < topPts.length; i += 2) {
      this.roadEdge.lineTo(topPts[i], topPts[i + 1])
    }
    this.roadEdge.stroke({ color: bg.roadEdge, width: 2, alpha: 0.85 })

    this.roadShade.clear()
    const shadePts: number[] = []
    for (let i = 0; i < topPts.length; i += 2) {
      shadePts.push(topPts[i], topPts[i + 1] + (H - topPts[i + 1]) * 0.55)
    }
    this.roadShade.poly([...shadePts, W, H, 0, H]).fill({ color: 0x000000, alpha: 0.16 })

    this.roadGrass.clear()
    this.roadGrass.rect(0, H - 14, W, 14).fill({ color: bg.roadside })
  }

  private _buildLamps() {
    if (!this.chaseTheme.background.showLamps) return

    const W = this.app.screen.width
    const lampColor = this.chaseTheme.background.lamp
    const isCity = this.chaseTheme.background.showCity
    const isGrave = this.chaseTheme.background.showCemetery
    // 墓地：路燈較少、較暗
    const spacing = isGrave ? 260 : isCity ? 160 : 180
    const startX = isGrave ? 140 : 100

    for (let x = startX; x < W + 100; x += spacing) {
      const lamp = new PIXI.Container()

      const pole = new PIXI.Graphics()
      if (isGrave) {
        // 舊式矮燈柱
        pole.moveTo(0, 0).lineTo(0, -52).stroke({ color: 0x3a3a32, width: 2.5 })
        pole.moveTo(0, -52).lineTo(14, -52).stroke({ color: 0x3a3a32, width: 2.5 })
        pole.roundRect(8, -58, 14, 7, 2).fill({ color: 0x5a5040 })
      } else if (isCity) {
        pole.moveTo(0, 0).lineTo(0, -88).stroke({ color: 0x555566, width: 3 })
        pole.moveTo(0, -88).lineTo(20, -88).stroke({ color: 0x555566, width: 3 })
        pole.roundRect(12, -94, 18, 8, 2).fill({ color: 0x888899 })
      } else {
        pole.moveTo(0, 0).lineTo(0, -72).stroke({ color: 0x4a4a4a, width: 3 })
        pole.moveTo(0, -72).lineTo(22, -72).stroke({ color: 0x4a4a4a, width: 3 })
        pole.roundRect(14, -78, 18, 8, 2).fill({ color: 0x6a6a6a })
      }
      lamp.addChild(pole)

      const glowY = isGrave ? -52 : isCity ? -88 : -72
      const glowX = isGrave ? 14 : isCity ? 20 : 22
      const glow = new PIXI.Graphics()
      const maxR = isGrave ? 36 : 55
      const glowAlpha = isGrave ? 0.08 : 0.14
      for (let r = maxR; r > 0; r -= 5) {
        const a = (maxR - r) / maxR * glowAlpha
        glow.circle(glowX, glowY, r).fill({ color: lampColor, alpha: a })
      }
      lamp.addChild(glow)

      const pool = new PIXI.Graphics()
      pool.ellipse(glowX, 4, isGrave ? 22 : 36, isGrave ? 5 : 8)
        .fill({ color: lampColor, alpha: isGrave ? 0.04 : 0.06 })
      lamp.addChild(pool)

      lamp.x = x
      lamp.y = this._groundYAt(x)
      this.roadLayer.addChild(lamp)
      this.lampSprites.push(lamp)
      this.lampXs.push(x)
    }
  }

  private _makeSheetFrames(sheet: PIXI.Texture, frames: FrameRect[]) {
    return frames.map(f => new PIXI.Texture({
      source: sheet.source,
      frame: new PIXI.Rectangle(f.x, f.y, f.w, f.h),
    }))
  }

  private _buildRider() {
    const baseTexture = PIXI.Assets.get('rider') as PIXI.Texture

    this.riderSprite     = new PIXI.AnimatedSprite(
      this._makeSheetFrames(baseTexture, RIDER_NORMAL_FRAMES))
    this.riderNervSprite = new PIXI.AnimatedSprite(
      this._makeSheetFrames(baseTexture, RIDER_NERVOUS_FRAMES))

    this.riderBaseScale = RIDER_DISPLAY_H / RIDER_NORMAL_FRAMES[0].h
    const groundY = this._groundY()
    const riderX  = this._riderX()

    for (const s of [this.riderSprite, this.riderNervSprite]) {
      s.animationSpeed = 8 / 60
      s.loop = true
      s.anchor.set(0.5, 1)
      s.scale.set(this.riderBaseScale)
      s.x = riderX
      s.y = groundY
    }

    this.riderSprite.play()
    this.riderNervSprite.play()
    this.riderNervSprite.visible = false
    this.gameLayer.addChild(this.riderSprite, this.riderNervSprite)
  }

  /** 追逐者（柴犬／黑熊／哥吉拉…） */
  private _buildChaser() {
    const cfg = this.chaseTheme.chaser
    const baseTexture = PIXI.Assets.get(cfg.assetAlias) as PIXI.Texture

    this.chaserRunSprite = new PIXI.AnimatedSprite(
      this._makeSheetFrames(baseTexture, cfg.runFrames))
    this.chaserAtkSprite = new PIXI.AnimatedSprite(
      this._makeSheetFrames(baseTexture, cfg.attackFrames))

    // 以幀平均像素高對齊 displayHeight（騎士 320；柴犬~170；大型角色~380–400；重車~520）
    const avgH = cfg.runFrames.reduce((a, f) => a + f.h, 0) / Math.max(1, cfg.runFrames.length)
    this.chaserBaseScale = (cfg.displayHeight / avgH) * cfg.scaleMul

    const groundY = this._groundY()
    const animMul = this.chaseTheme.behavior.animSpeedMul

    for (const s of [this.chaserRunSprite, this.chaserAtkSprite]) {
      s.animationSpeed = (9 / 60) * animMul
      s.loop = true
      s.anchor.set(0.5, 1)
      s.scale.set(this.chaserBaseScale)
      s.tint = cfg.tint
      s.y = groundY
      s.play()
    }

    this.chaserAtkSprite.visible = false
    this.gameLayer.addChild(this.chaserRunSprite, this.chaserAtkSprite)
  }

  private _buildSweat() {
    const baseTexture = PIXI.Assets.get('sweat') as PIXI.Texture
    const row = 2
    this.sweatTextures = Array.from({ length: SWEAT_COLS }, (_, col) =>
      new PIXI.Texture({
        source: baseTexture.source,
        frame: new PIXI.Rectangle(
          col * SWEAT_W, row * SWEAT_H, SWEAT_W, SWEAT_H),
      })
    )
  }

  private _buildVignette() {
    const W = this.app.screen.width
    const H = this.app.screen.height
    this.vignette = new PIXI.Graphics()
    const edge = Math.min(W, H) * 0.12
    this.vignette.rect(0, 0, W, edge).fill({ color: 0x000000, alpha: 0.25 })
    this.vignette.rect(0, H - edge, W, edge).fill({ color: 0x000000, alpha: 0.3 })
    this.vignette.rect(0, 0, edge * 0.8, H).fill({ color: 0x000000, alpha: 0.2 })
    this.vignette.rect(W - edge * 0.8, 0, edge * 0.8, H).fill({ color: 0x000000, alpha: 0.2 })
    this.fxLayer.addChild(this.vignette)
  }

  private _buildHud() {
    this.hud = new GameHud(
      this.state,
      () => this.app.screen.width,
      () => this.app.screen.height,
      {
        onPauseToggle: () => {
          if (!this.state.isRunning || this.state.isFinished) return
          this.state.isPaused = !this.state.isPaused
        },
        onQuit: () => this.onQuit?.(),
        onRestart: () => this.onRestart?.(),
      },
      {
        chaserShortName: this.chaseTheme.chaser.shortName,
        restVerb: this.chaseTheme.behavior.restVerb,
        returnVerb: this.chaseTheme.behavior.returnVerb,
      },
    )
    this.hud.build()
    this.hudLayer.addChild(this.hud)
  }

  private _buildTerrainMinimap() {
    const W = this.app.screen.width
    this.minimapRoot = new PIXI.Container()

    this.minimapBg = new PIXI.Graphics()
    this.minimapBg
      .roundRect(0, 0, MINIMAP_W, MINIMAP_H, 10)
      .fill({ color: 0x0a0a18, alpha: 0.72 })
      .stroke({ color: 0x22d3ee, alpha: 0.22, width: 1 })
    this.minimapRoot.addChild(this.minimapBg)

    const title = new PIXI.Text({
      text: '路線剖面',
      style: textStyle({ size: 10, color: Theme.text.dim, weight: '700', letterSpacing: 0.5 }),
    })
    title.x = MINIMAP_PAD_X
    title.y = 4
    this.minimapRoot.addChild(title)

    this.minimapFill = new PIXI.Graphics()
    this.minimapRoot.addChild(this.minimapFill)
    this.minimapLine = new PIXI.Graphics()
    this.minimapRoot.addChild(this.minimapLine)
    this.minimapMarker = new PIXI.Graphics()
    this.minimapRoot.addChild(this.minimapMarker)

    this.minimapLabel = new PIXI.Text({
      text: '',
      style: textStyle({ size: 10, color: Theme.accent.cyan, weight: '600' }),
    })
    this.minimapLabel.anchor.set(1, 0)
    this.minimapLabel.x = MINIMAP_W - MINIMAP_PAD_X
    this.minimapLabel.y = 4
    this.minimapRoot.addChild(this.minimapLabel)

    this.minimapGrade = new PIXI.Text({
      text: '',
      style: textStyle({ size: 10, color: Theme.text.muted, weight: '600', mono: true }),
    })
    this.minimapGrade.anchor.set(0, 1)
    this.minimapGrade.x = MINIMAP_PAD_X
    this.minimapGrade.y = MINIMAP_H - 4
    this.minimapRoot.addChild(this.minimapGrade)

    this.minimapRoot.x = W - MINIMAP_W - 16
    this.minimapRoot.y = 138
    this.hudLayer.addChild(this.minimapRoot)

    this._drawMinimapProfile()
    this._updateTerrainMinimap(this._getWorkoutProgress())
  }

  private _drawMinimapProfile() {
    const left = MINIMAP_PAD_X
    const right = MINIMAP_W - MINIMAP_PAD_X
    const bottom = MINIMAP_H - 16
    const chartW = right - left
    const chartH = bottom - 18
    const steps = 48
    const pts: number[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const h = this._getTerrainHeight(t)
      pts.push(left + t * chartW, bottom - h * chartH)
    }
    this.minimapFill.clear()
    this.minimapFill.poly([...pts, right, bottom, left, bottom])
      .fill({ color: 0x22d3ee, alpha: 0.08 })
    this.minimapLine.clear()
    this.minimapLine.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) {
      this.minimapLine.lineTo(pts[i], pts[i + 1])
    }
    this.minimapLine.stroke({ color: 0xcbd5e1, width: 1.6, alpha: 0.9 })
    this.minimapLine.moveTo(left, bottom).lineTo(right, bottom)
      .stroke({ color: 0x64748b, width: 1, alpha: 0.35 })
  }

  private _updateTerrainMinimap(progress: number) {
    if (!this.minimapMarker) return
    const left = MINIMAP_PAD_X
    const right = MINIMAP_W - MINIMAP_PAD_X
    const bottom = MINIMAP_H - 16
    const chartW = right - left
    const chartH = bottom - 18
    const p = Math.max(0, Math.min(1, progress))
    const h = this._getTerrainHeight(p)
    const mx = left + p * chartW
    const my = bottom - h * chartH

    this.minimapMarker.clear()
    for (let r = 10; r >= 4; r -= 2) {
      this.minimapMarker.circle(mx, my, r)
        .fill({ color: 0xef4444, alpha: 0.08 * (11 - r) })
    }
    this.minimapMarker.circle(mx, my, 4).fill({ color: 0xef4444, alpha: 0.95 })
    this.minimapMarker.circle(mx, my, 1.6).fill({ color: 0xfff1f2, alpha: 0.95 })
    this.minimapMarker.moveTo(mx, my + 5).lineTo(mx, bottom)
      .stroke({ color: 0xef4444, width: 1, alpha: 0.25 })

    this.minimapLabel.text = this._getTerrainLabel(p)
    const grade = this._getTerrainGrade(p)
    const pct = Math.round(grade * 8)
    if (Math.abs(pct) < 1) {
      this.minimapGrade.text = '坡度  0%'
      this.minimapGrade.style.fill = Theme.text.muted
    } else if (pct > 0) {
      this.minimapGrade.text = `上坡  +${pct}%`
      this.minimapGrade.style.fill = Theme.status.warning
    } else {
      this.minimapGrade.text = `下坡  ${pct}%`
      this.minimapGrade.style.fill = Theme.accent.cyan
    }
  }

  private _buildDangerOverlay() {
    this.dangerOverlay = new PIXI.Graphics()
    this.dangerOverlay.alpha = 0
    this.fxLayer.addChild(this.dangerOverlay)
  }

  // ── 主更新 ────────────────────────────────────────────

  update(dt: number) {
    if (!this.ready) return

    const progress = this._getWorkoutProgress()
    const riderGround = this._groundY()
    const chaserH = this._chaserDisplayH()

    if (this.state.isPaused || this.state.isFinished) {
      this._redrawRoadSurface(progress)
      this._layoutTerrainProps()
      this._updateTerrainMinimap(progress)
      this.hud?.update(dt, this.chaserScreenX, riderGround, chaserH)
      return
    }
    if (!this.state.isRunning) return

    this.elapsed += dt
    const speed = Math.max(1.5, this.state.currentPower / 25)
    this.roadOffset = (this.roadOffset + speed * dt * 80) % 160

    this._redrawRoadSurface(progress)

    this.roadDashes.forEach((d, i) => {
      d.x = (i * 160 - this.roadOffset + 160 * 10) % (this.roadDashes.length * 160) - 160
      d.y = this._groundYAt(d.x + 30) + 14
    })

    for (let i = 0; i < this.lampSprites.length; i++) {
      this.lampXs[i] -= speed * dt * 80
      if (this.lampXs[i] < -20) this.lampXs[i] = this.app.screen.width + 80
      this.lampSprites[i].x = this.lampXs[i]
      this.lampSprites[i].y = this._groundYAt(this.lampXs[i])
    }

    this._updateChaserX(dt)
    this._updateRider(progress)
    this._updateChaser()
    this._updateAmbientFx(dt)
    this._updateShake(dt)
    this._updateSweat(dt)
    this._updateTerrainMinimap(progress)
    this.hud?.update(dt, this.chaserScreenX, this._groundY(), chaserH)
    this._updateStars()
  }

  private _layoutTerrainProps() {
    this.roadDashes.forEach((d) => {
      d.y = this._groundYAt(d.x + 30) + 14
    })
    for (let i = 0; i < this.lampSprites.length; i++) {
      this.lampSprites[i].y = this._groundYAt(this.lampXs[i])
    }
    const gy = this._groundY()
    if (this.riderSprite) {
      this.riderSprite.y = this.riderNervSprite.y = gy
    }
    if (this.chaserRunSprite) {
      const cy = this._groundYAt(this.chaserScreenX)
      this.chaserRunSprite.y = this.chaserAtkSprite.y = cy
    }
  }

  private _calcTargetChaserX(): number {
    const riderX = this._riderX()
    const t = Math.max(0, Math.min(1, this.state.distance / GameState.MAX_DIST))
    const nearX = riderX - 95
    const farX  = -40
    return nearX + t * (farX - nearX)
  }

  private _updateChaserX(dt: number) {
    const dogState = this.state.dogState
    const target = this._calcTargetChaserX()

    if (dogState === 'retreating') {
      this.chaserScreenX -= Math.max(420, Math.abs(this.chaserScreenX) * 0.8 + 280) * dt
      if (this.chaserScreenX < -180) this.chaserScreenX = -180
      return
    }
    if (dogState === 'resting') {
      if (this.chaserScreenX > -180) this.chaserScreenX -= 600 * dt
      else this.chaserScreenX = -180
      return
    }
    if (dogState === 'returning') {
      if (this.chaserScreenX < -150) this.chaserScreenX = -150
      const gap = target - this.chaserScreenX
      const spd = Math.max(520, Math.min(1100, 480 + gap * 1.8))
      this.chaserScreenX += spd * dt
      if (this.chaserScreenX >= target) {
        this.chaserScreenX = target
        this.state.onReturnComplete()
      }
      return
    }
    this.chaserScreenX += (target - this.chaserScreenX) * Math.min(1, dt * 3.2)
  }

  private _updateRider(progress: number) {
    const isNerv = this.state.isNervous
    const groundY = this._groundY()
    const riderX  = this._riderX()

    this.riderSprite.visible     = !isNerv
    this.riderNervSprite.visible =  isNerv
    const pedal = Math.max(6, Math.min(14, 7 + this.state.powerRatio * 5)) / 60
    this.riderSprite.animationSpeed     = pedal
    this.riderNervSprite.animationSpeed = pedal * 1.15
    this.riderSprite.x = this.riderNervSprite.x = riderX
    this.riderSprite.y = this.riderNervSprite.y = groundY

    const grade = this._getTerrainGrade(progress)
    const tilt = Math.max(-0.12, Math.min(0.12, -grade * 0.04))
    this.riderSprite.rotation = tilt
    this.riderNervSprite.rotation = tilt
  }

  private _updateChaser() {
    const ds = this.state.dogState
    const showAtk = this.state.isDanger
      || ds === 'returning'
      || (ds === 'chasing' && this.state.isNervous && this.state.distance < 18)
    const groundY = this._groundYAt(this.chaserScreenX)
    const animMul = this.chaseTheme.behavior.animSpeedMul

    this.chaserRunSprite.x = this.chaserAtkSprite.x = this.chaserScreenX
    this.chaserRunSprite.y = this.chaserAtkSprite.y = groundY

    const pulse = this.state.isDanger ? 1 + Math.sin(this.elapsed * 8) * 0.03 : 1
    const scale = this.chaserBaseScale * pulse
    this.chaserRunSprite.scale.set(scale)
    this.chaserAtkSprite.scale.set(scale)

    const chaserP = this._progressAtScreenX(this.chaserScreenX)
    const tilt = Math.max(-0.12, Math.min(0.12, -this._getTerrainGrade(chaserP) * 0.04))
    this.chaserRunSprite.rotation = tilt
    this.chaserAtkSprite.rotation = tilt

    let animSpeed = (9 / 60) * animMul
    if (ds === 'returning') animSpeed = (16 / 60) * animMul
    else if (ds === 'retreating') animSpeed = (13 / 60) * animMul
    else if (this.state.isDanger) animSpeed = (13 / 60) * animMul
    else if (this.state.isNervous) animSpeed = (11 / 60) * animMul

    const sprite = showAtk ? this.chaserAtkSprite : this.chaserRunSprite
    sprite.animationSpeed = animSpeed

    const visible = this.chaserScreenX > -140 && ds !== 'resting'
    this.chaserRunSprite.visible = visible && !showAtk
    this.chaserAtkSprite.visible = visible && showAtk
  }

  private _updateAmbientFx(dt: number) {
    const W = this.app.screen.width
    const gY = this.app.screen.height * 0.60

    for (const p of this.ambientParticles) {
      p.g.x += p.vx * dt
      p.g.y += p.vy * dt
      p.life -= dt
      // 螢火蟲閃爍
      p.g.alpha = p.baseAlpha * (0.45 + 0.55 * Math.sin(this.elapsed * 4 + p.g.x * 0.05))
      if (p.g.x < -10) p.g.x = W + 10
      if (p.g.x > W + 10) p.g.x = -10
      if (p.g.y < gY * 0.2) p.vy = Math.abs(p.vy)
      if (p.g.y > gY * 0.95) p.vy = -Math.abs(p.vy)
    }

    for (const p of this.leafParticles) {
      p.g.x += p.vx * dt
      p.g.y += p.vy * dt
      p.g.rotation += dt * 1.5
      if (p.g.y > gY + 20 || p.g.x > W + 20) {
        p.g.x = Math.random() * W * 0.4
        p.g.y = -10
      }
    }
  }

  private _updateShake(dt: number) {
    const shakeMul = this.chaseTheme.behavior.shakeMul
    this.shakeAmount *= 0.82
    if (this.state.isDanger) {
      this.shakeAmount  = Math.min(6 * shakeMul, this.shakeAmount + 0.5 * shakeMul)
      this.dangerAlpha  = Math.min(0.45, this.dangerAlpha + 0.035)
    } else {
      this.dangerAlpha = Math.max(0, this.dangerAlpha - 0.025)
    }

    if (this.shakeAmount > 1) {
      this.gameLayer.x = (Math.random() - 0.5) * this.shakeAmount * 2
      this.gameLayer.y = (Math.random() - 0.5) * this.shakeAmount
    } else {
      this.gameLayer.x = this.gameLayer.y = 0
    }

    if (this.dangerAlpha > 0.01) {
      const W = this.app.screen.width
      const H = this.app.screen.height
      const a = this.dangerAlpha
      const bw = W / 7
      const bh = H / 9
      this.dangerOverlay.clear()
      for (let i = 0; i < 6; i++) {
        const t = i / 6
        const aa = a * (1 - t) * 0.7
        this.dangerOverlay.rect(0, 0, bw * (1 - t * 0.5), H).fill({ color: 0xdc1e1e, alpha: aa * 0.15 })
        this.dangerOverlay.rect(W - bw * (1 - t * 0.5), 0, bw * (1 - t * 0.5), H).fill({ color: 0xdc1e1e, alpha: aa * 0.15 })
        this.dangerOverlay.rect(0, 0, W, bh * (1 - t * 0.5)).fill({ color: 0xdc1e1e, alpha: aa * 0.12 })
        this.dangerOverlay.rect(0, H - bh * (1 - t * 0.5), W, bh * (1 - t * 0.5)).fill({ color: 0xdc1e1e, alpha: aa * 0.12 })
      }
    } else {
      this.dangerOverlay.clear()
    }
  }

  private _updateSweat(dt: number) {
    const rate = this.state.isDanger ? 4 : this.state.isNervous ? 1.5 : 0
    if (rate > 0) {
      this.sweatTimer += dt * rate
      while (this.sweatTimer >= 1) {
        this._spawnSweat()
        this.sweatTimer--
      }
    }

    for (let i = this.sweatParticles.length - 1; i >= 0; i--) {
      const p = this.sweatParticles[i]
      p.sprite.x += p.vx * dt
      p.sprite.y += p.vy * dt
      p.vy += 220 * dt
      p.life -= dt
      p.sprite.alpha = Math.max(0, p.life / p.maxLife)
      const frame = Math.min(
        Math.floor((1 - p.life / p.maxLife) * SWEAT_COLS),
        SWEAT_COLS - 1)
      p.sprite.texture = this.sweatTextures[frame]
      if (p.life <= 0) {
        this.fxLayer.removeChild(p.sprite)
        this.sweatParticles.splice(i, 1)
      }
    }
  }

  private _spawnSweat() {
    const sz = this.state.isDanger ? 44 : 32
    const sp = new PIXI.Sprite(this.sweatTextures[0])
    sp.width = sz
    sp.height = sz
    sp.anchor.set(0.5)
    const gy = this._groundY()
    sp.x = this._riderX() + (Math.random() - 0.7) * 55
    sp.y = gy - RIDER_DISPLAY_H * 0.82 + Math.random() * 25
    this.fxLayer.addChild(sp)
    this.sweatParticles.push({
      sprite: sp,
      vx: (Math.random() - 0.3) * 70,
      vy: -130 - Math.random() * 80,
      life: 0.65 + Math.random() * 0.4,
      maxLife: 1.05,
    })
  }

  private _updateStars() {
    for (const { g, baseAlpha, phase } of this.stars) {
      g.alpha = baseAlpha * (0.5 + 0.5 * Math.sin(this.elapsed * 2 + phase))
    }
  }

  setBleStatus(connected: boolean, name: string) {
    this.hud?.setBleStatus(connected, name)
  }

  async resize() {
    await this.load()
  }
}

/** 供外部解析 URL / 設定用 */
export { resolveThemeId, getTheme }
