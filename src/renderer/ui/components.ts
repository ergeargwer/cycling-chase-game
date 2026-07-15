// 可重用商業級 UI 元件

import * as PIXI from 'pixi.js'
import { Theme, textStyle } from './theme'

// ── Glass Panel ──────────────────────────────────────────

export function createGlassPanel(
  w: number,
  h: number,
  opts: {
    radius?: number
    fill?: number
    fillAlpha?: number
    border?: number
    borderAlpha?: number
    borderWidth?: number
  } = {},
): PIXI.Graphics {
  const g = new PIXI.Graphics()
  const r  = opts.radius ?? Theme.radius.md
  const fc = opts.fill ?? Theme.bg.glass
  const fa = opts.fillAlpha ?? 0.72
  const bc = opts.border ?? Theme.accent.cyan
  const ba = opts.borderAlpha ?? 0.18
  const bw = opts.borderWidth ?? 1.5

  g.roundRect(0, 0, w, h, r)
    .fill({ color: fc, alpha: fa })
    .stroke({ color: bc, alpha: ba, width: bw })

  // 頂部高光線
  g.moveTo(r, 1)
    .lineTo(w - r, 1)
    .stroke({ color: 0xffffff, alpha: 0.08, width: 1 })

  return g
}

// ── Primary Button ───────────────────────────────────────

export interface UiButton {
  root: PIXI.Container
  setLabel: (text: string) => void
  setEnabled: (on: boolean) => void
  setSelected: (on: boolean) => void
  destroy: () => void
}

export function createButton(
  label: string,
  w: number,
  h: number,
  opts: {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    onClick?: () => void
  } = {},
): UiButton {
  const variant = opts.variant ?? 'primary'
  const root = new PIXI.Container()
  root.eventMode = 'static'
  root.cursor = 'pointer'

  const palette: Record<string, { fill: number; fillA: number; border: number; borderA: number; text: number }> = {
    primary:   { fill: 0x0891b2, fillA: 0.95, border: Theme.accent.cyan, borderA: 0.55, text: 0xffffff },
    secondary: { fill: 0x1e1e36, fillA: 0.9,  border: 0x475569,          borderA: 0.45, text: Theme.text.primary },
    ghost:     { fill: 0x0a0a18, fillA: 0.5,  border: 0x334155,          borderA: 0.5,  text: Theme.text.secondary },
    danger:    { fill: 0x991b1b, fillA: 0.9,  border: Theme.status.danger, borderA: 0.55, text: 0xffffff },
  }
  const p = palette[variant]

  const bg = new PIXI.Graphics()
  const drawBg = (hover: boolean, selected: boolean, enabled: boolean) => {
    bg.clear()
    const boost = hover && enabled ? 0.08 : 0
    const fa = enabled ? p.fillA + boost : 0.35
    const ba = selected ? 0.85 : p.borderA + (hover ? 0.2 : 0)
    const bc = selected ? Theme.accent.cyan : p.border
    bg.roundRect(0, 0, w, h, Theme.radius.md)
      .fill({ color: p.fill, alpha: fa })
      .stroke({ color: bc, alpha: ba, width: selected ? 2 : 1.5 })
    if (variant === 'primary' && enabled) {
      // 底部微光
      bg.roundRect(4, h - 4, w - 8, 2, 1)
        .fill({ color: Theme.accent.cyan, alpha: hover ? 0.45 : 0.25 })
    }
  }
  drawBg(false, false, true)
  root.addChild(bg)

  const txt = new PIXI.Text({
    text: label,
    style: textStyle({ size: Math.min(18, h * 0.42), color: p.text, weight: '700', align: 'center' }),
  })
  txt.anchor.set(0.5)
  txt.x = w / 2
  txt.y = h / 2
  root.addChild(txt)

  let enabled = true
  let selected = false

  root.on('pointerover', () => { if (enabled) { drawBg(true, selected, enabled); root.scale.set(1.02) } })
  root.on('pointerout',  () => { drawBg(false, selected, enabled); root.scale.set(1) })
  root.on('pointerdown', () => { if (enabled) root.scale.set(0.97) })
  root.on('pointerup',   () => {
    if (!enabled) return
    root.scale.set(1.02)
    opts.onClick?.()
  })
  root.on('pointerupoutside', () => { drawBg(false, selected, enabled); root.scale.set(1) })

  return {
    root,
    setLabel: (t) => { txt.text = t },
    setEnabled: (on) => {
      enabled = on
      root.cursor = on ? 'pointer' : 'default'
      txt.alpha = on ? 1 : 0.45
      drawBg(false, selected, enabled)
    },
    setSelected: (on) => {
      selected = on
      drawBg(false, selected, enabled)
    },
    destroy: () => root.destroy({ children: true }),
  }
}

