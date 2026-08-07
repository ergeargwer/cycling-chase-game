// 復古多層視差世界（L0–L4 + 路肩 props）
// 路徑與速度對齊 docs/retro-scene-props-spec.md
// 缺檔時 build() 回傳 false，由 ChaseScene 回落 Graphics 背景

import * as PIXI from 'pixi.js'
import {
  PARALLAX_SPEED,
  RETRO_DISPLAY,
  RETRO_SHARED_TILES,
  getRetroSceneManifest,
  styleAssetAlias,
  type VisualStyle,
} from './visual-style'
import { tryLoadTexture } from './asset-loader'

interface ScrollLayer {
  root: PIXI.Container
  /** 每單位路面位移的倍率 */
  speed: number
  offset: number
  /** 用於 TilingSprite 或手動 wrap 的寬度 */
  tileWidth: number
  sprites: PIXI.Sprite[]
  tiling?: PIXI.TilingSprite
}

interface RoadsideProp {
  sprite: PIXI.Sprite
  x: number
  groundAlign: boolean
}

export class RetroParallaxWorld {
  readonly root = new PIXI.Container()
  private layers: ScrollLayer[] = []
  private props: RoadsideProp[] = []
  private worldScale = RETRO_DISPLAY.worldScale
  private groundY = 0
  private screenW = 0
  private screenH = 0
  private built = false
  private propTextures: PIXI.Texture[] = []

  get isActive(): boolean {
    return this.built
  }

  /**
   * 載入並建立視差圖層。
   * @returns 是否至少載入到路面或中景之一（否則呼叫端應回落 modern Graphics）
   */
  async build(
    themeId: string,
    screenW: number,
    screenH: number,
    groundY: number,
  ): Promise<boolean> {
    this.destroy()
    this.screenW = screenW
    this.screenH = screenH
    this.groundY = groundY
    this.worldScale = RETRO_DISPLAY.worldScale
    this.root.removeChildren()

    const style: VisualStyle = 'retro'
    const manifest = getRetroSceneManifest(themeId)
    let anyScene = false

    // ── L0 天空 ──
    const skyTex = await tryLoadTexture(
      styleAssetAlias(style, 'tile-sky'),
      RETRO_SHARED_TILES.skyNight,
      style,
    )
    if (skyTex) {
      this._addTilingLayer('L0', skyTex, PARALLAX_SPEED.L0, 0, groundY)
      anyScene = true
    }

    // ── L1 遠景 strips ──
    for (let i = 0; i < manifest.farStrips.length; i++) {
      const src = manifest.farStrips[i]
      const tex = await tryLoadTexture(
        styleAssetAlias(style, `far-${themeId}-${i}`),
        src,
        style,
      )
      if (!tex) continue
      const y = groundY - tex.height * this.worldScale - 8
      this._addTilingLayer('L1', tex, PARALLAX_SPEED.L1, y, tex.height * this.worldScale)
      anyScene = true
    }

    // ── L2 中景 strips ──
    for (let i = 0; i < manifest.midStrips.length; i++) {
      const src = manifest.midStrips[i]
      const tex = await tryLoadTexture(
        styleAssetAlias(style, `mid-${themeId}-${i}`),
        src,
        style,
      )
      if (!tex) continue
      const h = tex.height * this.worldScale
      const y = groundY - h
      this._addTilingLayer('L2', tex, PARALLAX_SPEED.L2, y, h)
      anyScene = true
    }

    // ── L4 路面 ──
    const roadSrc = manifest.roadBody ?? RETRO_SHARED_TILES.roadBody
    const roadTex = await tryLoadTexture(
      styleAssetAlias(style, 'tile-road'),
      roadSrc,
      style,
    )
    if (roadTex) {
      const h = roadTex.height * this.worldScale
      this._addTilingLayer('L4', roadTex, PARALLAX_SPEED.L4, groundY - 4, h)
      anyScene = true
    }

    // 分道線
    const dashTex = await tryLoadTexture(
      styleAssetAlias(style, 'tile-dash'),
      RETRO_SHARED_TILES.roadDash,
      style,
    )
    if (dashTex) {
      const h = dashTex.height * this.worldScale
      this._addTilingLayer(
        'L4',
        dashTex,
        PARALLAX_SPEED.L4,
        groundY + 12,
        h,
      )
    }

    // 路肩
    const shoulderSrc = manifest.shoulder ?? RETRO_SHARED_TILES.shoulder
    const shoulderTex = await tryLoadTexture(
      styleAssetAlias(style, 'tile-shoulder'),
      shoulderSrc,
      style,
    )
    if (shoulderTex) {
      const h = shoulderTex.height * this.worldScale
      this._addTilingLayer(
        'L4',
        shoulderTex,
        PARALLAX_SPEED.L4,
        this.screenH - h,
        h,
      )
    }

    // ── L3 路肩 props ──
    this.propTextures = []
    for (let i = 0; i < manifest.roadsideProps.length; i++) {
      const src = manifest.roadsideProps[i]
      const tex = await tryLoadTexture(
        styleAssetAlias(style, `prop-${themeId}-${i}`),
        src,
        style,
      )
      if (tex) this.propTextures.push(tex)
    }
    if (this.propTextures.length > 0) {
      this._spawnRoadsideProps()
      anyScene = true
    }

    // 月亮（L0 靜態）
    const moonTex = await tryLoadTexture(
      styleAssetAlias(style, 'moon'),
      RETRO_SHARED_TILES.moon,
      style,
    )
    if (moonTex) {
      const moon = new PIXI.Sprite(moonTex)
      moon.scale.set(this.worldScale)
      moon.roundPixels = true
      moon.x = screenW * 0.82
      moon.y = screenH * 0.12
      this.root.addChild(moon)
      anyScene = true
    }

    this.built = anyScene
    if (!anyScene) {
      console.warn(
        `[RetroParallax] no scene assets for theme=${themeId}; falling back to Graphics background`,
      )
    }
    return anyScene
  }

