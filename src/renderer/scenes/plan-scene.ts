// 訓練計畫選擇場景

import * as PIXI from 'pixi.js'
import { PLANS, type WorkoutPlan } from '../game/game-state'
import { Theme, textStyle } from '../ui/theme'
import { createButton, createGlassPanel, type UiButton } from '../ui/components'

export class PlanScene extends PIXI.Container {
  private app: PIXI.Application
  private selected: WorkoutPlan = PLANS[0]
  private cardBtns: UiButton[] = []
  private detailPanel!: PIXI.Container
  private detailBody!: PIXI.Text
  private onConfirm: (plan: WorkoutPlan) => void
  private onBack: () => void

  constructor(
    app: PIXI.Application,
    handlers: {
      onConfirm: (plan: WorkoutPlan) => void
      onBack: () => void
    },
  ) {
    super()
    this.app = app
    this.onConfirm = handlers.onConfirm
    this.onBack = handlers.onBack
  }

  build() {
    this.removeChildren()
    this.cardBtns = []
    const W = this.app.screen.width
    const H = this.app.screen.height

    // 背景
    const bg = new PIXI.Graphics()
    bg.rect(0, 0, W, H).fill({ color: Theme.bg.deep })
    this.addChild(bg)

    // 輕微星點
    for (let i = 0; i < 30; i++) {
      const g = new PIXI.Graphics()
      g.circle(0, 0, Math.random() * 1.2 + 0.3).fill({ color: 0xffffff, alpha: Math.random() * 0.35 + 0.1 })
      g.x = Math.random() * W
      g.y = Math.random() * H * 0.5
      this.addChild(g)
    }

    // 標題區
    const title = new PIXI.Text({
      text: '選擇訓練計畫',
      style: textStyle({ size: 28, color: Theme.text.primary, weight: '700' }),
    })
    title.x = 40
    title.y = 28
    this.addChild(title)

    const sub = new PIXI.Text({
      text: '依目標功率與時長選擇 · 騎行中柴犬會依功率表現追趕',
      style: textStyle({ size: 13, color: Theme.text.muted }),
    })
    sub.x = 40
    sub.y = 66
    this.addChild(sub)

    // 返回
    const backBtn = createButton('← 返回', 100, 36, {
      variant: 'ghost',
      onClick: () => this.onBack(),
    })
    backBtn.root.x = W - 140
    backBtn.root.y = 32
    this.addChild(backBtn.root)

    // 計畫卡片網格
    const cols = W > 1100 ? 3 : 2
    const gap = 14
    const listW = Math.min(W - 80, 720)
    const cardW = (listW - gap * (cols - 1)) / cols
    const cardH = 88
    const startX = 40
    const startY = 110

    PLANS.forEach((plan, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const btn = this._makePlanCard(plan, cardW, cardH, () => {
        this.selected = plan
        this._refreshSelection()
        this._updateDetail()
      })
      btn.root.x = startX + col * (cardW + gap)
      btn.root.y = startY + row * (cardH + gap)
      this.addChild(btn.root)
      this.cardBtns.push(btn)
    })

    // 右側 / 下方詳情面板
    const detailW = Math.min(360, W - listW - 100)
    const detailX = startX + listW + 28
    const useBottom = detailW < 200

    this.detailPanel = new PIXI.Container()
    if (useBottom) {
      const rows = Math.ceil(PLANS.length / cols)
      this.detailPanel.x = 40
      this.detailPanel.y = startY + rows * (cardH + gap) + 12
      this._buildDetailContent(Math.min(W - 80, 700), 200)
    } else {
      this.detailPanel.x = detailX
      this.detailPanel.y = startY
      this._buildDetailContent(Math.max(280, detailW), 380)
    }
    this.addChild(this.detailPanel)

    this._refreshSelection()
    this._updateDetail()
  }