// ── Circular Gauge ───────────────────────────────────────

export class CircularGauge extends PIXI.Container {
  private track: PIXI.Graphics
  private arc: PIXI.Graphics
  private valueText: PIXI.Text
  private unitText: PIXI.Text
  private labelText: PIXI.Text
  private radius: number
  private lineW: number
  private _value = 0
  private _max = 100
  private _color: number = Theme.accent.cyan

  constructor(opts: {
    radius?: number
    lineWidth?: number
    label?: string
    unit?: string
    max?: number
  } = {}) {
    super()
    this.radius = opts.radius ?? 48
    this.lineW  = opts.lineWidth ?? 8
    this._max   = opts.max ?? 100

    this.track = new PIXI.Graphics()
    this.arc   = new PIXI.Graphics()
    this.addChild(this.track, this.arc)

    this.valueText = new PIXI.Text({
      text: '0',
      style: textStyle({ size: this.radius * 0.42, color: Theme.text.primary, weight: '700', mono: true, align: 'center' }),
    })
    this.valueText.anchor.set(0.5)
    this.valueText.y = -2
    this.addChild(this.valueText)

    this.unitText = new PIXI.Text({
      text: opts.unit ?? '%',
      style: textStyle({ size: this.radius * 0.22, color: Theme.text.muted, weight: '600', align: 'center' }),
    })
    this.unitText.anchor.set(0.5)
    this.unitText.y = this.radius * 0.32
    this.addChild(this.unitText)

    this.labelText = new PIXI.Text({
      text: opts.label ?? '',
      style: textStyle({ size: 11, color: Theme.text.dim, weight: '600', align: 'center', letterSpacing: 0.5 }),
    })
    this.labelText.anchor.set(0.5)
    this.labelText.y = this.radius + 16
    this.addChild(this.labelText)

    this._drawTrack()
    this.setValue(0)
  }

  private _drawTrack() {
    this.track.clear()
    this.track.circle(0, 0, this.radius)
      .stroke({ color: 0xffffff, alpha: 0.08, width: this.lineW })
  }

  setValue(v: number, color?: number) {
    this._value = v
    if (color !== undefined) this._color = color
    const pct = Math.max(0, Math.min(1.5, v / this._max))
    const start = -Math.PI * 0.75
    const end   = start + Math.PI * 1.5 * Math.min(1, pct)

    this.arc.clear()
    if (pct > 0.005) {
      this.arc.arc(0, 0, this.radius, start, end)
        .stroke({ color: this._color, width: this.lineW, cap: 'round' })
      // 外發光
      this.arc.arc(0, 0, this.radius, start, end)
        .stroke({ color: this._color, width: this.lineW + 6, alpha: 0.18, cap: 'round' })
    }

    this.valueText.text = String(Math.round(v))
    this.valueText.style.fill = this._color
  }

  setUnit(u: string) { this.unitText.text = u }
  setLabel(l: string) { this.labelText.text = l }
}

// ── Metric Card ──────────────────────────────────────────

export class MetricCard extends PIXI.Container {
  private valueTxt: PIXI.Text
  private unitTxt: PIXI.Text
  private labelTxt: PIXI.Text
  private accentBar: PIXI.Graphics
  private panel: PIXI.Graphics
  private w: number
  private h: number
  private accent: number

