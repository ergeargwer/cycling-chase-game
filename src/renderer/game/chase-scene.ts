// 追逐遊戲主場景 — PixiJS v8
// 完整場景：可變坡度地形、路面、路燈、騎士、柴犬、汗珠、地形簡圖、商業級 HUD

import * as PIXI from 'pixi.js'
import { GameState } from './game-state'
import { GameHud } from './hud'
import { Theme, textStyle } from '../ui/theme'

// Sprite Sheet 規格（緊密裁切，去除格線內空白）
interface FrameRect { x: number; y: number; w: number; h: number }

// ── 地形資料 ─────────────────────────────────────────────

/** 單一地形段落：progress 0~1，高度 0~1（0=谷底，1=最高） */
interface TerrainSegment {
  start: number
  end: number
  h0: number
  h1: number
  label: string
}

/**
 * 整段訓練的海拔剖面（比例可依計畫重用）。
 * 段落銜接處高度連續，避免折線突跳。
 */
const TERRAIN_PROFILE: TerrainSegment[] = [
  { start: 0.00, end: 0.20, h0: 0.28, h1: 0.28, label: '平路' },
  { start: 0.20, end: 0.40, h0: 0.28, h1: 0.55, label: '緩上坡' },
  { start: 0.40, end: 0.55, h0: 0.55, h1: 0.92, label: '陡上坡' },
  { start: 0.55, end: 0.75, h0: 0.92, h1: 0.22, label: '下坡' },
  { start: 0.75, end: 1.00, h0: 0.22, h1: 0.26, label: '平路' },
]

/** 畫面橫向可見的進度跨度（用於表現局部坡度） */
const TERRAIN_SCREEN_SPAN = 0.10
/** 海拔 0→1 對應的最大垂直像素位移 */
const TERRAIN_MAX_ELEV_PX = 96
/** 自由騎乘時地形循環週期（秒） */
const FREE_RIDE_TERRAIN_CYCLE_SEC = 20 * 60
/** 地形簡圖尺寸 */
const MINIMAP_W = 200
const MINIMAP_H = 58
const MINIMAP_PAD_X = 10
const MINIMAP_PAD_Y = 10

// rider.png 1536×600 — row0 正常 / row1 緊張，各 6 格（面向右）
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
// dog.png 1320×400 — row0 奔跑 6 格 / row1 吠叫 3 格
const DOG_RUN_FRAMES: FrameRect[] = [
  { x: 12,   y: 51,  w: 196, h: 142 },
  { x: 233,  y: 35,  w: 194, h: 157 },
  { x: 457,  y: 16,  w: 185, h: 176 },
  { x: 672,  y: 70,  w: 196, h: 123 },
  { x: 896,  y: 15,  w: 187, h: 178 },
  { x: 1112, y: 38,  w: 196, h: 155 },
]
const DOG_BARK_FRAMES: FrameRect[] = [
  { x: 12,  y: 263, w: 196, h: 130 },
  { x: 232, y: 263, w: 196, h: 130 },
  { x: 452, y: 217, w: 196, h: 176 },
]
const SWEAT_W = 176, SWEAT_H = 192, SWEAT_COLS = 8
const RIDER_DISPLAY_H = 320
const DOG_DISPLAY_H   = 140
const ROAD_TOP_RATIO  = 0.60
const GROUND_IN_ROAD  = 0.50
const RIDER_X_RATIO   = 0.78

interface SweatParticle {
  sprite: PIXI.Sprite
  vx: number; vy: number
  life: number; maxLife: number
}

export class ChaseScene extends PIXI.Container {
  private app:         PIXI.Application
  private state:       GameState
  private elapsed:     number = 0
  private roadOffset:  number = 0
  private dogScreenX:  number = 0

  // 背景層
  private bgLayer:   PIXI.Container = new PIXI.Container()
  private roadLayer: PIXI.Container = new PIXI.Container()
  private gameLayer: PIXI.Container = new PIXI.Container()
  private fxLayer:   PIXI.Container = new PIXI.Container()
  private hudLayer:  PIXI.Container = new PIXI.Container()

  // 路面元素
  private roadBody!:   PIXI.Graphics
  private roadEdge!:   PIXI.Graphics
  private roadShade!:  PIXI.Graphics
  private roadGrass!:  PIXI.Graphics
  private roadDashes:  PIXI.Graphics[] = []
  private lampSprites: PIXI.Container[] = []
  private lampXs:      number[]  = []

