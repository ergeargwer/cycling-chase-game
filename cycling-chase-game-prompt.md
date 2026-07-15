# 智慧騎行追逐遊戲 — Google Antigravity Prompt
# PixiJS + Electron | 跨平台 Pi5 + Windows

---

## 環境資訊
- Node.js v22.22.0 / npm 10.9.4
- 平台：Raspberry Pi 5（ARM Linux）+ Windows 雙平台
- 顯示：直接接螢幕，一般視窗可調整大小
- BLE：@abandonware/noble（Pi5 已有 bluetooth 套件）

---

## PROMPT（完整貼入 Antigravity）

Build a cross-platform desktop game called "智慧騎行 追逐模式"
using Electron + PixiJS v8 + TypeScript.
Target platforms: Raspberry Pi 5 (ARM Linux) and Windows x64.

### Tech Stack
- Electron 32 (main process: Node.js BLE + window management)
- PixiJS v8 (renderer process: WebGL game rendering)
- TypeScript 5.9
- @abandonware/noble (BLE FTMS client)
- electron-builder (packaging for both platforms)
- Vite (renderer bundler)

### Project Structure

```
cycling-chase-game/
  package.json
  tsconfig.json
  vite.config.ts
  electron-builder.yml
  src/
    main/
      index.ts          # Electron main process
      ble-manager.ts    # noble BLE + FTMS protocol
      ipc-handlers.ts   # IPC bridge to renderer
    renderer/
      index.html
      index.ts          # PixiJS app entry
      scenes/
        menu-scene.ts   # 主選單場景
        plan-scene.ts   # 訓練計畫選擇場景
        chase-scene.ts  # 追逐遊戲主場景
        finish-scene.ts # 訓練完成場景
      game/
        game-state.ts   # 訓練計畫、距離計算、狀態機
        sprite-sheet.ts # Sprite Sheet 管理
        particles.ts    # 粒子特效系統
        background.ts   # 背景場景（天空、山、路燈）
        road.ts         # 路面捲動
        rider.ts        # 騎士 Sprite 動畫
        dog.ts          # 柴犬 Sprite 動畫
        hud.ts          # 儀表板 HUD
      utils/
        ble-bridge.ts   # IPC renderer 端封裝
        format.ts       # 時間格式化工具
  assets/
    rider.png           # 1408x768 4欄x2列
    dog.png             # 1408x768 7欄x4列
    sweat.png           # 1408x768 8欄x4列
```

---

## package.json

```json
{
  "name": "cycling-chase-game",
  "version": "1.0.0",
  "description": "智慧騎行 追逐模式",
  "main": "dist-electron/main/index.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"electron .\"",
    "build": "tsc && vite build && tsc -p tsconfig.electron.json",
    "dist:pi": "npm run build && electron-builder --linux --arm64",
    "dist:win": "npm run build && electron-builder --win --x64"
  },
  "dependencies": {
    "@abandonware/noble": "^1.9.2-15",
    "electron": "^32.0.0",
    "pixi.js": "^8.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "concurrently": "^9.0.0",
    "electron-builder": "^25.0.0",
    "typescript": "^5.9.0",
    "vite": "^6.0.0",
    "vite-plugin-electron": "^0.28.0"
  }
}
```

---

## electron-builder.yml

```yaml
appId: com.smartcycling.cyclingchasegame
productName: 智慧騎行追逐模式
directories:
  output: release

files:
  - dist/**
  - dist-electron/**
  - assets/**

linux:
  target:
    - target: AppImage
      arch: arm64
  category: Game

win:
  target:
    - target: nsis
      arch: x64
  icon: assets/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

---

## src/main/index.ts

```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { BleManager } from './ble-manager'
import { registerIpcHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null
const bleManager = new BleManager()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    title: '智慧騎行 追逐模式',
    backgroundColor: '#080818',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers(bleManager, mainWindow)
  createWindow()
})

app.on('window-all-closed', () => {
  bleManager.disconnect()
  app.quit()
})
```

---

## src/main/ble-manager.ts

```typescript
// FTMS BLE 連接管理 — @abandonware/noble
// ThinkRider XXPRO FTMS Service 0x1826

import noble from '@abandonware/noble'
import { EventEmitter } from 'events'

const FTMS_SERVICE      = '1826'
const INDOOR_BIKE_DATA  = '2ad2'
const CONTROL_POINT     = '2ad9'
const HR_SERVICE        = '180d'
const HR_MEASUREMENT    = '2a37'

export interface BikeData {
  power:   number
  cadence: number
  hr:      number
}

export class BleManager extends EventEmitter {
  private peripheral: any = null
  private controlChar: any = null
  connected = false
  deviceName = ''

  currentPower   = 0
  currentCadence = 0
  currentHr      = 0

