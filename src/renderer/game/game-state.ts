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
