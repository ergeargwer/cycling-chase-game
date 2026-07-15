// 商業級設計系統 — 智慧騎行 追逐模式

import { TextStyle } from 'pixi.js'

export const Theme = {
  // 背景
  bg: {
    deep:     0x06060f,
    panel:    0x0c0c1a,
    panelAlt: 0x12122a,
    glass:    0x0a0a18,
  },

  // 主色
  accent: {
    cyan:    0x22d3ee,
    blue:    0x3b82f6,
    purple:  0xa78bfa,
    gold:    0xfbbf24,
    amber:   0xf59e0b,
    orange:  0xf97316,
  },

  // 狀態色
  status: {
    success: 0x22c55e,
    warning: 0xeab308,
    danger:  0xef4444,
    muted:   0x6b7280,
    info:    0x60a5fa,
  },

  // 文字
  text: {
    primary:   0xf8fafc,
    secondary: 0xcbd5e1,
    muted:     0x94a3b8,
    dim:       0x64748b,
  },

  // 路面 / 場景
  scene: {
    sky:       0x05050f,
    mountain1: 0x0a0a1c,
    mountain2: 0x0d0d22,
    road:      0x1c1c1c,
    grass:     0x0e1a0a,
    lamp:      0xffdc64,
  },

  font: "'Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC', 'Segoe UI', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Consolas', monospace",

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },
}

export function textStyle(opts: {
  size: number
  color?: number
  weight?: 'normal' | 'bold' | '600' | '700'
  align?: 'left' | 'center' | 'right'
  mono?: boolean
  letterSpacing?: number
  lineHeight?: number
}): TextStyle {
  return new TextStyle({
    fontFamily: opts.mono ? Theme.fontMono : Theme.font,
    fontSize: opts.size,
    fill: opts.color ?? Theme.text.primary,
    fontWeight: opts.weight ?? 'normal',
    align: opts.align ?? 'left',
    letterSpacing: opts.letterSpacing ?? 0,
    lineHeight: opts.lineHeight,
  })
}

/** 依功率完成率回傳狀態色 */
export function ratioColor(ratioPct: number): number {
  if (ratioPct >= 100) return Theme.status.success
  if (ratioPct >= 85)  return Theme.status.warning
  return Theme.status.danger
}
