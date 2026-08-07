// 視覺風格選擇（現代 / 復古）
// 流程：主選單 → 本場景 → 訓練計畫 → Chase
// 不支援中途熱切換

import * as PIXI from 'pixi.js'
import {
  type VisualStyle,
  VISUAL_STYLE_META,
  DEFAULT_VISUAL_STYLE,
} from '../game/visual-style'
import { Theme, textStyle } from '../ui/theme'
import { createButton, createGlassPanel, type UiButton } from '../ui/components'

export class StyleSelectScene extends PIXI.Container {
  private app: PIXI.Application
  private selected: VisualStyle = DEFAULT_VISUAL_STYLE
  private cardRoots: PIXI.Container[] = []
  private onConfirm: (style: VisualStyle) => void
  private onBack: () => void

  constructor(
    app: PIXI.Application,
    handlers: {
      onConfirm: (style: VisualStyle) => void
      onBack: () => void
    },
  ) {
    super()
    this.app = app
    this.onConfirm = handlers.onConfirm
    this.onBack = handlers.onBack
  }

  get style(): VisualStyle {
    return this.selected
  }

  setStyle(style: VisualStyle) {
    this.selected = style
  }

  build() {
    this.removeChildren()
    this.cardRoots = []
    const W = this.app.screen.width
    const H = this.app.screen.height

    const bg = new PIXI.Graphics()
    bg.rect(0, 0, W, H).fill({ color: Theme.bg.deep })
    this.addChild(bg)

    for (let i = 0; i < 36; i++) {
      const g = new PIXI.Graphics()
      g.circle(0, 0, Math.random() * 1.2 + 0.3)
        .fill({ color: 0xffffff, alpha: Math.random() * 0.35 + 0.08 })
      g.x = Math.random() * W
      g.y = Math.random() * H * 0.55
      this.addChild(g)
    }

    const title = new PIXI.Text({
      text: '選擇視覺風格',
      style: textStyle({ size: 28, color: Theme.text.primary, weight: '700' }),
    })
    title.x = 40
    title.y = 28
    this.addChild(title)

    const sub = new PIXI.Text({
      text: '進入訓練前決定整場呈現 · 遊戲中無法切換 · 回主選單後可重選',
      style: textStyle({ size: 13, color: Theme.text.muted }),
    })
    sub.x = 40
    sub.y = 66
    this.addChild(sub)

    const back = createButton('← 返回', 110, 40, {
      variant: 'ghost',
      onClick: () => this.onBack(),
    })
    back.root.x = W - 150
    back.root.y = 28
    this.addChild(back.root)

    const cardW = Math.min(340, (W - 100) / 2)
    const cardH = Math.min(320, H * 0.52)
    const gap = 28
    const totalW = cardW * 2 + gap
    const startX = (W - totalW) / 2
    const cardY = H * 0.22

    const styles: VisualStyle[] = ['modern', 'retro']
    styles.forEach((id, i) => {
      const meta = VISUAL_STYLE_META[id]
      const root = new PIXI.Container()
      root.x = startX + i * (cardW + gap)
      root.y = cardY
      root.eventMode = 'static'
      root.cursor = 'pointer'

      const draw = (selected: boolean, hover: boolean) => {
        root.removeChildren()
        const border = selected
          ? (id === 'retro' ? 0xfbbf24 : Theme.accent.cyan)
          : hover
            ? Theme.text.secondary
            : 0x334155
        const panel = createGlassPanel(cardW, cardH, {
          radius: id === 'retro' ? 4 : Theme.radius.lg,
          border,
          borderAlpha: selected ? 0.9 : 0.35,
          borderWidth: selected ? 2.5 : 1.5,
          fillAlpha: 0.78,
        })
        root.addChild(panel)

        // 預覽色塊
        const preview = new PIXI.Graphics()
        if (id === 'modern') {
          preview.roundRect(20, 24, cardW - 40, 100, 12)
            .fill({ color: 0x12122a })
          preview.circle(cardW * 0.35, 74, 18).fill({ color: 0x22d3ee, alpha: 0.85 })
          preview.circle(cardW * 0.62, 78, 22).fill({ color: 0xfbbf24, alpha: 0.75 })
        } else {
          // 像素格預覽
          preview.rect(20, 24, cardW - 40, 100).fill({ color: 0x0a0a12 })
          const cell = 10
          const palette = [0xfcfcfc, 0x747474, 0xbcbcbc, 0xe45c10, 0x2038ec]
          for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 12; col++) {
              if ((row + col) % 3 === 0) continue
              preview.rect(28 + col * cell, 36 + row * cell, cell - 1, cell - 1)
                .fill({ color: palette[(row + col) % palette.length], alpha: 0.9 })
            }
          }
          // 掃描線示意
          for (let y = 28; y < 120; y += 4) {
            preview.rect(20, y, cardW - 40, 1).fill({ color: 0x000000, alpha: 0.18 })
          }
        }
        root.addChild(preview)

        const badge = new PIXI.Text({
          text: meta.labelEn,
          style: textStyle({
            size: 11,
            color: id === 'retro' ? 0xfbbf24 : Theme.accent.cyan,
            weight: '700',
          }),
        })
        badge.x = 24
        badge.y = 140
        root.addChild(badge)

        const name = new PIXI.Text({
          text: meta.label,
          style: textStyle({ size: 26, color: Theme.text.primary, weight: '700' }),
        })
        name.x = 24
        name.y = 158
        root.addChild(name)

        const desc = new PIXI.Text({
          text: meta.description.replace(' · ', '\n'),
          style: textStyle({
            size: 13,
            color: Theme.text.secondary,
            lineHeight: 20,
          }),
        })
        desc.x = 24
        desc.y = 198
        root.addChild(desc)

        if (selected) {
          const tag = new PIXI.Text({
            text: '✓ 已選擇',
            style: textStyle({
              size: 13,
              color: id === 'retro' ? 0xfbbf24 : Theme.accent.cyan,
              weight: '700',
            }),
          })
          tag.x = 24
          tag.y = cardH - 36
          root.addChild(tag)
        }
      }

      draw(this.selected === id, false)
      root.on('pointerover', () => draw(this.selected === id, true))
      root.on('pointerout', () => draw(this.selected === id, false))
      root.on('pointertap', () => {
        this.selected = id
        this.build()
      })

      this.cardRoots.push(root)
      this.addChild(root)
    })

    const next = createButton('下一步：選擇訓練計畫 →', Math.min(320, W - 80), 52, {
      variant: 'primary',
      onClick: () => this.onConfirm(this.selected),
    })
    next.root.x = (W - Math.min(320, W - 80)) / 2
    next.root.y = H - 88
    this.addChild(next.root)

    const hint = new PIXI.Text({
      text: `目前：${VISUAL_STYLE_META[this.selected].label}（${this.selected}）`,
      style: textStyle({ size: 12, color: Theme.text.dim }),
    })
    hint.anchor.set(0.5, 0)
    hint.x = W / 2
    hint.y = H - 30
    this.addChild(hint)
  }

  update(_dt: number) {}

  resize() {
    this.build()
  }
}