  async scan(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        noble.stopScanning()
        reject(new Error('找不到 FTMS 裝置，請確認 ThinkRider XXPRO 已開機'))
      }, 10000)

      noble.on('stateChange', (state: string) => {
        if (state === 'poweredOn') {
          noble.startScanning([FTMS_SERVICE], false)
        }
      })

      noble.on('discover', async (peripheral: any) => {
        const name = (peripheral.advertisement.localName || '').toUpperCase()
        const isFTMS = peripheral.advertisement.serviceUuids?.includes(FTMS_SERVICE)
        const isThinkRider = name.includes('THINKRIDER') || name.includes('XXPRO')

        if (isFTMS || isThinkRider) {
          clearTimeout(timeout)
          noble.stopScanning()
          this.peripheral = peripheral

          peripheral.on('disconnect', () => {
            this.connected = false
            this.emit('disconnect', '裝置已斷線')
          })

          try {
            await this._connect(peripheral)
            resolve()
          } catch (e) {
            reject(e)
          }
        }
      })

      if (noble.state === 'poweredOn') {
        noble.startScanning([FTMS_SERVICE], false)
      }
    })
  }

  private async _connect(peripheral: any): Promise<void> {
    await new Promise<void>((res, rej) => {
      peripheral.connect((err: any) => err ? rej(err) : res())
    })

    this.deviceName = peripheral.advertisement.localName || peripheral.address

    const { characteristics } = await new Promise<any>((res, rej) => {
      peripheral.discoverSomeServicesAndCharacteristics(
        [FTMS_SERVICE, HR_SERVICE],
        [INDOOR_BIKE_DATA, CONTROL_POINT, HR_MEASUREMENT],
        (err: any, _: any, chars: any[]) => err ? rej(err) : res({ characteristics: chars })
      )
    })

    for (const char of characteristics) {
      const uuid = char.uuid

      if (uuid === INDOOR_BIKE_DATA) {
        char.on('data', (data: Buffer) => this._parseBikeData(data))
        await new Promise<void>(res => char.subscribe(() => res()))
      }

      if (uuid === CONTROL_POINT) {
        this.controlChar = char
        // 請求控制權
        await new Promise<void>(res => {
          char.write(Buffer.from([0x00]), true, () => res())
        })
      }

      if (uuid === HR_MEASUREMENT) {
        char.on('data', (data: Buffer) => this._parseHr(data))
        await new Promise<void>(res => char.subscribe(() => res()))
      }
    }

    this.connected = true
    this.emit('connect', this.deviceName)
  }

  sendTargetPower(watts: number): void {
    if (!this.controlChar || !this.connected) return
    const buf = Buffer.alloc(3)
    buf[0] = 0x05
    buf.writeInt16LE(watts, 1)
    this.controlChar.write(buf, true, () => {})
  }

  disconnect(): void {
    if (this.peripheral) {
      this.peripheral.disconnect()
    }
    this.connected = false
  }

  private _parseBikeData(data: Buffer): void {
    if (data.length < 3) return
    const flags  = data.readUInt16LE(0)
    let   offset = 2

    if (!(flags & 0x0001)) offset += 2   // Speed
    if (flags & 0x0002)    offset += 2   // Avg Speed
    if (flags & 0x0004) {                // Cadence
      if (offset + 2 <= data.length) {
        this.currentCadence = data.readUInt16LE(offset) >> 1
      }
      offset += 2
    }
    if (flags & 0x0008) offset += 2      // Avg Cadence
    if (flags & 0x0010) offset += 3      // Total Distance
    if (flags & 0x0020) offset += 2      // Resistance
    if (flags & 0x0040) {                // Power
      if (offset + 2 <= data.length) {
        this.currentPower = Math.max(0, data.readInt16LE(offset))
      }
      offset += 2
    }

    this.emit('data', {
      power:   this.currentPower,
      cadence: this.currentCadence,
      hr:      this.currentHr,
    } as BikeData)
  }

  private _parseHr(data: Buffer): void {
    const flags = data[0]
    this.currentHr = (flags & 0x01) ? data.readUInt16LE(1) : data[1]
  }
}
```

---

## src/main/ipc-handlers.ts

```typescript
import { ipcMain, BrowserWindow } from 'electron'
import { BleManager } from './ble-manager'