  constructor(opts: {
    width: number
    height?: number
    label: string
    unit?: string
    accent?: number
  }) {
    super()
    this.w = opts.width
    this.h = opts.height ?? 72
    this.accent = opts.accent !== undefined ? opts.accent : Theme.accent.cyan

    this.panel = createGlassPanel(this.w, this.h, {
      radius: Theme.radius.md,
      border: this.accent,
      borderAlpha: 0.15,
    })
    this.addChild(this.panel)

    this.accentBar = new PIXI.Graphics()
    this.accentBar.roundRect(0, 10, 3, this.h - 20, 2)
      .fill({ color: this.accent, alpha: 0.9 })
    this.addChild(this.accentBar)

    this.labelTxt = new PIXI.Text({
      text: opts.label.toUpperCase(),
      style: textStyle({ size: 10, color: Theme.text.dim, weight: '700', letterSpacing: 1.2 }),
    })
    this.labelTxt.x = 14
    this.labelTxt.y = 10
    this.addChild(this.labelTxt)

    this.valueTxt = new PIXI.Text({
      text: '—',
      style: textStyle({ size: 26, color: Theme.text.primary, weight: '700', mono: true }),
    })
    this.valueTxt.x = 14
    this.valueTxt.y = 28
    this.addChild(this.valueTxt)

    this.unitTxt = new PIXI.Text({
      text: opts.unit ?? '',
      style: textStyle({ size: 12, color: Theme.text.muted, weight: '600' }),
    })
    this.unitTxt.y = 40
    this.addChild(this.unitTxt)
  }

  setValue(v: string | number, color?: number) {
    this.valueTxt.text = typeof v === 'number' ? String(Math.round(v)) : v
    if (color !== undefined) {
      this.valueTxt.style.fill = color
      this.accentBar.clear()
      this.accentBar.roundRect(0, 10, 3, this.h - 20, 2).fill({ color, alpha: 0.9 })
    }
    this.unitTxt.x = this.valueTxt.x + this.valueTxt.width + 6
  }
}

// ── Progress Bar ─────────────────────────────────────────

export class ProgressBar extends PIXI.Container {
  private track: PIXI.Graphics
  private fillG: PIXI.Graphics
  private glowG: PIXI.Graphics
  private w: number
  private h: number
  private color: number
  private radius: number

  constructor(w: number, h = 8, color: number = Theme.accent.cyan) {
    super()
    this.w = w
    this.h = h
    this.color = color
    this.radius = h / 2

    this.track = new PIXI.Graphics()
    this.track.roundRect(0, 0, w, h, this.radius)
      .fill({ color: 0xffffff, alpha: 0.08 })
    this.addChild(this.track)

    this.glowG = new PIXI.Graphics()
    this.fillG = new PIXI.Graphics()
    this.addChild(this.glowG, this.fillG)
  }

  setProgress(t: number, color?: number) {
    const p = Math.max(0, Math.min(1, t))
    if (color !== undefined) this.color = color
    const fw = Math.max(this.h, this.w * p)

    this.fillG.clear()
    this.glowG.clear()
    if (p <= 0.001) return

    this.fillG.roundRect(0, 0, fw, this.h, this.radius)
      .fill({ color: this.color, alpha: 0.95 })
    this.glowG.roundRect(0, -2, fw, this.h + 4, this.radius + 2)
      .fill({ color: this.color, alpha: 0.18 })
  }
}

// ── Segment Timeline ─────────────────────────────────────

export class SegmentTimeline extends PIXI.Container {
  private barW: number
  private barH: number
  private track: PIXI.Graphics
  private segs: PIXI.Graphics
  private playhead: PIXI.Graphics
  private nameTxt: PIXI.Text
  private timeTxt: PIXI.Text

  constructor(width: number) {
    super()
    this.barW = width
    this.barH = 10

    this.track = new PIXI.Graphics()
    this.track.roundRect(0, 18, this.barW, this.barH, 5)
      .fill({ color: 0xffffff, alpha: 0.06 })
    this.addChild(this.track)

    this.segs = new PIXI.Graphics()
    this.addChild(this.segs)

    this.playhead = new PIXI.Graphics()
    this.addChild(this.playhead)

    this.nameTxt = new PIXI.Text({
      text: '',
      style: textStyle({ size: 12, color: Theme.accent.cyan, weight: '700' }),
    })
    this.nameTxt.y = 0
    this.addChild(this.nameTxt)

    this.timeTxt = new PIXI.Text({
      text: '',
      style: textStyle({ size: 11, color: Theme.text.muted, weight: '600', mono: true }),
    })
    this.timeTxt.anchor.set(1, 0)
    this.timeTxt.x = this.barW
    this.timeTxt.y = 0
    this.addChild(this.timeTxt)
  }

