// 追逐遊戲主場景 — PixiJS v8
// 完整場景：背景、路面、路燈、騎士、柴犬、汗珠粒子、商業級 HUD

import * as PIXI from 'pixi.js'
import { GameState } from './game-state'
import { GameHud } from './hud'
import { Theme } from '../ui/theme'

// Sprite Sheet 規格（緊密裁切，去除格線內空白）
interface FrameRect { x: number; y: number; w: number; h: number }

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
    this._buildDangerOverlay()

    this.dogScreenX = this._calcTargetDogX()
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

  private _roadTop(): number {
    return this.app.screen.height * ROAD_TOP_RATIO
  }

  private _groundY(): number {
    const H = this.app.screen.height
    const roadH = H * (1 - ROAD_TOP_RATIO)
    return this._roadTop() + roadH * GROUND_IN_ROAD
  }

  // ── 建構各層 ──────────────────────────────────────────

  private _buildBackground() {
    const W = this.app.screen.width
    const H = this.app.screen.height
    const gY = H * 0.60

    // 天空漸層（多層模擬）
    const sky = new PIXI.Graphics()
    sky.rect(0, 0, W, gY).fill({ color: Theme.scene.sky })
    this.bgLayer.addChild(sky)

    // 頂部微藍光
    const haze = new PIXI.Graphics()
    for (let i = 0; i < 8; i++) {
      const y = (gY / 8) * i
      const a = 0.04 * (1 - i / 8)
      haze.rect(0, y, W, gY / 8 + 1).fill({ color: 0x1a1a3e, alpha: a })
    }
    this.bgLayer.addChild(haze)

    // 月亮 + 光暈
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

    // 星星
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

    // 遠山剪影
    const mtn1 = new PIXI.Graphics()
    const peaks1: number[] = [
      0, gY,
      W*0.06, H*0.38, W*0.16, H*0.26, W*0.26, H*0.41,
      W*0.37, H*0.20, W*0.47, H*0.34, W*0.58, H*0.23,
      W*0.68, H*0.37, W*0.78, H*0.28, W*0.88, H*0.40,
      W, H*0.35, W, gY
    ]
    mtn1.poly(peaks1).fill({ color: Theme.scene.mountain1 })
    this.bgLayer.addChild(mtn1)

    const mtn2 = new PIXI.Graphics()
    const peaks2: number[] = [
      0, gY,
      W*0.08, H*0.44, W*0.20, H*0.35, W*0.32, H*0.46,
      W*0.42, H*0.32, W*0.55, H*0.44, W*0.65, H*0.36,
      W*0.78, H*0.48, W*0.88, H*0.38, W, H*0.52, W, gY
    ]
    mtn2.poly(peaks2).fill({ color: Theme.scene.mountain2 })
    this.bgLayer.addChild(mtn2)
  }

  private _buildRoad() {
    const W = this.app.screen.width
    const H = this.app.screen.height
    const gY = H * 0.60
    const roadH = H - gY

    const road = new PIXI.Graphics()
    // 路面主體
    road.rect(0, gY, W, roadH).fill({ color: Theme.scene.road })
    // 路邊細線
    road.rect(0, gY, W, 2).fill({ color: 0x3a3a3a })
    // 近景暗化
    road.rect(0, gY + roadH * 0.75, W, roadH * 0.25).fill({ color: 0x000000, alpha: 0.18 })
    // 草邊
    road.rect(0, H - 14, W, 14).fill({ color: Theme.scene.grass })
    this.roadLayer.addChild(road)

    // 虛線
    for (let x = 0; x < W + 160; x += 160) {
      const dash = new PIXI.Graphics()
      dash.roundRect(0, 0, 60, 3, 1.5).fill({ color: 0x8a7040, alpha: 0.65 })
      dash.y = gY + roadH * 0.42
      this.roadLayer.addChild(dash)
      this.roadDashes.push(dash)
    }
  }

  private _buildLamps() {
    const W = this.app.screen.width
    const H = this.app.screen.height
    const gY = H * 0.60

    for (let x = 100; x < W + 100; x += 180) {
      const lamp = new PIXI.Container()

      const pole = new PIXI.Graphics()
      pole.moveTo(0, 0).lineTo(0, -72).stroke({ color: 0x4a4a4a, width: 3 })
      pole.moveTo(0, -72).lineTo(22, -72).stroke({ color: 0x4a4a4a, width: 3 })
      pole.roundRect(14, -78, 18, 8, 2).fill({ color: 0x6a6a6a })
      lamp.addChild(pole)

      // 燈光暈
      const glow = new PIXI.Graphics()
      for (let r = 55; r > 0; r -= 5) {
        const a = (55 - r) / 55 * 0.14
        glow.circle(22, -72, r).fill({ color: Theme.scene.lamp, alpha: a })
      }
      lamp.addChild(glow)

      // 地面光斑
      const pool = new PIXI.Graphics()
      pool.ellipse(22, 4, 36, 8).fill({ color: Theme.scene.lamp, alpha: 0.06 })
      lamp.addChild(pool)

      lamp.x = x
      lamp.y = gY
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
    // 四邊柔和暗角，提升電影感
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

  private _buildDangerOverlay() {
    this.dangerOverlay = new PIXI.Graphics()
    this.dangerOverlay.alpha = 0
    this.fxLayer.addChild(this.dangerOverlay)
  }

  // ── 主更新 ────────────────────────────────────────────

  update(dt: number) {
    if (!this.ready) return

    // HUD 在暫停/完成時仍需更新（顯示覆蓋層）
    if (this.state.isPaused || this.state.isFinished) {
      this.hud?.update(dt, this.dogScreenX, this._groundY(), DOG_DISPLAY_H)
      return
    }
    if (!this.state.isRunning) return

    this.elapsed    += dt
    const speed      = Math.max(1.5, this.state.currentPower / 25)
    this.roadOffset  = (this.roadOffset + speed * dt * 80) % 160

    this.roadDashes.forEach((d, i) => {
      d.x = (i * 160 - this.roadOffset + 160 * 10) % (this.roadDashes.length * 160)
        - 160
    })

    for (let i = 0; i < this.lampSprites.length; i++) {
      this.lampXs[i] -= speed * dt * 80
      if (this.lampXs[i] < -20) this.lampXs[i] = this.app.screen.width + 80
      this.lampSprites[i].x = this.lampXs[i]
    }

    this._updateDogX(dt)
    this._updateRider()
    this._updateDog()
    this._updateShake(dt)
    this._updateSweat(dt)
    this.hud?.update(dt, this.dogScreenX, this._groundY(), DOG_DISPLAY_H)
    this._updateStars()
  }

  private _calcTargetDogX(): number {
    const riderX = this._riderX()
    const t = Math.max(0, Math.min(1, this.state.distance / GameState.MAX_DIST))
    return riderX - 80 - t * (riderX - 80 + 100)
  }

  private _updateDogX(dt: number) {
    if (this.state.dogState === 'resting') {
      this.dogScreenX = -160
      return
    }
    if (this.state.dogState === 'returning') {
      this.dogScreenX += 900 * dt
      const target = this._calcTargetDogX()
      if (this.dogScreenX >= target) {
        this.dogScreenX = target
        this.state.dogState = 'chasing'
      }
      return
    }
    const target = this._calcTargetDogX()
    this.dogScreenX += (target - this.dogScreenX) * Math.min(1, dt * 2.5)
  }

  private _updateRider() {
    const isNerv = this.state.isNervous
    const groundY = this._groundY()
    const riderX  = this._riderX()

    this.riderSprite.visible     = !isNerv
    this.riderNervSprite.visible =  isNerv
    this.riderSprite.animationSpeed     = 8 / 60
    this.riderNervSprite.animationSpeed = 10 / 60
    this.riderSprite.x = this.riderNervSprite.x = riderX
    this.riderSprite.y = this.riderNervSprite.y = groundY
  }

  private _updateDog() {
    const showBark = this.state.isDanger || this.state.dogState === 'returning'
    const groundY = this._groundY()

    this.dogRunSprite.x  = this.dogScreenX
    this.dogBarkSprite.x = this.dogScreenX
    this.dogRunSprite.y  = groundY
    this.dogBarkSprite.y = groundY

    const pulse = this.state.isDanger ? 1 + Math.sin(this.elapsed * 8) * 0.03 : 1
    const scale = this.dogBaseScale * pulse
    for (const s of [this.dogRunSprite, this.dogBarkSprite]) {
      s.scale.set(scale)
    }
    const sprite = showBark ? this.dogBarkSprite : this.dogRunSprite
    sprite.animationSpeed = this.state.isDanger ? 12 / 60
      : this.state.dogState === 'returning' ? 14 / 60 : 9 / 60

    const visible = this.dogScreenX > -140
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
      // 漸層式紅邊
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
    sp.x = this._riderX() + (Math.random() - 0.7) * 55
    sp.y = this._groundY() - RIDER_DISPLAY_H * 0.82 + Math.random() * 25
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