  private _addTilingLayer(
    layerId: keyof typeof PARALLAX_SPEED,
    tex: PIXI.Texture,
    speed: number,
    y: number,
    displayH: number,
  ) {
    const scale = this.worldScale
    const tileW = Math.max(1, tex.width * scale)
    const tileH = displayH

    // Pixi v8 TilingSprite
    let tiling: PIXI.TilingSprite | undefined
    try {
      tiling = new PIXI.TilingSprite({
        texture: tex,
        width: this.screenW + tileW,
        height: tileH,
      })
      tiling.tileScale.set(scale, scale)
      tiling.roundPixels = true
      tiling.x = 0
      tiling.y = y
      this.root.addChild(tiling)
    } catch {
      // 手動拼貼
      const cont = new PIXI.Container()
      const count = Math.ceil(this.screenW / tileW) + 2
      const sprites: PIXI.Sprite[] = []
      for (let i = 0; i < count; i++) {
        const s = new PIXI.Sprite(tex)
        s.scale.set(scale)
        s.roundPixels = true
        s.x = i * tileW
        s.y = 0
        cont.addChild(s)
        sprites.push(s)
      }
      cont.y = y
      this.root.addChild(cont)
      this.layers.push({
        root: cont,
        speed,
        offset: 0,
        tileWidth: tileW,
        sprites,
      })
      return
    }

    const root = new PIXI.Container()
    // TilingSprite 已加到 this.root；用 placeholder 記 offset
    this.layers.push({
      root,
      speed,
      offset: 0,
      tileWidth: tileW,
      sprites: [],
      tiling,
    })
  }

  private _spawnRoadsideProps() {
    if (this.propTextures.length === 0) return
    const spacing = 160
    let x = 40
    let idx = 0
    while (x < this.screenW + 200) {
      const tex = this.propTextures[idx % this.propTextures.length]
      const sp = new PIXI.Sprite(tex)
      sp.anchor.set(0.5, 1)
      sp.scale.set(this.worldScale)
      sp.roundPixels = true
      sp.x = x
      sp.y = this.groundY
      this.root.addChild(sp)
      this.props.push({ sprite: sp, x, groundAlign: true })
      x += spacing + (idx % 3) * 24
      idx++
    }
  }

  /**
   * @param roadDelta 本幀路面捲動像素（L4 基準，向左為正）
   */
  update(roadDelta: number, groundYAt?: (x: number) => number) {
    if (!this.built) return

    for (const layer of this.layers) {
      layer.offset = (layer.offset + roadDelta * layer.speed) % layer.tileWidth
      if (layer.offset < 0) layer.offset += layer.tileWidth

      if (layer.tiling) {
        layer.tiling.tilePosition.x = -layer.offset
      } else {
        for (let i = 0; i < layer.sprites.length; i++) {
          const s = layer.sprites[i]
          let px = i * layer.tileWidth - layer.offset
          // wrap
          while (px < -layer.tileWidth) px += layer.sprites.length * layer.tileWidth
          while (px > this.screenW) px -= layer.sprites.length * layer.tileWidth
          s.x = Math.round(px)
        }
      }
    }

    const propSpeed = PARALLAX_SPEED.L3
    for (const p of this.props) {
      p.x -= roadDelta * propSpeed
      if (p.x < -40) p.x += this.screenW + 120
      p.sprite.x = Math.round(p.x)
      if (p.groundAlign) {
        const gy = groundYAt ? groundYAt(p.x) : this.groundY
        p.sprite.y = Math.round(gy)
      }
    }
  }

  setGroundY(y: number) {
    this.groundY = y
  }

  destroy() {
    this.layers = []
    this.props = []
    this.propTextures = []
    this.root.removeChildren()
    this.built = false
  }
}