  update(
    segments: { name: string; durationMin: number; watts: number }[],
    segIdx: number,
    segElapsedSec: number,
    totalElapsedSec: number,
  ) {
    const finite = segments.filter(s => s.durationMin < 999)
    const totalMin = finite.reduce((a, s) => a + s.durationMin, 0) || 1

    this.segs.clear()
    let x = 0
    const colors = [
      Theme.accent.blue, Theme.accent.cyan, Theme.accent.purple,
      Theme.accent.gold, Theme.accent.orange, Theme.status.success,
    ]

    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]
      const dur = s.durationMin >= 999 ? Math.max(5, totalMin * 0.15) : s.durationMin
      const sw = (dur / (totalMin + (segments.some(x => x.durationMin >= 999) ? totalMin * 0.15 : 0))) * this.barW
      const isPast = i < segIdx
      const isCurr = i === segIdx
      const alpha = isPast ? 0.35 : isCurr ? 0.95 : 0.2
      this.segs.roundRect(x + 1, 18, Math.max(2, sw - 2), this.barH, 4)
        .fill({ color: colors[i % colors.length], alpha })
      x += sw
    }

    // playhead
    const progress = Math.min(1, totalElapsedSec / (totalMin * 60))
    const cx = progress * this.barW
    this.playhead.clear()
    this.playhead.circle(cx, 18 + this.barH / 2, 5)
      .fill({ color: Theme.text.primary, alpha: 0.95 })
    this.playhead.circle(cx, 18 + this.barH / 2, 8)
      .fill({ color: Theme.accent.cyan, alpha: 0.25 })

    const seg = segments[Math.min(segIdx, segments.length - 1)]
    this.nameTxt.text = `${seg.name}  ·  ${seg.watts}W`
    this.nameTxt.style.fill = Theme.accent.cyan

    if (seg.durationMin < 999) {
      const remain = Math.max(0, seg.durationMin * 60 - segElapsedSec)
      const m = Math.floor(remain / 60)
      const s = remain % 60
      this.timeTxt.text = `剩餘 ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    } else {
      this.timeTxt.text = '無限時'
    }
  }
}

// ── Threat / Distance Bar ────────────────────────────────

export class ThreatBar extends PIXI.Container {
  private bar: ProgressBar
  private titleTxt: PIXI.Text
  private distTxt: PIXI.Text
  private maxDist: number

  constructor(width: number, maxDist: number) {
    super()
    this.maxDist = maxDist

    this.titleTxt = new PIXI.Text({
      text: '追趕距離',
      style: textStyle({ size: 10, color: Theme.text.dim, weight: '700', letterSpacing: 1 }),
    })
    this.addChild(this.titleTxt)

    this.distTxt = new PIXI.Text({
      text: '— M',
      style: textStyle({ size: 13, color: Theme.text.primary, weight: '700', mono: true }),
    })
    this.distTxt.anchor.set(1, 0)
    this.distTxt.x = width
    this.addChild(this.distTxt)

    this.bar = new ProgressBar(width, 10, Theme.status.success)
    this.bar.y = 18
    this.addChild(this.bar)
  }

  setDistance(dist: number, dogState: string) {
    const t = Math.max(0, Math.min(1, dist / this.maxDist))
    let color: number = Theme.status.success
    let tag = ''
    if (dogState === 'resting') {
      color = Theme.accent.orange
      tag = ' 休息中'
    } else if (dogState === 'returning') {
      color = Theme.accent.amber
      tag = ' 追上中'
    } else if (dist <= 10) {
      color = Theme.status.danger
      tag = ' 危險'
    } else if (dist <= 25) {
      color = Theme.status.warning
      tag = ' 緊張'
    }

    this.bar.setProgress(t, color)
    this.distTxt.text = `${Math.round(dist)}M${tag}`
    this.distTxt.style.fill = color
  }
}

// ── Status Pill ──────────────────────────────────────────

export function createStatusPill(text: string, color: number): {
  root: PIXI.Container
  set: (text: string, color: number) => void
} {
  const root = new PIXI.Container()
  const bg = new PIXI.Graphics()
  const txt = new PIXI.Text({
    text,
    style: textStyle({ size: 11, color: Theme.text.primary, weight: '700' }),
  })
  txt.x = 18
  txt.y = 5
  root.addChild(bg, txt)

  const redraw = (t: string, c: number) => {
    txt.text = t
    txt.style.fill = c
    const w = Math.max(72, txt.width + 28)
    bg.clear()
    bg.roundRect(0, 0, w, 24, 12)
      .fill({ color: c, alpha: 0.15 })
      .stroke({ color: c, alpha: 0.4, width: 1 })
    // 狀態點
    bg.circle(10, 12, 3.5).fill({ color: c, alpha: 0.95 })
  }
  redraw(text, color)

  return { root, set: redraw }
}