  // 角色
  private riderSprite!:    PIXI.AnimatedSprite
  private riderNervSprite!:PIXI.AnimatedSprite
  private dogRunSprite!:   PIXI.AnimatedSprite
  private dogBarkSprite!:  PIXI.AnimatedSprite

  // 汗珠粒子
  private sweatParticles: SweatParticle[] = []
  private sweatTimer:     number = 0
  private sweatTextures:  PIXI.Texture[] = []

  // 商業級 HUD
  private hud!: GameHud
  private dangerOverlay!: PIXI.Graphics
  private vignette!: PIXI.Graphics
  private shakeAmount:    number = 0
  private dangerAlpha:    number = 0
  private riderBaseScale: number = 1
  private dogBaseScale:   number = 1

  // 地形簡圖
  private minimapRoot!:   PIXI.Container
  private minimapBg!:     PIXI.Graphics
  private minimapLine!:   PIXI.Graphics
  private minimapFill!:   PIXI.Graphics
  private minimapMarker!: PIXI.Graphics
  private minimapLabel!:  PIXI.Text
  private minimapGrade!:  PIXI.Text

  // 月亮、星星
  private moonGfx!: PIXI.Graphics
  private stars:    Array<{ g: PIXI.Graphics; baseAlpha: number; phase: number }> = []

  private onQuit?: () => void
  private onRestart?: () => void
  private assetsLoaded = false
  private ready = false

  constructor(
    app: PIXI.Application,
    state: GameState,
    handlers: { onQuit?: () => void; onRestart?: () => void } = {},
  ) {
    super()
    this.app   = app
    this.state = state
    this.onQuit = handlers.onQuit
    this.onRestart = handlers.onRestart
    this.addChild(this.bgLayer, this.roadLayer, this.gameLayer,
                  this.fxLayer, this.hudLayer)
  }

  async load() {
    this.ready = false
    if (!this.assetsLoaded) {
      await PIXI.Assets.load([
        { alias: 'rider', src: 'assets/rider.png' },
        { alias: 'dog',   src: 'assets/dog.png' },
        { alias: 'sweat', src: 'assets/sweat.png' },
      ])
      this.assetsLoaded = true
    }

    this._clearLayers()
    this._buildBackground()
    this._buildRoad()
    this._buildLamps()
    this._buildRider()
    this._buildDog()
    this._buildSweat()
    this._buildVignette()
    this._buildHud()
    this._buildTerrainMinimap()
    this._buildDangerOverlay()

    const progress = this._getWorkoutProgress()
    this._redrawRoadSurface(progress)
    this.dogScreenX = this._calcTargetDogX()
    this._updateTerrainMinimap(progress)
    this.ready = true
  }

  private _clearLayers() {
    for (const layer of [this.bgLayer, this.roadLayer, this.gameLayer, this.fxLayer, this.hudLayer]) {
      layer.removeChildren()
    }
    this.roadDashes = []
    this.lampSprites = []
    this.lampXs = []
    this.sweatParticles = []
    this.stars = []
  }

  private _riderX(): number {
    return this.app.screen.width * RIDER_X_RATIO
  }

  /** 基準路面頂（無坡度時） */
  private _roadTopBase(): number {
    return this.app.screen.height * ROAD_TOP_RATIO
  }

  /** 基準著地 Y（無坡度時） */
  private _baseGroundY(): number {
    const H = this.app.screen.height
    const roadH = H * (1 - ROAD_TOP_RATIO)
    return this._roadTopBase() + roadH * GROUND_IN_ROAD
  }

  /**
   * 訓練進度 0~1。
   * 有時限計畫：依總時長；自由騎乘：週期循環以持續有坡度變化。
   */
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

  /**
   * 依訓練進度回傳正規化海拔（0~1）。
   * 段落內以 smoothstep 插值，整條路線平滑起伏。
   */
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

  /** 目前進度所在地形段落標籤 */
  private _getTerrainLabel(progress: number): string {
    const p = Math.max(0, Math.min(1, progress))
    for (const seg of TERRAIN_PROFILE) {
      if (p >= seg.start && p <= seg.end) return seg.label
    }
    return TERRAIN_PROFILE[TERRAIN_PROFILE.length - 1].label
  }

  /**
   * 局部坡度（正規化高度對 progress 的導數近似，單位：高度/進度）。
   * 正 = 上坡，負 = 下坡。
   */
  private _getTerrainGrade(progress: number): number {
    const eps = 0.008
    const h0 = this._getTerrainHeight(progress - eps)
    const h1 = this._getTerrainHeight(progress + eps)
    return (h1 - h0) / (2 * eps)
  }