export function registerIpcHandlers(
  ble: BleManager,
  win: BrowserWindow | null
) {
  // BLE 掃描並連接
  ipcMain.handle('ble:scan', async () => {
    try {
      await ble.scan()
      return { ok: true, name: ble.deviceName }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  })

  // 發送 ERG 目標功率
  ipcMain.handle('ble:set-power', (_event, watts: number) => {
    ble.sendTargetPower(watts)
    return { ok: true }
  })

  // 斷線
  ipcMain.handle('ble:disconnect', () => {
    ble.disconnect()
    return { ok: true }
  })

  // 即時資料推送到 renderer
  ble.on('data', (data) => {
    win?.webContents.send('ble:data', data)
  })
  ble.on('connect', (name) => {
    win?.webContents.send('ble:connected', name)
  })
  ble.on('disconnect', (msg) => {
    win?.webContents.send('ble:disconnected', msg)
  })
}
```

---

## src/renderer/utils/ble-bridge.ts

```typescript
// IPC bridge — renderer 端封裝
// 透過 contextBridge 與 main process 溝通

const { ipcRenderer } = window.require('electron')

export interface BikeData {
  power:   number
  cadence: number
  hr:      number
}

export const BleBridge = {
  scan: (): Promise<{ ok: boolean; name?: string; error?: string }> =>
    ipcRenderer.invoke('ble:scan'),

  setPower: (watts: number): Promise<void> =>
    ipcRenderer.invoke('ble:set-power', watts),

  disconnect: (): Promise<void> =>
    ipcRenderer.invoke('ble:disconnect'),

  onData: (cb: (data: BikeData) => void) => {
    ipcRenderer.on('ble:data', (_: any, data: BikeData) => cb(data))
  },

  onConnect: (cb: (name: string) => void) => {
    ipcRenderer.on('ble:connected', (_: any, name: string) => cb(name))
  },

  onDisconnect: (cb: (msg: string) => void) => {
    ipcRenderer.on('ble:disconnected', (_: any, msg: string) => cb(msg))
  },
}
```

---

## src/renderer/game/game-state.ts

```typescript
// 訓練計畫定義、距離計算、小狗狀態機

export interface Segment {
  name:        string
  watts:       number
  durationMin: number   // 999 = 無限制
}

export interface WorkoutPlan {
  id:       string
  name:     string
  segments: Segment[]
}

export const PLANS: WorkoutPlan[] = [
  {
    id: 'warmup30', name: '基礎熱身 30分',
    segments: [
      { name: '暖身',     watts: 80,  durationMin: 5  },
      { name: '輕度有氧', watts: 110, durationMin: 10 },
      { name: '節奏',     watts: 140, durationMin: 10 },
      { name: '緩和',     watts: 80,  durationMin: 5  },
    ],
  },
  {
    id: 'endurance30', name: '耐力提升 30分',
    segments: [
      { name: '暖身',       watts: 85,  durationMin: 5  },
      { name: '有氧穩態 I', watts: 130, durationMin: 8  },
      { name: '有氧穩態 II',watts: 150, durationMin: 12 },
      { name: '緩和',       watts: 90,  durationMin: 5  },
    ],
  },
  {
    id: 'interval60', name: '間歇訓練 60分',
    segments: [
      { name: '暖身',     watts: 80,  durationMin: 10 },
      { name: '高強度 1', watts: 220, durationMin: 5  },
      { name: '恢復',     watts: 90,  durationMin: 5  },
      { name: '高強度 2', watts: 220, durationMin: 5  },
      { name: '恢復',     watts: 90,  durationMin: 5  },
      { name: '高強度 3', watts: 220, durationMin: 5  },
      { name: '恢復',     watts: 90,  durationMin: 5  },
      { name: '有氧穩態', watts: 150, durationMin: 15 },
      { name: '緩和',     watts: 85,  durationMin: 5  },
    ],
  },
  {
    id: 'tempo60', name: '節奏騎乘 60分',
    segments: [
      { name: '暖身',    watts: 85,  durationMin: 10 },
      { name: '節奏 I',  watts: 170, durationMin: 15 },
      { name: '恢復',    watts: 100, durationMin: 5  },
      { name: '節奏 II', watts: 180, durationMin: 20 },
      { name: '緩和',    watts: 85,  durationMin: 10 },
    ],
  },
  {
    id: 'sweet60', name: '甜蜜點訓練 60分',
    segments: [
      { name: '暖身',        watts: 80,  durationMin: 8  },
      { name: '甜蜜點 I',    watts: 160, durationMin: 12 },
      { name: '恢復',        watts: 95,  durationMin: 5  },
      { name: '甜蜜點 II',   watts: 165, durationMin: 12 },
      { name: '恢復',        watts: 95,  durationMin: 5  },
      { name: '甜蜜點 III',  watts: 170, durationMin: 12 },
      { name: '緩和',        watts: 80,  durationMin: 6  },
    ],
  },
  {
    id: 'free', name: '自由騎乘',
    segments: [{ name: '自由騎乘', watts: 120, durationMin: 999 }],
  },
]

export type DogState = 'chasing' | 'resting' | 'returning'

export class GameState {
  static MIN_DIST          = 0
  static MAX_DIST          = 80
  static DANGER_THRESHOLD  = 10
  static NERVOUS_THRESHOLD = 25

  plan:             WorkoutPlan = PLANS[0]
  segIdx:           number      = 0
  segElapsedSec:    number      = 0
  totalElapsedSec:  number      = 0
  currentPower:     number      = 0
  currentCadence:   number      = 0
  currentHr:        number      = 0
  targetPower:      number      = 80
  distance:         number      = 40
  isRunning:        boolean     = false
  isPaused:         boolean     = false
  isFinished:       boolean     = false
  simMode:          boolean     = true
  dogState:         DogState    = 'chasing'
  restCountdown:    number      = 0
  nextRestIn:       number      = 0
  powerHistory:     number[]    = []
  targetHistory:    number[]    = []

  constructor() { this.scheduleRest() }

  selectPlan(plan: WorkoutPlan) { this.plan = plan }

  start() {
    this.segIdx          = 0
    this.segElapsedSec   = 0
    this.totalElapsedSec = 0
    this.distance        = 40
    this.dogState        = 'chasing'
    this.isRunning       = true
    this.isPaused        = false
    this.isFinished      = false
    this.targetPower     = this.plan.segments[0].watts
    this.powerHistory    = []
    this.targetHistory   = []
    this.scheduleRest()
  }

  /** 每秒呼叫一次 */
  tick(onSegmentChange?: (watts: number) => void) {
    if (!this.isRunning || this.isPaused) return
    const seg = this.plan.segments[this.segIdx]
    this.totalElapsedSec++
    this.segElapsedSec++
    this.targetPower = seg.watts

    if (this.simMode) {
      const t = this.totalElapsedSec
      this.currentPower   = Math.max(0, Math.round(
        seg.watts + Math.sin(t * 0.7) * 12 + (Math.random() - 0.5) * 8))
      this.currentCadence = Math.round(85 + (Math.random() - 0.5) * 8)
      this.currentHr      = Math.round(
        130 + (seg.watts - 120) * 0.3 + (Math.random() - 0.5) * 4)
    }

    if (this.dogState === 'chasing') {
      const ratio = Math.max(0.3, Math.min(1.5,
        this.currentPower / Math.max(1, this.targetPower)))
      this.distance = Math.max(GameState.MIN_DIST, Math.min(
        GameState.MAX_DIST, this.distance + (ratio - 1) * 2.5))
    }

    this.nextRestIn--
    if (this.dogState === 'chasing' && this.nextRestIn <= 0) {
      this.dogState      = 'resting'
      this.restCountdown = 5 + Math.random() * 5
      this.scheduleRest()
    } else if (this.dogState === 'resting') {
      this.restCountdown--
      if (this.restCountdown <= 0) this.dogState = 'returning'
    }

    this.powerHistory.push(this.currentPower)
    this.targetHistory.push(this.targetPower)
    if (this.powerHistory.length > 300) {
      this.powerHistory.shift()
      this.targetHistory.shift()
    }

    if (seg.durationMin < 999 && this.segElapsedSec >= seg.durationMin * 60) {
      this.segElapsedSec = 0
      this.segIdx++
      if (this.segIdx >= this.plan.segments.length) {
        this.isFinished = true
        this.isRunning  = false
        return
      }
      this.targetPower = this.plan.segments[this.segIdx].watts
      onSegmentChange?.(this.targetPower)
    }

    const totalMin = this.plan.segments
      .filter(s => s.durationMin < 999)
      .reduce((a, s) => a + s.durationMin, 0)
    if (totalMin > 0 && this.totalElapsedSec >= totalMin * 60) {
      this.isFinished = true
      this.isRunning  = false
    }
  }

  get isDanger()  { return this.distance <= GameState.DANGER_THRESHOLD  && this.dogState === 'chasing' }
  get isNervous() { return this.distance <= GameState.NERVOUS_THRESHOLD && this.dogState === 'chasing' }
  get powerRatio(){ return this.currentPower / Math.max(1, this.targetPower) }
  get currentSegment() { return this.plan.segments[Math.min(this.segIdx, this.plan.segments.length - 1)] }

  formatTime(sec: number) {
    return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`
  }

  private scheduleRest() { this.nextRestIn = 20 + Math.random() * 15 }
}
```

---

## src/renderer/game/chase-scene.ts

```typescript
// 追逐遊戲主場景 — PixiJS v8
// 完整場景：背景、路面、路燈、騎士、柴犬、汗珠粒子、HUD

import * as PIXI from 'pixi.js'
import { GameState, DogState } from './game-state'

// Sprite Sheet 規格
const RIDER_W = 352, RIDER_H = 384, RIDER_COLS = 4
const DOG_W   = 201, DOG_H   = 192
const SWEAT_W = 176, SWEAT_H = 192, SWEAT_COLS = 8

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
  private hudLayer:  PIXI.Container = new PIXI.Container()
  private fxLayer:   PIXI.Container = new PIXI.Container()

  // 路面元素
  private roadDashes:  PIXI.Graphics[] = []
  private lampSprites: PIXI.Container[] = []
  private lampXs:      number[]  = []

  // 角色
  private riderSprite!:    PIXI.AnimatedSprite
  private riderNervSprite!:PIXI.AnimatedSprite
  private dogRunSprite!:   PIXI.AnimatedSprite
  private dogBarkSprite!:  PIXI.AnimatedSprite
  private activeDogSprite!:PIXI.AnimatedSprite

  // 汗珠粒子
  private sweatParticles: SweatParticle[] = []
  private sweatTimer:     number = 0
  private sweatTextures:  PIXI.Texture[] = []

  // HUD 元素
  private hudRatioText!:  PIXI.Text
  private hudTimeText!:   PIXI.Text
  private hudSegText!:    PIXI.Text
  private hudBleText!:    PIXI.Text
  private hudDogLabel!:   PIXI.Text
  private hudDistText!:   PIXI.Text
  private hudRestText!:   PIXI.Text
  private dangerOverlay!: PIXI.Graphics
  private shakeAmount:    number = 0
  private dangerAlpha:    number = 0

  // 月亮、星星
  private moonGfx!: PIXI.Graphics
  private stars:    Array<{ g: PIXI.Graphics; baseAlpha: number; phase: number }> = []

  constructor(app: PIXI.Application, state: GameState) {
    super()
    this.app   = app
    this.state = state
    this.addChild(this.bgLayer, this.roadLayer, this.gameLayer,
                  this.fxLayer, this.hudLayer)
  }

  async load() {
    // 載入 Sprite Sheet
    await PIXI.Assets.load([
      { alias: 'rider', src: 'assets/rider.png' },
      { alias: 'dog',   src: 'assets/dog.png'   },
      { alias: 'sweat', src: 'assets/sweat.png' },
    ])

    this._buildBackground()
    this._buildRoad()
    this._buildLamps()
    this._buildRider()
    this._buildDog()
    this._buildSweat()
    this._buildHud()
    this._buildDangerOverlay()

    this.dogScreenX = this._calcTargetDogX()
  }

  // ── 建構各層 ──────────────────────────────────────────

  private _buildBackground() {
    const W = this.app.screen.width
    const H = this.app.screen.height
    const gY = H * 0.60

    // 天空漸層
    const sky = new PIXI.Graphics()
    sky.rect(0, 0, W, gY).fill({ color: 0x05050f })
    this.bgLayer.addChild(sky)

    // 月亮
    this.moonGfx = new PIXI.Graphics()
    this.moonGfx.circle(0, 0, 22).fill({ color: 0xe8e0c0 })
    const moonMask = new PIXI.Graphics()
    moonMask.circle(12, -4, 18).fill({ color: 0x05050f })
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
    mtn1.poly(peaks1).fill({ color: 0x0a0a1c })
    this.bgLayer.addChild(mtn1)

    const mtn2 = new PIXI.Graphics()
    const peaks2: number[] = [
      0, gY,
      W*0.08, H*0.44, W*0.20, H*0.35, W*0.32, H*0.46,
      W*0.42, H*0.32, W*0.55, H*0.44, W*0.65, H*0.36,
      W*0.78, H*0.48, W*0.88, H*0.38, W, H*0.52, W, gY
    ]
    mtn2.poly(peaks2).fill({ color: 0x0d0d22 })
    this.bgLayer.addChild(mtn2)
  }

  private _buildRoad() {
    const W = this.app.screen.width
    const H = this.app.screen.height
    const gY = H * 0.60
    const roadH = H - gY

    const road = new PIXI.Graphics()
    road.rect(0, gY, W, roadH).fill({ color: 0x1c1c1c })
    road.rect(0, gY, W, 2).fill({ color: 0x333333 })
    road.rect(0, H - 14, W, 14).fill({ color: 0x0e1a0a })
    this.roadLayer.addChild(road)

    // 虛線（動態更新）
    for (let x = 0; x < W + 160; x += 160) {
      const dash = new PIXI.Graphics()
      dash.rect(0, 0, 60, 3).fill({ color: 0x605030, alpha: 0.6 })
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
      pole.moveTo(0, 0).lineTo(0, -72).stroke({ color: 0x444444, width: 3 })
      pole.moveTo(0, -72).lineTo(22, -72).stroke({ color: 0x444444, width: 3 })
      pole.rect(14, -78, 18, 8).fill({ color: 0x666666 })
      lamp.addChild(pole)

      // 燈光暈（PointLight 效果用 RadialGradient 模擬）
      const glow = new PIXI.Graphics()
      for (let r = 50; r > 0; r -= 5) {
        const a = (50 - r) / 50 * 0.15
        glow.circle(22, -72, r).fill({ color: 0xffdc64, alpha: a })
      }
      lamp.addChild(glow)

      lamp.x = x
      lamp.y = gY
      this.roadLayer.addChild(lamp)
      this.lampSprites.push(lamp)
      this.lampXs.push(x)
    }
  }

  private _buildRider() {
    const baseTexture = PIXI.Assets.get('rider')
    const makeFrames = (row: number) =>
      Array.from({ length: RIDER_COLS }, (_, col) =>
        new PIXI.Texture({
          source: baseTexture,
          frame: new PIXI.Rectangle(
            col * RIDER_W, row * RIDER_H, RIDER_W, RIDER_H),
        })
      )

    this.riderSprite     = new PIXI.AnimatedSprite(makeFrames(0))
    this.riderNervSprite = new PIXI.AnimatedSprite(makeFrames(1))

    for (const s of [this.riderSprite, this.riderNervSprite]) {
      s.animationSpeed = 8 / 60
      s.loop = true
      s.width  = RIDER_W / RIDER_H * 200
      s.height = 200
      s.anchor.set(0.5, 1)
    }

    this.riderSprite.play()
    this.riderNervSprite.play()
    this.riderNervSprite.visible = false

    const W = this.app.screen.width
    const H = this.app.screen.height
    const gY = H * 0.60
    const bottomPad = 200 * 0.08

    this.riderSprite.x     = W * 0.22
    this.riderNervSprite.x = W * 0.22
    this.riderSprite.y     = this.riderNervSprite.y = gY + bottomPad

    this.gameLayer.addChild(this.riderSprite, this.riderNervSprite)
  }

  private _buildDog() {
    const baseTexture = PIXI.Assets.get('dog')
    const makeFrames  = (row: number, startCol: number, count: number) =>
      Array.from({ length: count }, (_, i) =>
        new PIXI.Texture({
          source: baseTexture,
          frame: new PIXI.Rectangle(
            (startCol + i) * DOG_W, row * DOG_H, DOG_W, DOG_H),
        })
      )

    this.dogRunSprite  = new PIXI.AnimatedSprite(makeFrames(0, 0, 3))
    this.dogBarkSprite = new PIXI.AnimatedSprite(makeFrames(0, 3, 3))

    const H  = this.app.screen.height
    const gY = H * 0.60
    const bottomPad = 150 * 0.10

    for (const s of [this.dogRunSprite, this.dogBarkSprite]) {
      s.animationSpeed = 9 / 60
      s.loop     = true
      s.width    = DOG_W / DOG_H * 150
      s.height   = 150
      s.anchor.set(0.5, 1)
      s.y        = gY + bottomPad
      s.play()
    }

    this.dogBarkSprite.visible = false
    this.activeDogSprite       = this.dogRunSprite
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

  private _buildHud() {
    const W = this.app.screen.width

    const style = (size: number, color = 0xf0f0f0, bold = false) =>
      new PIXI.TextStyle({ fontSize: size, fill: color,
        fontFamily: 'Microsoft JhengHei, Arial',
        fontWeight: bold ? 'bold' : 'normal' })

    // 功率完成率背景
    const ratioBox = new PIXI.Graphics()
    ratioBox.roundRect(10, 10, 160, 48, 8).fill({ color: 0x000000, alpha: 0.55 })
    this.hudLayer.addChild(ratioBox)

    this.hudRatioText = new PIXI.Text({ text: '100%', style: style(20, 0x22c55e, true) })
    this.hudRatioText.x = 18
    this.hudRatioText.y = 28
    this.hudLayer.addChild(this.hudRatioText)

    // 計時
    this.hudTimeText = new PIXI.Text({ text: '00:00', style: style(30, 0xffffff, true) })
    this.hudTimeText.anchor.set(0.5, 0)
    this.hudTimeText.x = W / 2
    this.hudTimeText.y = 10
    this.hudLayer.addChild(this.hudTimeText)

    // 段落名稱
    this.hudSegText = new PIXI.Text({ text: '', style: style(14, 0x60a5fa) })
    this.hudSegText.anchor.set(0.5, 0)
    this.hudSegText.x = W / 2
    this.hudSegText.y = 46
    this.hudLayer.addChild(this.hudSegText)

    // BLE 狀態
    this.hudBleText = new PIXI.Text({ text: '未連接', style: style(13, 0x6b7280) })
    this.hudBleText.anchor.set(1, 0)
    this.hudBleText.x = W - 10
    this.hudBleText.y = 14
    this.hudLayer.addChild(this.hudBleText)

    // 小狗距離
    this.hudDistText = new PIXI.Text({ text: '', style: style(13, 0xffffff) })
    this.hudDistText.anchor.set(0.5, 1)
    this.hudLayer.addChild(this.hudDistText)

    // 小狗標籤（危險/安全）
    this.hudDogLabel = new PIXI.Text({ text: '', style: style(14, 0xef4444, true) })
    this.hudDogLabel.anchor.set(0.5, 1)
    this.hudLayer.addChild(this.hudDogLabel)

    // 休息提示
    this.hudRestText = new PIXI.Text({
      text: '小狗在休息中...',
      style: style(16, 0xf97316, true)
    })
    this.hudRestText.anchor.set(0.5, 0.5)
    this.hudRestText.x = W * 0.72
    this.hudRestText.y = this.app.screen.height * 0.28
    this.hudRestText.visible = false
    this.hudLayer.addChild(this.hudRestText)
  }

  private _buildDangerOverlay() {
    this.dangerOverlay = new PIXI.Graphics()
    this.dangerOverlay.alpha = 0
    this.fxLayer.addChild(this.dangerOverlay)
  }

  // ── 主更新 ────────────────────────────────────────────

  update(dt: number) {
    if (!this.state.isRunning || this.state.isPaused) return

    this.elapsed    += dt
    const speed      = Math.max(1.5, this.state.currentPower / 25)
    this.roadOffset  = (this.roadOffset + speed * dt * 80) % 160

    // 路面虛線位移
    this.roadDashes.forEach((d, i) => {
      d.x = (i * 160 - this.roadOffset + 160 * 10) % (this.roadDashes.length * 160)
        - 160
    })

    // 路燈捲動
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
    this._updateHud()
    this._updateStars()
  }

  private _calcTargetDogX(): number {
    const W = this.app.screen.width
    const riderX = W * 0.22
    const t = Math.max(0, Math.min(1, this.state.distance / GameState.MAX_DIST))
    return riderX + 80 + t * (W - riderX - 80 + 100)
  }

  private _updateDogX(dt: number) {
    if (this.state.dogState === 'resting') {
      this.dogScreenX = this.app.screen.width + 160
      return
    }
    if (this.state.dogState === 'returning') {
      this.dogScreenX -= 900 * dt
      const target = this._calcTargetDogX()
      if (this.dogScreenX <= target) {
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
    this.riderSprite.visible     = !isNerv
    this.riderNervSprite.visible =  isNerv
    this.riderSprite.animationSpeed     = 8 / 60
    this.riderNervSprite.animationSpeed = 10 / 60
  }

  private _updateDog() {
    const showBark = this.state.isDanger || this.state.dogState === 'returning'
    const H  = this.app.screen.height
    const gY = H * 0.60

    this.dogRunSprite.visible  = !showBark
    this.dogBarkSprite.visible =  showBark

    const sprite = showBark ? this.dogBarkSprite : this.dogRunSprite
    sprite.x = this.dogScreenX

    if (this.state.isDanger) {
      const pulse = 1 + Math.sin(this.elapsed * 8) * 0.03
      sprite.scale.set(pulse)
      sprite.animationSpeed = 12 / 60
    } else {
      sprite.scale.set(1)
      sprite.animationSpeed = this.state.dogState === 'returning' ? 14/60 : 9/60
    }

    this.dogRunSprite.visible  = !showBark
    this.dogBarkSprite.visible =  showBark

    // 可見性（畫面外隱藏）
    const visible = this.dogScreenX < this.app.screen.width + 140
    this.dogRunSprite.visible  = visible && !showBark
    this.dogBarkSprite.visible = visible &&  showBark
  }

  private _updateShake(dt: number) {
    this.shakeAmount *= 0.82
    if (this.state.isDanger) {
      this.shakeAmount  = Math.min(6, this.shakeAmount + 0.5)
      this.dangerAlpha  = Math.min(0.5, this.dangerAlpha + 0.035)
    } else {
      this.dangerAlpha = Math.max(0, this.dangerAlpha - 0.025)
    }

    if (this.shakeAmount > 1) {
      this.gameLayer.x = (Math.random() - 0.5) * this.shakeAmount * 2
      this.gameLayer.y = (Math.random() - 0.5) * this.shakeAmount
    } else {
      this.gameLayer.x = this.gameLayer.y = 0
    }

    // 危險紅框重繪
    if (this.dangerAlpha > 0.01) {
      const W = this.app.screen.width
      const H = this.app.screen.height
      const a = this.dangerAlpha
      const bw = W / 6
      const bh = H / 8
      this.dangerOverlay.clear()
      this.dangerOverlay.rect(0,    0,  bw,  H).fill({ color: 0xdc1e1e, alpha: a })
      this.dangerOverlay.rect(W-bw, 0,  bw,  H).fill({ color: 0xdc1e1e, alpha: a })
      this.dangerOverlay.rect(0,    0,  W,   bh).fill({ color: 0xdc1e1e, alpha: a })
      this.dangerOverlay.rect(0,  H-bh, W,   bh).fill({ color: 0xdc1e1e, alpha: a })
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
    const W  = this.app.screen.width
    const sz = this.state.isDanger ? 44 : 32
    const sp = new PIXI.Sprite(this.sweatTextures[0])
    sp.width  = sz
    sp.height = sz
    sp.anchor.set(0.5)
    sp.x = W * 0.22 + (Math.random() - 0.3) * 55
    sp.y = this.app.screen.height * 0.60 - 195 + Math.random() * 25
    this.fxLayer.addChild(sp)
    this.sweatParticles.push({
      sprite: sp,
      vx: (Math.random() - 0.3) * 70,
      vy: -130 - Math.random() * 80,
      life: 0.65 + Math.random() * 0.4,
      maxLife: 1.05,
    })
  }

  private _updateHud() {
    const s = this.state
    const ratio = Math.round(s.powerRatio * 100)
    const ratioColor = ratio >= 100 ? 0x22c55e : ratio >= 85 ? 0xeab308 : 0xef4444

    this.hudRatioText.text  = `功率完成率\n${ratio}%`
    this.hudRatioText.style.fill = ratioColor

    this.hudTimeText.text = s.formatTime(s.totalElapsedSec)

    const seg = s.currentSegment
    this.hudSegText.text = `${seg.name}  ${seg.watts}W`

    this.hudBleText.style.fill = s.simMode ? 0x6b7280 : 0x22c55e
    this.hudBleText.text = s.simMode ? '模擬模式' : 'BLE 已連接'

    // 休息提示
    this.hudRestText.visible = s.dogState === 'resting'
    if (s.dogState === 'resting') {
      this.hudRestText.alpha = 0.65 + 0.2 * Math.sin(this.elapsed * 2.5)
    }

    // 小狗距離標籤
    const H  = this.app.screen.height
    const gY = H * 0.60
    const dogVisible = this.dogScreenX < this.app.screen.width + 140
      && s.dogState !== 'resting'

    this.hudDistText.visible  = dogVisible
    this.hudDogLabel.visible  = dogVisible

    if (dogVisible) {
      this.hudDistText.x = this.dogScreenX
      this.hudDistText.y = gY - 185
      this.hudDistText.text = `${Math.round(s.distance)}M`

      this.hudDogLabel.x = this.dogScreenX
      this.hudDogLabel.y = gY - 200

      if (s.dogState === 'returning') {
        this.hudDogLabel.text = '急速追上!'
        this.hudDogLabel.style.fill = 0xf97316
      } else if (s.isDanger) {
        this.hudDogLabel.text = '危險!'
        this.hudDogLabel.style.fill = 0xef4444
      } else if (s.distance >= 65) {
        this.hudDogLabel.text = '安全!'
        this.hudDogLabel.style.fill = 0x22c55e
      } else {
        this.hudDogLabel.text = ''
      }
    }
  }

  private _updateStars() {
    for (const { g, baseAlpha, phase } of this.stars) {
      g.alpha = baseAlpha * (0.5 + 0.5 * Math.sin(this.elapsed * 2 + phase))
    }
  }

  setBleStatus(connected: boolean, name: string) {
    this.hudBleText.text       = connected ? name : '未連接'
    this.hudBleText.style.fill = connected ? 0x22c55e : 0x6b7280
  }
}
```

---

## src/renderer/index.ts（PixiJS 入口）

```typescript
import * as PIXI from 'pixi.js'
import { GameState, PLANS } from './game/game-state'
import { ChaseScene }       from './game/chase-scene'
import { BleBridge }        from './utils/ble-bridge'

const app = new PIXI.Application()
await app.init({
  resizeTo: window,
  backgroundColor: 0x080818,
  antialias: true,
  resolution: window.devicePixelRatio || 1,
})
document.body.appendChild(app.canvas)

const state = new GameState()
const scene = new ChaseScene(app, state)
await scene.load()
app.stage.addChild(scene)

// BLE 事件
BleBridge.onData(data => {
  if (!state.simMode) {
    state.currentPower   = data.power
    state.currentCadence = data.cadence
    state.currentHr      = data.hr
  }
})
BleBridge.onConnect(name => {
  state.simMode = false
  scene.setBleStatus(true, name)
})
BleBridge.onDisconnect(() => {
  state.simMode = true
  scene.setBleStatus(false, '')
})

// 訓練 tick（1 秒間隔）
setInterval(() => {
  state.tick(watts => BleBridge.setPower(watts))
}, 1000)

// Pixi ticker（每幀）
app.ticker.add(ticker => {
  const dt = ticker.deltaMS / 1000
  scene.update(dt)
})

// 暫時自動開始（正式版加選單）
state.selectPlan(PLANS[1])
state.start()
```

---

## 打包指令

```bash
# 安裝依賴
npm install

# Pi 5 開發測試
npm run dev

# 打包 Pi 5（ARM64 AppImage）
npm run dist:pi

# 打包 Windows（在 Windows 環境執行，或用 cross-compilation）
npm run dist:win
```

---

## Antigravity 操作指令

貼入以下指令讓 AI 依序建立所有檔案：

```
Create a cross-platform Electron + PixiJS v8 + TypeScript game project
called cycling-chase-game with the exact file structure and code shown above.

Steps:
1. Create package.json and install all dependencies
2. Create tsconfig.json and vite.config.ts
3. Create all src/main/ files (index.ts, ble-manager.ts, ipc-handlers.ts)
4. Create all src/renderer/ files in order:
   utils/ble-bridge.ts → game/game-state.ts → game/chase-scene.ts → index.ts
5. Create electron-builder.yml
6. Create index.html in src/renderer/
7. Run: npm install
8. Run: npm run dev  (test in development mode)

Do not modify any logic. Implement exactly as specified.
Assets folder already contains rider.png, dog.png, sweat.png.
```
