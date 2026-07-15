// 商業級主選單場景

import * as PIXI from 'pixi.js'
import { Theme, textStyle } from '../ui/theme'
import { createButton, createGlassPanel, createStatusPill, type UiButton } from '../ui/components'

export class MenuScene extends PIXI.Container {
  private app: PIXI.Application
  private stars: Array<{ g: PIXI.Graphics; base: number; phase: number }> = []
  private elapsed = 0
  private titlePulse!: PIXI.Text
  private blePill!: ReturnType<typeof createStatusPill>
  private onStart: () => void
  private onBleScan: () => void

  constructor(
    app: PIXI.Application,
    handlers: { onStart: () => void; onBleScan: () => void },
  ) {
    super()
    this.app = app
    this.onStart = handlers.onStart
    this.onBleScan = handlers.onBleScan
  }

  build() {
    this.removeChildren()
    this.stars = []
    const W = this.app.screen.width
    const H = this.app.screen.height

    // 背景漸層
    const bg = new PIXI.Graphics()
    bg.rect(0, 0, W, H).fill({ color: Theme.bg.deep })
    this.addChild(bg)

    // 星空
    for (let i = 0; i < 70; i++) {
      const g = new PIXI.Graphics()
      const r = Math.random() * 1.5 + 0.3
      g.circle(0, 0, r).fill({ color: 0xffffff })
      g.x = Math.random() * W
      g.y = Math.random() * H * 0.7
      g.alpha = Math.random() * 0.55 + 0.2
      this.addChild(g)
      this.stars.push({ g, base: g.alpha, phase: Math.random() * Math.PI * 2 })
    }

    // 遠山
    const mtn = new PIXI.Graphics()
    const gy = H * 0.72
    mtn.poly([
      0, gy,
      W * 0.1, H * 0.48, W * 0.22, H * 0.38, W * 0.35, H * 0.52,
      W * 0.48, H * 0.32, W * 0.62, H * 0.48, W * 0.75, H * 0.36,
      W * 0.88, H * 0.50, W, H * 0.42, W, H, 0, H,
    ]).fill({ color: Theme.scene.mountain1 })
    this.addChild(mtn)

    const mtn2 = new PIXI.Graphics()
    mtn2.poly([
      0, gy + 20,
      W * 0.15, H * 0.58, W * 0.3, H * 0.5, W * 0.5, H * 0.6,
      W * 0.7, H * 0.52, W * 0.9, H * 0.62, W, H * 0.55, W, H, 0, H,
    ]).fill({ color: Theme.scene.mountain2 })
    this.addChild(mtn2)

    // 月光暈
    const moonGlow = new PIXI.Graphics()
    for (let r = 80; r > 0; r -= 8) {
      moonGlow.circle(0, 0, r).fill({ color: 0xe8e0c0, alpha: (80 - r) / 80 * 0.04 })
    }
    moonGlow.circle(0, 0, 18).fill({ color: 0xe8e0c0, alpha: 0.9 })
    moonGlow.x = W * 0.82
    moonGlow.y = H * 0.16
    this.addChild(moonGlow)

    // 中央卡片
    const cardW = Math.min(440, W - 48)
    const cardH = 420
    const card = createGlassPanel(cardW, cardH, {
      radius: Theme.radius.xl,
      fillAlpha: 0.78,
      border: Theme.accent.cyan,
      borderAlpha: 0.28,
      borderWidth: 1.5,
    })
    card.x = (W - cardW) / 2
    card.y = (H - cardH) / 2 - 10
    this.addChild(card)

    // 品牌標
    const brand = new PIXI.Text({
      text: 'SMART CYCLING',
      style: textStyle({
        size: 11,
        color: Theme.accent.cyan,
        weight: '700',
        letterSpacing: 4,
        align: 'center',
      }),
    })
    brand.anchor.set(0.5, 0)
    brand.x = W / 2
    brand.y = card.y + 36
    this.addChild(brand)

    // 主標題
    this.titlePulse = new PIXI.Text({
      text: '智慧騎行',
      style: textStyle({ size: 42, color: Theme.text.primary, weight: '700', align: 'center' }),
    })
    this.titlePulse.anchor.set(0.5, 0)
    this.titlePulse.x = W / 2
    this.titlePulse.y = card.y + 58
    this.addChild(this.titlePulse)

    const sub = new PIXI.Text({
      text: '追逐模式',
      style: textStyle({ size: 22, color: Theme.accent.gold, weight: '700', align: 'center', letterSpacing: 6 }),
    })
    sub.anchor.set(0.5, 0)
    sub.x = W / 2
    sub.y = card.y + 112
    this.addChild(sub)

    // 分隔線
    const line = new PIXI.Graphics()
    line.moveTo(0, 0).lineTo(cardW * 0.5, 0)
      .stroke({ color: Theme.accent.cyan, alpha: 0.35, width: 1.5 })
    line.x = (W - cardW * 0.5) / 2
    line.y = card.y + 152
    this.addChild(line)

    const desc = new PIXI.Text({
      text: '保持目標功率 · 甩開柴犬追趕\n真實功率訓練 · 遊戲化體驗',
      style: textStyle({
        size: 13,
        color: Theme.text.muted,
        align: 'center',
        lineHeight: 22,
      }),
    })
    desc.anchor.set(0.5, 0)
    desc.x = W / 2
    desc.y = card.y + 168
    this.addChild(desc)

    // 開始按鈕
    const startBtn = createButton('開始訓練', 260, 54, {
      variant: 'primary',
      onClick: () => this.onStart(),
    })
    startBtn.root.x = (W - 260) / 2
    startBtn.root.y = card.y + 240
    this.addChild(startBtn.root)

    // BLE 掃描
    const bleBtn = createButton('連接騎行台 (BLE)', 260, 46, {
      variant: 'secondary',
      onClick: () => this.onBleScan(),
    })
    bleBtn.root.x = (W - 260) / 2
    bleBtn.root.y = card.y + 308
    this.addChild(bleBtn.root)

    // BLE 狀態
    this.blePill = createStatusPill('模擬模式 · 可直接開始', Theme.status.muted)
    this.blePill.root.x = W / 2 - 90
    this.blePill.root.y = card.y + 368
    this.addChild(this.blePill.root)

    // 底部版本
    const ver = new PIXI.Text({
      text: 'v1.0  ·  智慧騎行 追逐模式',
      style: textStyle({ size: 11, color: Theme.text.dim, align: 'center' }),
    })
    ver.anchor.set(0.5, 1)
    ver.x = W / 2
    ver.y = H - 16
    this.addChild(ver)
  }

  update(dt: number) {
    this.elapsed += dt
    for (const { g, base, phase } of this.stars) {
      g.alpha = base * (0.5 + 0.5 * Math.sin(this.elapsed * 1.8 + phase))
    }
    if (this.titlePulse) {
      this.titlePulse.alpha = 0.88 + 0.12 * Math.sin(this.elapsed * 1.2)
    }
  }

  setBleStatus(connected: boolean, name: string) {
    if (!this.blePill) return
    if (connected) {
      this.blePill.set(`已連接 · ${name}`, Theme.status.success)
    } else {
      this.blePill.set('模擬模式 · 可直接開始', Theme.status.muted)
    }
  }

  resize() {
    this.build()
  }
}