  /** 畫面 x 對應的「路線進度」（以騎士為當前點，左右展開局部剖面） */
  private _progressAtScreenX(screenX: number): number {
    const W = this.app.screen.width
    const riderX = this._riderX()
    const base = this._getWorkoutProgress()
    return Math.max(0, Math.min(1,
      base + ((screenX - riderX) / Math.max(1, W)) * TERRAIN_SCREEN_SPAN))
  }

  /** 某螢幕 x 上的著地 Y（含坡度） */
  private _groundYAt(screenX: number): number {
    const elev = this._getTerrainHeight(this._progressAtScreenX(screenX))
    return this._baseGroundY() - elev * TERRAIN_MAX_ELEV_PX
  }

  /** 騎士位置著地 Y */
  private _groundY(): number {
    return this._groundYAt(this._riderX())
  }

  // ── 建構各層 ──────────────────────────────────────────

  private _buildBackground() {
    const W = this.app.screen.width
    const H = this.app.screen.height
    const gY = H * 0.60

    const sky = new PIXI.Graphics()
    sky.rect(0, 0, W, gY).fill({ color: Theme.scene.sky })
    this.bgLayer.addChild(sky)

    const haze = new PIXI.Graphics()
    for (let i = 0; i < 8; i++) {
      const y = (gY / 8) * i
      const a = 0.04 * (1 - i / 8)
      haze.rect(0, y, W, gY / 8 + 1).fill({ color: 0x1a1a3e, alpha: a })
    }
    this.bgLayer.addChild(haze)

    this.moonGfx = new PIXI.Graphics()
    for (let r = 55; r > 22; r -= 6) {
      this.moonGfx.circle(0, 0, r).fill({ color: 0xe8e0c0, alpha: (55 - r) / 55 * 0.05 })
    }
    this.moonGfx.circle(0, 0, 22).fill({ color: 0xe8e0c0 })
    const moonMask = new PIXI.Graphics()
    moonMask.circle(12, -4, 18).fill({ color: Theme.scene.sky })
    this.moonGfx.addChild(moonMask)
    this.moonGfx.x = W * 0.85
    this.moonGfx.y = H * 0.10
    this.bgLayer.addChild(this.moonGfx)

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

    const mtn1 = new PIXI.Graphics()
    const peaks1: number[] = [
      0, gY,
      W*0.06, H*0.38, W*0.16, H*0.26, W*0.26, H*0.41,
      W*0.37, H*0.20, W*0.47, H*0.34, W*0.58, H*0.23,
      W*0.68, H*0.37, W*0.78, H*0.28, W*0.88, H*0.40,
      W, H*0.35, W, gY,
    ]
    mtn1.poly(peaks1).fill({ color: Theme.scene.mountain1 })
    this.bgLayer.addChild(mtn1)

    const mtn2 = new PIXI.Graphics()
    const peaks2: number[] = [
      0, gY,
      W*0.08, H*0.44, W*0.20, H*0.35, W*0.32, H*0.46,
      W*0.42, H*0.32, W*0.55, H*0.44, W*0.65, H*0.36,
      W*0.78, H*0.48, W*0.88, H*0.38, W, H*0.52, W, gY,
    ]
    mtn2.poly(peaks2).fill({ color: Theme.scene.mountain2 })
    this.bgLayer.addChild(mtn2)
  }

  private _buildRoad() {
    const W = this.app.screen.width

    this.roadBody  = new PIXI.Graphics()
    this.roadEdge  = new PIXI.Graphics()
    this.roadShade = new PIXI.Graphics()
    this.roadGrass = new PIXI.Graphics()
    this.roadLayer.addChild(this.roadBody, this.roadEdge, this.roadShade, this.roadGrass)

    // 虛線（y 每幀依地形更新）
    for (let x = 0; x < W + 160; x += 160) {
      const dash = new PIXI.Graphics()
      dash.roundRect(0, 0, 60, 3, 1.5).fill({ color: 0x8a7040, alpha: 0.65 })
      this.roadLayer.addChild(dash)
      this.roadDashes.push(dash)
    }

    this._redrawRoadSurface(this._getWorkoutProgress())
  }

