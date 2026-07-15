// 商業級訓練儀表板 HUD

import * as PIXI from 'pixi.js'
import { GameState } from './game-state'
import { Theme, textStyle, ratioColor } from '../ui/theme'
import {
  CircularGauge,
  MetricCard,
  SegmentTimeline,
  ThreatBar,
  createGlassPanel,
  createStatusPill,
  createButton,
  type UiButton,
} from '../ui/components'

export class GameHud extends PIXI.Container {
  private state: GameState
  private getW: () => number
  private getH: () => number

  // 頂部
  private topPanel!: PIXI.Graphics
  private timeText!: PIXI.Text
  private planNameText!: PIXI.Text
  private blePill!: ReturnType<typeof createStatusPill>
  private ratioGauge!: CircularGauge
  private timeline!: SegmentTimeline

  // 底部 metrics
  private powerCard!: MetricCard
  private cadenceCard!: MetricCard
  private hrCard!: MetricCard
  private targetCard!: MetricCard
  private threatBar!: ThreatBar

  // 小狗標籤
  private dogLabel!: PIXI.Text
  private dogDist!: PIXI.Text

  // 休息提示
  private restBanner!: PIXI.Container
  private restText!: PIXI.Text

  // 暫停 / 控制
  private pauseBtn!: UiButton
  private pauseOverlay!: PIXI.Container
  private finishOverlay!: PIXI.Container

  private onPauseToggle?: () => void
  private onQuit?: () => void
  private onRestart?: () => void

  private built = false
  private elapsed = 0

  constructor(
    state: GameState,
    getW: () => number,
    getH: () => number,
    handlers: {
      onPauseToggle?: () => void
      onQuit?: () => void
      onRestart?: () => void
    } = {},
  ) {
    super()
    this.state = state
    this.getW = getW
    this.getH = getH
    this.onPauseToggle = handlers.onPauseToggle
    this.onQuit = handlers.onQuit
    this.onRestart = handlers.onRestart
  }

  build() {
    if (this.built) {
      this.removeChildren()
    }
    this.built = true
    const W = this.getW()
    const H = this.getH()

    // ── 頂部玻璃條 ──
    this.topPanel = createGlassPanel(W - 24, 96, {
      radius: Theme.radius.lg,
      fillAlpha: 0.55,
      borderAlpha: 0.12,
    })
    this.topPanel.x = 12
    this.topPanel.y = 10
    this.addChild(this.topPanel)

    // 功率環
    this.ratioGauge = new CircularGauge({
      radius: 34,
      lineWidth: 6,
      label: '完成率',
      unit: '%',
      max: 100,
    })
    this.ratioGauge.x = 58
    this.ratioGauge.y = 52
    this.addChild(this.ratioGauge)

    // 計時
    this.timeText = new PIXI.Text({
      text: '00:00',
      style: textStyle({ size: 36, color: Theme.text.primary, weight: '700', mono: true, align: 'center' }),
    })
    this.timeText.anchor.set(0.5, 0)
    this.timeText.x = W / 2
    this.timeText.y = 18
    this.addChild(this.timeText)

    this.planNameText = new PIXI.Text({
      text: this.state.plan.name,
      style: textStyle({ size: 12, color: Theme.text.muted, weight: '600', align: 'center' }),
    })
    this.planNameText.anchor.set(0.5, 0)
    this.planNameText.x = W / 2
    this.planNameText.y = 56
    this.addChild(this.planNameText)

    // BLE pill
    this.blePill = createStatusPill('模擬模式', Theme.status.muted)
    this.blePill.root.x = W - 140
    this.blePill.root.y = 22
    this.addChild(this.blePill.root)

    // 段落時間軸
    this.timeline = new SegmentTimeline(W - 24)
    this.timeline.x = 12
    this.timeline.y = 118
    this.addChild(this.timeline)

    // ── 左下 metrics ──
    const cardW = Math.min(130, (W - 48) / 4)
    const cardY = H - 100
    const gap = 10
    const startX = 16

    this.powerCard = new MetricCard({ width: cardW, label: '功率', unit: 'W', accent: Theme.accent.cyan })
    this.powerCard.x = startX
    this.powerCard.y = cardY
    this.addChild(this.powerCard)

    this.targetCard = new MetricCard({ width: cardW, label: '目標', unit: 'W', accent: Theme.accent.blue })
    this.targetCard.x = startX + (cardW + gap)
    this.targetCard.y = cardY
    this.addChild(this.targetCard)

    this.cadenceCard = new MetricCard({ width: cardW, label: '踏頻', unit: 'RPM', accent: Theme.accent.purple })
    this.cadenceCard.x = startX + (cardW + gap) * 2
    this.cadenceCard.y = cardY
    this.addChild(this.cadenceCard)

    this.hrCard = new MetricCard({ width: cardW, label: '心率', unit: 'BPM', accent: Theme.status.danger })
    this.hrCard.x = startX + (cardW + gap) * 3
    this.hrCard.y = cardY
    this.addChild(this.hrCard)

    // ── 右下 距離威脅條 ──
    const threatW = Math.min(220, W * 0.22)
    this.threatBar = new ThreatBar(threatW, GameState.MAX_DIST)
    this.threatBar.x = W - threatW - 16
    this.threatBar.y = H - 90
    this.addChild(this.threatBar)

    // ── 小狗浮動標籤 ──
    this.dogLabel = new PIXI.Text({
      text: '',
      style: textStyle({ size: 13, color: Theme.status.danger, weight: '700', align: 'center' }),
    })
    this.dogLabel.anchor.set(0.5, 1)
    this.addChild(this.dogLabel)

    this.dogDist = new PIXI.Text({
      text: '',
      style: textStyle({ size: 12, color: Theme.text.primary, weight: '600', mono: true, align: 'center' }),
    })
    this.dogDist.anchor.set(0.5, 1)
    this.addChild(this.dogDist)

    // ── 休息橫幅 ──
    this.restBanner = new PIXI.Container()
    const restBg = createGlassPanel(220, 40, {
      radius: Theme.radius.pill,
      fill: Theme.accent.orange,
      fillAlpha: 0.18,
      border: Theme.accent.orange,
      borderAlpha: 0.45,
    })
    this.restText = new PIXI.Text({
      text: '🐕  小狗在休息中…',
      style: textStyle({ size: 14, color: Theme.accent.orange, weight: '700', align: 'center' }),
    })
    this.restText.anchor.set(0.5)
    this.restText.x = 110
    this.restText.y = 20
    this.restBanner.addChild(restBg, this.restText)
    this.restBanner.x = W * 0.5 - 110
    this.restBanner.y = H * 0.30
    this.restBanner.visible = false
    this.addChild(this.restBanner)

    // ── 暫停按鈕 ──
    this.pauseBtn = createButton('❚❚', 44, 44, {
      variant: 'ghost',
      onClick: () => this.onPauseToggle?.(),
    })
    this.pauseBtn.root.x = W - 60
    this.pauseBtn.root.y = 54
    this.addChild(this.pauseBtn.root)

    // ── 暫停覆蓋層 ──
    this.pauseOverlay = this._buildPauseOverlay(W, H)
    this.pauseOverlay.visible = false
    this.addChild(this.pauseOverlay)

    // ── 完成覆蓋層 ──
    this.finishOverlay = this._buildFinishOverlay(W, H)
    this.finishOverlay.visible = false
    this.addChild(this.finishOverlay)
  }

