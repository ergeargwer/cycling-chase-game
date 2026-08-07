// 素材載入：優先 primary，失敗回落 fallback，並 console 警告

import * as PIXI from 'pixi.js'
import type { VisualStyle } from './visual-style'
import { textureScaleMode } from './visual-style'

/**
 * 載入單一 texture 並註冊 alias。
 * @returns true 若 primary 或 fallback 成功
 */
export async function loadTextureWithFallback(
  alias: string,
  primary: string,
  fallback?: string,
  style: VisualStyle = 'modern',
): Promise<boolean> {
  const scaleMode = textureScaleMode(style)

  const applyScale = () => {
    const tex = PIXI.Assets.get(alias) as PIXI.Texture | undefined
    if (tex?.source) tex.source.scaleMode = scaleMode
  }

  try {
    await PIXI.Assets.load({ alias, src: primary })
    applyScale()
    return true
  } catch (e) {
    if (!fallback || fallback === primary) {
      console.warn(`[assets] load failed: ${primary}`, e)
      return false
    }
    try {
      console.warn(`[assets] fallback ${primary} → ${fallback}`)
      await PIXI.Assets.load({ alias, src: fallback })
      applyScale()
      return true
    } catch (e2) {
      console.warn(`[assets] fallback failed: ${fallback}`, e2)
      return false
    }
  }
}

/** 嘗試載入；失敗回 null 並警告（不 throw） */
export async function tryLoadTexture(
  alias: string,
  src: string,
  style: VisualStyle = 'retro',
): Promise<PIXI.Texture | null> {
  try {
    await PIXI.Assets.load({ alias, src })
    const tex = PIXI.Assets.get(alias) as PIXI.Texture
    if (tex?.source) tex.source.scaleMode = textureScaleMode(style)
    return tex
  } catch {
    console.warn(`[assets] missing (ok if optional): ${src}`)
    return null
  }
}
