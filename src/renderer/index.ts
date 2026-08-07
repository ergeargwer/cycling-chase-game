import * as PIXI from 'pixi.js'
import { GameState, type WorkoutPlan } from './game/game-state'
import { ChaseScene }  from './game/chase-scene'
import { resolveThemeId } from './game/themes'
import { MenuScene }   from './scenes/menu-scene'
import { PlanScene }   from './scenes/plan-scene'
import { BleBridge }   from './utils/ble-bridge'

/**
 * 注意：不可在此檔使用 top-level await。
 * Vite 會把 Pixi 的 WebGL/WebGPU renderer 拆成獨立 chunk，那些 chunk 會
 * 再 static import 回本 entry。若 entry 有 TLA，模組評估會與動態 import
 * 形成循環依賴死鎖，GitHub Pages / 生產環境會永遠停在載入畫面。
 */
async function bootstrap() {
  // ── App bootstrap ────────────────────────────────────────

  const app = new PIXI.Application()
  await app.init({
    resizeTo: window,
    backgroundColor: 0x06060f,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  })
  document.body.appendChild(app.canvas)

  // ── Shared state ─────────────────────────────────────────

  const state = new GameState()
  type Screen = 'menu' | 'plan' | 'chase'
  let screen: Screen = 'menu'
  let bleConnected = false
  let bleName = ''

  // URL：?theme=<id> 例 ambulance|firetruck|bikini|foodpanda|grandma|…
  const bootParams = new URLSearchParams(location.search)
  let currentThemeId = resolveThemeId(bootParams.get('theme'))

  // ── Scenes ───────────────────────────────────────────────

  const menuScene = new MenuScene(app, {
    onStart: () => showPlan(),
    onBleScan: async () => {
      try {
        menuScene.setBleStatus(false, '掃描中…')
        const res = await BleBridge.scan()
        if (res?.ok) {
          bleConnected = true
          bleName = res.name || '騎行台'
          state.simMode = false
          menuScene.setBleStatus(true, bleName)
          chaseScene.setBleStatus(true, bleName)
        } else {
          menuScene.setBleStatus(false, '')
        }
      } catch {
        menuScene.setBleStatus(false, '')
      }
    },
  })

  const planScene = new PlanScene(app, {
    onConfirm: (plan, themeId) => startChase(plan, themeId),
    onBack: () => showMenu(),
  }, currentThemeId)

  const chaseScene = new ChaseScene(app, state, {
    onQuit: () => {
      state.isRunning = false
      state.isPaused = false
      state.isFinished = false
      showMenu()
    },
    onRestart: () => {
      startChase(state.plan, currentThemeId)
    },
  }, currentThemeId)

  // ── Screen switching ─────────────────────────────────────

  function clearStage() {
    app.stage.removeChildren()
  }

  function showMenu() {
    screen = 'menu'
    clearStage()
    menuScene.build()
    if (bleConnected) menuScene.setBleStatus(true, bleName)
    app.stage.addChild(menuScene)
  }

  function showPlan() {
    screen = 'plan'
    clearStage()
    planScene.setThemeId(currentThemeId)
    planScene.build()
    app.stage.addChild(planScene)
  }

  async function startChase(plan: WorkoutPlan, themeId?: string) {
    if (themeId) currentThemeId = resolveThemeId(themeId)
    clearStage()
    state.selectPlan(plan)
    state.start()
    chaseScene.setTheme(currentThemeId)
    await chaseScene.load()
    if (bleConnected) {
      state.simMode = false
      chaseScene.setBleStatus(true, bleName)
      BleBridge.setPower(state.targetPower).catch(() => {})
    } else {
      chaseScene.setBleStatus(false, '')
    }
    app.stage.addChild(chaseScene)
    screen = 'chase'
  }

  // ── BLE events ───────────────────────────────────────────

  BleBridge.onData(data => {
    if (!state.simMode) {
      state.currentPower   = data.power
      state.currentCadence = data.cadence
      state.currentHr      = data.hr
    }
  })
  BleBridge.onConnect(name => {
    bleConnected = true
    bleName = name
    state.simMode = false
    menuScene.setBleStatus(true, name)
    chaseScene.setBleStatus(true, name)
  })
  BleBridge.onDisconnect(() => {
    bleConnected = false
    bleName = ''
    state.simMode = true
    menuScene.setBleStatus(false, '')
    chaseScene.setBleStatus(false, '')
  })

  // ── Training tick ────────────────────────────────────────

  setInterval(() => {
    if (screen !== 'chase') return
    state.tick(watts => {
      if (!state.simMode) BleBridge.setPower(watts).catch(() => {})
    })
  }, 1000)

  // ── Frame loop ───────────────────────────────────────────

  app.ticker.add(ticker => {
    const dt = ticker.deltaMS / 1000
    if (screen === 'menu')  menuScene.update(dt)
    if (screen === 'plan')  planScene.update(dt)
    if (screen === 'chase') chaseScene.update(dt)
  })

  // ── Resize ───────────────────────────────────────────────

  let resizeTimer: ReturnType<typeof setTimeout> | null = null
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (screen === 'menu')  menuScene.resize()
      if (screen === 'plan')  planScene.resize()
      if (screen === 'chase') chaseScene.resize()
    }, 150)
  })

  // ── Keyboard shortcuts ───────────────────────────────────

  window.addEventListener('keydown', (e) => {
    if (screen !== 'chase') return
    if (e.code === 'Space' || e.code === 'KeyP') {
      e.preventDefault()
      if (state.isRunning && !state.isFinished) {
        state.isPaused = !state.isPaused
      }
    }
    if (e.code === 'Escape') {
      if (state.isPaused) {
        state.isRunning = false
        state.isPaused = false
        showMenu()
      } else if (state.isRunning && !state.isFinished) {
        state.isPaused = true
      }
    }
  })

  // ── Boot ─────────────────────────────────────────────────

  // 開發除錯：?screen=plan|chase&theme=<themeId>
  const bootScreen = bootParams.get('screen')
  if (bootScreen === 'plan') {
    showPlan()
  } else if (bootScreen === 'chase') {
    await startChase(state.plan, currentThemeId)
  } else {
    showMenu()
  }

  // 供自動化測試 / 除錯
  ;(window as unknown as { __gameNav: unknown }).__gameNav = {
    showMenu,
    showPlan,
    startChase,
    state,
    getThemeId: () => currentThemeId,
    setThemeId: (id: string) => { currentThemeId = resolveThemeId(id) },
  }
}

bootstrap().catch((err) => {
  console.error('[bootstrap]', err)
  const boot = document.getElementById('boot')
  if (boot) {
    boot.innerHTML = `
      <div class="brand">SMART CYCLING</div>
      <div class="title">載入失敗</div>
      <div class="sub" style="letter-spacing:0.1em;max-width:80%;text-align:center;color:#f87171;margin-bottom:16px">
        ${String((err as Error)?.message || err)}
      </div>
      <button type="button" style="padding:10px 20px;border:0;border-radius:8px;background:#22d3ee;color:#06060f;font-weight:700;cursor:pointer"
        onclick="location.reload()">重新整理</button>
    `
  }
})