  /**
   * 依目前進度重繪路面多邊形：頂緣跟隨局部海拔剖面，
   * 形成可見的上坡／下坡梯形。
   */
  private _redrawRoadSurface(progress: number) {
    const W = this.app.screen.width
    const H = this.app.screen.height
    const samples = Math.max(24, Math.ceil(W / 40))
    const topPts: number[] = []

    for (let i = 0; i <= samples; i++) {
      const x = (i / samples) * W
      // 與 progress 參數對齊：以騎士為錨的局部剖面
      const localP = Math.max(0, Math.min(1,
        progress + ((x - this._riderX()) / Math.max(1, W)) * TERRAIN_SCREEN_SPAN))
      const y = this._baseGroundY() - this._getTerrainHeight(localP) * TERRAIN_MAX_ELEV_PX
      // 路面頂略高於著地線
      const surfaceY = y - 6
      topPts.push(x, surfaceY)
    }

    // 路面主體：頂緣折線 → 右下 → 左下
    const bodyPts: number[] = [...topPts, W, H, 0, H]
    this.roadBody.clear()
    this.roadBody.poly(bodyPts).fill({ color: Theme.scene.road })

    // 路邊細線（頂緣）
    this.roadEdge.clear()
    this.roadEdge.moveTo(topPts[0], topPts[1])
    for (let i = 2; i < topPts.length; i += 2) {
      this.roadEdge.lineTo(topPts[i], topPts[i + 1])
    }
    this.roadEdge.stroke({ color: 0x4a4a4a, width: 2, alpha: 0.85 })

    // 近景暗化帶（沿頂緣向下偏移）
    this.roadShade.clear()
    const shadePts: number[] = []
    for (let i = 0; i < topPts.length; i += 2) {
      shadePts.push(topPts[i], topPts[i + 1] + (H - topPts[i + 1]) * 0.55)
    }
    const shadePoly = [...shadePts, W, H, 0, H]
    this.roadShade.poly(shadePoly).fill({ color: 0x000000, alpha: 0.16 })

    // 草邊
    this.roadGrass.clear()
    this.roadGrass.rect(0, H - 14, W, 14).fill({ color: Theme.scene.grass })
  }