  private _makePlanCard(plan: WorkoutPlan, w: number, h: number, onClick: () => void): UiButton {
    // 用自訂卡片而非純按鈕
    const root = new PIXI.Container()
    root.eventMode = 'static'
    root.cursor = 'pointer'

    const bg = createGlassPanel(w, h, {
      radius: Theme.radius.md,
      fillAlpha: 0.7,
      borderAlpha: 0.15,
    })
    root.addChild(bg)

    const accent = new PIXI.Graphics()
    accent.roundRect(0, 12, 4, h - 24, 2).fill({ color: Theme.accent.cyan, alpha: 0.9 })
    root.addChild(accent)

    const name = new PIXI.Text({
      text: plan.name,
      style: textStyle({ size: 15, color: Theme.text.primary, weight: '700' }),
    })
    name.x = 18
    name.y = 18
    root.addChild(name)

    const totalMin = plan.segments
      .filter(s => s.durationMin < 999)
      .reduce((a, s) => a + s.durationMin, 0)
    const peak = Math.max(...plan.segments.map(s => s.watts))
    const meta = new PIXI.Text({
      text: totalMin > 0
        ? `${totalMin} 分鐘  ·  峰值 ${peak}W  ·  ${plan.segments.length} 段`
        : `自由時長  ·  目標 ${plan.segments[0].watts}W`,
      style: textStyle({ size: 11, color: Theme.text.muted }),
    })
    meta.x = 18
    meta.y = 48
    root.addChild(meta)

    let selected = false
    const redraw = (hover: boolean) => {
      bg.clear()
      const ba = selected ? 0.55 : hover ? 0.35 : 0.15
      const bc = selected ? Theme.accent.cyan : Theme.accent.cyan
      const fa = selected ? 0.82 : hover ? 0.78 : 0.65
      bg.roundRect(0, 0, w, h, Theme.radius.md)
        .fill({ color: Theme.bg.glass, alpha: fa })
        .stroke({ color: bc, alpha: ba, width: selected ? 2 : 1.5 })
      accent.clear()
      accent.roundRect(0, 12, 4, h - 24, 2)
        .fill({ color: selected ? Theme.accent.gold : Theme.accent.cyan, alpha: 0.95 })
    }

    root.on('pointerover', () => { redraw(true); root.scale.set(1.01) })
    root.on('pointerout',  () => { redraw(false); root.scale.set(1) })
    root.on('pointerdown', () => root.scale.set(0.98))
    root.on('pointerup',   () => { root.scale.set(1.01); onClick() })
    root.on('pointerupoutside', () => { redraw(false); root.scale.set(1) })

    redraw(false)

    return {
      root,
      setLabel: () => {},
      setEnabled: () => {},
      setSelected: (on) => { selected = on; redraw(false) },
      destroy: () => root.destroy({ children: true }),
    }
  }

  private _buildDetailContent(w: number, h: number) {
    this.detailPanel.removeChildren()

    const panel = createGlassPanel(w, h, {
      radius: Theme.radius.lg,
      fillAlpha: 0.75,
      border: Theme.accent.gold,
      borderAlpha: 0.22,
    })
    this.detailPanel.addChild(panel)

    const head = new PIXI.Text({
      text: '計畫詳情',
      style: textStyle({ size: 12, color: Theme.accent.gold, weight: '700', letterSpacing: 1.5 }),
    })
    head.x = 20
    head.y = 16
    this.detailPanel.addChild(head)

    this.detailBody = new PIXI.Text({
      text: '',
      style: textStyle({ size: 13, color: Theme.text.secondary, lineHeight: 22 }),
    })
    this.detailBody.x = 20
    this.detailBody.y = 42
    this.detailPanel.addChild(this.detailBody)

    const goBtn = createButton('開始此計畫 →', Math.min(220, w - 40), 48, {
      variant: 'primary',
      onClick: () => this.onConfirm(this.selected),
    })
    goBtn.root.x = 20
    goBtn.root.y = h - 68
    this.detailPanel.addChild(goBtn.root)
  }

  private _refreshSelection() {
    PLANS.forEach((p, i) => {
      this.cardBtns[i]?.setSelected(p.id === this.selected.id)
    })
  }

  private _updateDetail() {
    const plan = this.selected
    const lines = plan.segments.map((s, i) => {
      const dur = s.durationMin >= 999 ? '∞' : `${s.durationMin}分`
      return `${i + 1}. ${s.name.padEnd(10, '　')}  ${s.watts}W  ·  ${dur}`
    })
    this.detailBody.text = `${plan.name}\n\n${lines.join('\n')}`
  }

  update(_dt: number) {}

  resize() {
    this.build()
  }
}