  private _buildPauseOverlay(W: number, H: number): PIXI.Container {
    const c = new PIXI.Container()
    const dim = new PIXI.Graphics()
    dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.62 })
    c.addChild(dim)

    const panelW = 340
    const panelH = 260
    const panel = createGlassPanel(panelW, panelH, {
      radius: Theme.radius.xl,
      fillAlpha: 0.88,
      border: Theme.accent.cyan,
      borderAlpha: 0.3,
    })
    panel.x = (W - panelW) / 2
    panel.y = (H - panelH) / 2
    c.addChild(panel)

    const title = new PIXI.Text({
      text: '已暫停',
      style: textStyle({ size: 28, color: Theme.text.primary, weight: '700', align: 'center' }),
    })
    title.anchor.set(0.5, 0)
    title.x = W / 2
    title.y = panel.y + 36
    c.addChild(title)

    const sub = new PIXI.Text({
      text: '訓練暫時中斷',
      style: textStyle({ size: 13, color: Theme.text.muted, align: 'center' }),
    })
    sub.anchor.set(0.5, 0)
    sub.x = W / 2
    sub.y = panel.y + 76
    c.addChild(sub)

    const resumeBtn = createButton('繼續訓練', 220, 48, {
      variant: 'primary',
      onClick: () => this.onPauseToggle?.(),
    })
    resumeBtn.root.x = (W - 220) / 2
    resumeBtn.root.y = panel.y + 120
    c.addChild(resumeBtn.root)

    const quitBtn = createButton('結束並返回', 220, 44, {
      variant: 'ghost',
      onClick: () => this.onQuit?.(),
    })
    quitBtn.root.x = (W - 220) / 2
    quitBtn.root.y = panel.y + 180
    c.addChild(quitBtn.root)

    return c
  }

  private _buildFinishOverlay(W: number, H: number): PIXI.Container {
    const c = new PIXI.Container()
    c.visible = false

    const dim = new PIXI.Graphics()
    dim.rect(0, 0, W, H).fill({ color: 0x000008, alpha: 0.72 })
    c.addChild(dim)

    const panelW = Math.min(480, W - 48)
    const panelH = 360
    const panel = createGlassPanel(panelW, panelH, {
      radius: Theme.radius.xl,
      fillAlpha: 0.92,
      border: Theme.accent.gold,
      borderAlpha: 0.35,
    })
    panel.x = (W - panelW) / 2
    panel.y = (H - panelH) / 2
    c.addChild(panel)

    const badge = new PIXI.Text({
      text: '🏆  訓練完成',
      style: textStyle({ size: 26, color: Theme.accent.gold, weight: '700', align: 'center' }),
    })
    badge.anchor.set(0.5, 0)
    badge.x = W / 2
    badge.y = panel.y + 28
    c.addChild(badge)

    const stats = new PIXI.Text({
      text: '',
      style: textStyle({
        size: 15,
        color: Theme.text.secondary,
        align: 'center',
        lineHeight: 28,
      }),
    })
    stats.anchor.set(0.5, 0)
    stats.x = W / 2
    stats.y = panel.y + 90
    stats.label = 'finishStats'
    c.addChild(stats)

    const againBtn = createButton('再騎一次', 200, 48, {
      variant: 'primary',
      onClick: () => this.onRestart?.(),
    })
    againBtn.root.x = W / 2 - 210
    againBtn.root.y = panel.y + panelH - 80
    c.addChild(againBtn.root)

    const homeBtn = createButton('返回主選單', 200, 48, {
      variant: 'secondary',
      onClick: () => this.onQuit?.(),
    })
    homeBtn.root.x = W / 2 + 10
    homeBtn.root.y = panel.y + panelH - 80
    c.addChild(homeBtn.root)

    return c
  }

  update(dt: number, dogScreenX: number, groundY: number, dogDisplayH: number) {
    this.elapsed += dt
    const s = this.state
    const ratioPct = Math.round(s.powerRatio * 100)
    const color = ratioColor(ratioPct)

    // gauge
    this.ratioGauge.setValue(ratioPct, color)

    // time
    this.timeText.text = s.formatTime(s.totalElapsedSec)
    this.planNameText.text = s.plan.name

    // timeline
    this.timeline.update(
      s.plan.segments,
      s.segIdx,
      s.segElapsedSec,
      s.totalElapsedSec,
    )

    // metrics
    this.powerCard.setValue(s.currentPower, color)
    this.targetCard.setValue(s.targetPower, Theme.accent.blue)
    this.cadenceCard.setValue(s.currentCadence || '—', Theme.accent.purple)
    this.hrCard.setValue(s.currentHr || '—', Theme.status.danger)

    // threat
    this.threatBar.setDistance(s.distance, s.dogState)

    // rest banner
    this.restBanner.visible = s.dogState === 'resting'
    if (s.dogState === 'resting') {
      this.restBanner.alpha = 0.75 + 0.25 * Math.sin(this.elapsed * 2.5)
    }

    // dog floating labels
    const dogVisible = dogScreenX > -140 && s.dogState !== 'resting'
    this.dogDist.visible = dogVisible
    this.dogLabel.visible = dogVisible
    if (dogVisible) {
      this.dogDist.x = dogScreenX
      this.dogDist.y = groundY - dogDisplayH - 6
      this.dogDist.text = `${Math.round(s.distance)}M`

      this.dogLabel.x = dogScreenX
      this.dogLabel.y = groundY - dogDisplayH - 22
      if (s.dogState === 'returning') {
        this.dogLabel.text = '急速追上!'
        this.dogLabel.style.fill = Theme.accent.orange
      } else if (s.isDanger) {
        this.dogLabel.text = '⚠ 危險!'
        this.dogLabel.style.fill = Theme.status.danger
      } else if (s.distance >= 65) {
        this.dogLabel.text = '安全!'
        this.dogLabel.style.fill = Theme.status.success
      } else {
        this.dogLabel.text = ''
      }
    }

    // pause overlay
    this.pauseOverlay.visible = s.isPaused && s.isRunning
    this.pauseBtn.setLabel(s.isPaused ? '▶' : '❚❚')

    // finish
    if (s.isFinished) {
      this.finishOverlay.visible = true
      const stats = this.finishOverlay.children.find(
        (ch) => (ch as PIXI.Text).label === 'finishStats',
      ) as PIXI.Text | undefined
      if (stats) {
        const avgPower = s.powerHistory.length
          ? Math.round(s.powerHistory.reduce((a, b) => a + b, 0) / s.powerHistory.length)
          : 0
        const maxPower = s.powerHistory.length ? Math.max(...s.powerHistory) : 0
        stats.text = [
          `計畫　${s.plan.name}`,
          `總時間　${s.formatTime(s.totalElapsedSec)}`,
          `平均功率　${avgPower} W`,
          `最大功率　${maxPower} W`,
          `最終距離　${Math.round(s.distance)} M`,
        ].join('\n')
      }
    } else {
      this.finishOverlay.visible = false
    }
  }

  setBleStatus(connected: boolean, name: string) {
    if (connected) {
      this.blePill.set(name || 'BLE 已連接', Theme.status.success)
    } else if (this.state.simMode) {
      this.blePill.set('模擬模式', Theme.status.muted)
    } else {
      this.blePill.set('未連接', Theme.status.danger)
    }
  }

  resize() {
    this.build()
  }
}