  private _buildLamps() {
    const W = this.app.screen.width

    for (let x = 100; x < W + 100; x += 180) {
      const lamp = new PIXI.Container()

      const pole = new PIXI.Graphics()
      pole.moveTo(0, 0).lineTo(0, -72).stroke({ color: 0x4a4a4a, width: 3 })
      pole.moveTo(0, -72).lineTo(22, -72).stroke({ color: 0x4a4a4a, width: 3 })
      pole.roundRect(14, -78, 18, 8, 2).fill({ color: 0x6a6a6a })
      lamp.addChild(pole)

      const glow = new PIXI.Graphics()
      for (let r = 55; r > 0; r -= 5) {
        const a = (55 - r) / 55 * 0.14
        glow.circle(22, -72, r).fill({ color: Theme.scene.lamp, alpha: a })
      }
      lamp.addChild(glow)

      const pool = new PIXI.Graphics()
      pool.ellipse(22, 4, 36, 8).fill({ color: Theme.scene.lamp, alpha: 0.06 })
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
    const baseTexture = PIXI.Assets.get('rider')

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

  private _buildDog() {
    const baseTexture = PIXI.Assets.get('dog')

    this.dogRunSprite  = new PIXI.AnimatedSprite(
      this._makeSheetFrames(baseTexture, DOG_RUN_FRAMES))
    this.dogBarkSprite = new PIXI.AnimatedSprite(
      this._makeSheetFrames(baseTexture, DOG_BARK_FRAMES))

    const avgDogH = DOG_RUN_FRAMES.reduce((a, f) => a + f.h, 0) / DOG_RUN_FRAMES.length
    this.dogBaseScale = DOG_DISPLAY_H / avgDogH
    const groundY = this._groundY()

    for (const s of [this.dogRunSprite, this.dogBarkSprite]) {
      s.animationSpeed = 9 / 60
      s.loop     = true
      s.anchor.set(0.5, 1)
      s.scale.set(this.dogBaseScale)
      s.y = groundY
      s.play()
    }

    this.dogBarkSprite.visible = false
    this.gameLayer.addChild(this.dogRunSprite, this.dogBarkSprite)
  }

  private _buildSweat() {
    const baseTexture = PIXI.Assets.get('sweat')
    const row = 2
    this.sweatTextures = Array.from({ length: SWEAT_COLS }, (_, col) =>
      new PIXI.Texture({
        source: baseTexture,
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
    )
    this.hud.build()
    this.hudLayer.addChild(this.hud)
  }

  // ── 地形簡圖（總體路程剖面）────────────────────────────

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

    // 右上：段落時間軸下方，避開 BLE／暫停鈕
    this.minimapRoot.x = W - MINIMAP_W - 16
    this.minimapRoot.y = 138
    this.hudLayer.addChild(this.minimapRoot)

    this._drawMinimapProfile()
    this._updateTerrainMinimap(this._getWorkoutProgress())
  }

  /** 靜態剖面曲線（整段訓練） */
  private _drawMinimapProfile() {
    const left = MINIMAP_PAD_X
    const right = MINIMAP_W - MINIMAP_PAD_X
    const top = 18
    const bottom = MINIMAP_H - 16
    const chartW = right - left
    const chartH = bottom - top
    const steps = 48

    const pts: number[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const h = this._getTerrainHeight(t)
      const x = left + t * chartW
      // 高度高 → 圖上 y 較小
      const y = bottom - h * chartH
      pts.push(x, y)
    }

    this.minimapFill.clear()
    const fillPts = [...pts, right, bottom, left, bottom]
    this.minimapFill.poly(fillPts).fill({ color: 0x22d3ee, alpha: 0.08 })

    this.minimapLine.clear()
    this.minimapLine.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) {
      this.minimapLine.lineTo(pts[i], pts[i + 1])
    }
    this.minimapLine.stroke({ color: 0xcbd5e1, width: 1.6, alpha: 0.9 })

    // 底線
    this.minimapLine.moveTo(left, bottom).lineTo(right, bottom)
      .stroke({ color: 0x64748b, width: 1, alpha: 0.35 })
  }

  /** 更新紅點位置與坡度標籤 */
  private _updateTerrainMinimap(progress: number) {
    if (!this.minimapMarker) return

    const left = MINIMAP_PAD_X
    const right = MINIMAP_W - MINIMAP_PAD_X
    const top = 18
    const bottom = MINIMAP_H - 16
    const chartW = right - left
    const chartH = bottom - top
    const p = Math.max(0, Math.min(1, progress))
    const h = this._getTerrainHeight(p)
    const mx = left + p * chartW
    const my = bottom - h * chartH

    this.minimapMarker.clear()
    // 柔光
    for (let r = 10; r >= 4; r -= 2) {
      this.minimapMarker.circle(mx, my, r)
        .fill({ color: 0xef4444, alpha: 0.08 * (11 - r) })
    }
    this.minimapMarker.circle(mx, my, 4).fill({ color: 0xef4444, alpha: 0.95 })
    this.minimapMarker.circle(mx, my, 1.6).fill({ color: 0xfff1f2, alpha: 0.95 })

    // 垂直虛線感：細線連到底
    this.minimapMarker.moveTo(mx, my + 5).lineTo(mx, bottom)
      .stroke({ color: 0xef4444, width: 1, alpha: 0.25 })

    this.minimapLabel.text = this._getTerrainLabel(p)

    const grade = this._getTerrainGrade(p)
    // 轉成近似百分比坡度顯示（視覺量級）
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

    // HUD 在暫停/完成時仍需更新（顯示覆蓋層）
    if (this.state.isPaused || this.state.isFinished) {
      this._redrawRoadSurface(progress)
      this._layoutTerrainProps(progress)
      this._updateTerrainMinimap(progress)
      this.hud?.update(dt, this.dogScreenX, riderGround, DOG_DISPLAY_H)
      return
    }
    if (!this.state.isRunning) return

    this.elapsed    += dt
    const speed      = Math.max(1.5, this.state.currentPower / 25)
    this.roadOffset  = (this.roadOffset + speed * dt * 80) % 160

    // 路面剖面隨進度變化
    this._redrawRoadSurface(progress)

    // 虛線滾動 + 貼合地形
    this.roadDashes.forEach((d, i) => {
      d.x = (i * 160 - this.roadOffset + 160 * 10) % (this.roadDashes.length * 160)
        - 160
      d.y = this._groundYAt(d.x + 30) + 14
    })

    // 路燈橫移 + 貼合地形
    for (let i = 0; i < this.lampSprites.length; i++) {
      this.lampXs[i] -= speed * dt * 80
      if (this.lampXs[i] < -20) this.lampXs[i] = this.app.screen.width + 80
      this.lampSprites[i].x = this.lampXs[i]
      this.lampSprites[i].y = this._groundYAt(this.lampXs[i])
    }

    this._updateDogX(dt)
    this._updateRider(progress)
    this._updateDog()
    this._updateShake(dt)
    this._updateSweat(dt)
    this._updateTerrainMinimap(progress)
    this.hud?.update(dt, this.dogScreenX, this._groundY(), DOG_DISPLAY_H)
    this._updateStars()
  }

  /** 暫停時仍讓虛線／燈對齊當前地形 */
  private _layoutTerrainProps(_progress: number) {
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
    if (this.dogRunSprite) {
      const dogY = this._groundYAt(this.dogScreenX)
      this.dogRunSprite.y = this.dogBarkSprite.y = dogY
    }
  }

  /** 距離 0 → 貼近騎士左側；距離 MAX → 偏左遠方 */
  private _calcTargetDogX(): number {
    const riderX = this._riderX()
    const t = Math.max(0, Math.min(1, this.state.distance / GameState.MAX_DIST))
    const nearX = riderX - 95
    const farX  = -40
    return nearX + t * (farX - nearX)
  }

  private _updateDogX(dt: number) {
    const state = this.state.dogState
    const target = this._calcTargetDogX()

    if (state === 'retreating') {
      this.dogScreenX -= Math.max(420, Math.abs(this.dogScreenX) * 0.8 + 280) * dt
      if (this.dogScreenX < -180) this.dogScreenX = -180
      return
    }

    if (state === 'resting') {
      if (this.dogScreenX > -180) {
        this.dogScreenX -= 600 * dt
      } else {
        this.dogScreenX = -180
      }
      return
    }

    if (state === 'returning') {
      if (this.dogScreenX < -150) this.dogScreenX = -150
      const gap = target - this.dogScreenX
      const speed = Math.max(520, Math.min(1100, 480 + gap * 1.8))
      this.dogScreenX += speed * dt
      if (this.dogScreenX >= target) {
        this.dogScreenX = target
        this.state.onReturnComplete()
      }
      return
    }

    const follow = Math.min(1, dt * 3.2)
    this.dogScreenX += (target - this.dogScreenX) * follow
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

    // 依局部坡度微傾（上坡後仰、下坡前傾）
    const grade = this._getTerrainGrade(progress)
    const tilt = Math.max(-0.12, Math.min(0.12, -grade * 0.04))
    this.riderSprite.rotation = tilt
    this.riderNervSprite.rotation = tilt
  }

  private _updateDog() {
    const ds = this.state.dogState
    const showBark = this.state.isDanger
      || ds === 'returning'
      || (ds === 'chasing' && this.state.isNervous && this.state.distance < 18)
    const groundY = this._groundYAt(this.dogScreenX)

    this.dogRunSprite.x  = this.dogScreenX
    this.dogBarkSprite.x = this.dogScreenX
    this.dogRunSprite.y  = groundY
    this.dogBarkSprite.y = groundY

    const pulse = this.state.isDanger ? 1 + Math.sin(this.elapsed * 8) * 0.03 : 1
    const scale = this.dogBaseScale * pulse
    for (const s of [this.dogRunSprite, this.dogBarkSprite]) {
      s.scale.set(scale)
    }

    // 狗亦隨所在 x 的坡度微傾
    const dogP = this._progressAtScreenX(this.dogScreenX)
    const tilt = Math.max(-0.12, Math.min(0.12, -this._getTerrainGrade(dogP) * 0.04))
    this.dogRunSprite.rotation = tilt
    this.dogBarkSprite.rotation = tilt

    let animSpeed = 9 / 60
    if (ds === 'returning') animSpeed = 16 / 60
    else if (ds === 'retreating') animSpeed = 13 / 60
    else if (this.state.isDanger) animSpeed = 13 / 60
    else if (this.state.isNervous) animSpeed = 11 / 60

    const sprite = showBark ? this.dogBarkSprite : this.dogRunSprite
    sprite.animationSpeed = animSpeed

    const visible = this.dogScreenX > -140 && ds !== 'resting'
    this.dogRunSprite.visible  = visible && !showBark
    this.dogBarkSprite.visible = visible &&  showBark
  }

  private _updateShake(dt: number) {
    this.shakeAmount *= 0.82
    if (this.state.isDanger) {
      this.shakeAmount  = Math.min(6, this.shakeAmount + 0.5)
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
      p.vy        += 220 * dt
      p.life      -= dt
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
    sp.width  = sz
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
