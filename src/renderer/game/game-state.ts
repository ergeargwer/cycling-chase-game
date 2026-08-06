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

/**
 * 狗狀態：
 * - chasing   正常追逐，距離依功率趨近平衡點
 * - retreating 喘一口氣，跑出畫面（視覺退場）
 * - resting   在場外休息，騎手可拉開距離
 * - returning 從場外急速衝回，短暫壓近距離
 */
export type DogState = 'chasing' | 'retreating' | 'resting' | 'returning'

export class GameState {
  static MIN_DIST          = 0
  static MAX_DIST          = 80
  static DANGER_THRESHOLD  = 10
  static NERVOUS_THRESHOLD = 25
  /** 剛好達標時的平衡距離（公尺） */
  static EQUILIBRIUM_AT_TARGET = 40
  /** 每秒向平衡距離收斂的比例（0–1） */
  static APPROACH_RATE     = 0.10
  /** 功率不足時距離收斂加速（狗更積極） */
  static UNDER_BOOST       = 1.35
  /** 功率過剩時距離收斂略緩（拉開需持續出力） */
  static OVER_DAMP         = 0.85
  /** 休息時每秒拉開的距離 */
  static REST_GAIN_PER_SEC = 1.2
  /** 追回時每秒壓近的距離 */
  static RETURN_CLOSE_PER_SEC = 3.5
  /** 僅當距離大於此值才會觸發休息（危險時不偷懶） */
  static REST_MIN_DIST     = 22
  static REST_INTERVAL_MIN = 28
  static REST_INTERVAL_MAX = 42
  static REST_DURATION_MIN = 4
  static REST_DURATION_MAX = 7
  /** 退場狀態持續秒數（tick 為整秒） */
  static RETREAT_DURATION  = 1

  plan:             WorkoutPlan = PLANS[0]
  segIdx:           number      = 0
  segElapsedSec:    number      = 0
  totalElapsedSec:  number      = 0
  currentPower:     number      = 0
  currentCadence:   number      = 0
  currentHr:        number      = 0
  targetPower:      number      = 80
  distance:         number      = 40
  /** 平滑後的功率比，避免距離每秒抖動 */
  smoothRatio:      number      = 1
  isRunning:        boolean     = false
  isPaused:         boolean     = false
  isFinished:       boolean     = false
  simMode:          boolean     = true
  dogState:         DogState    = 'chasing'
  /** 休息剩餘秒數 */
  restCountdown:    number      = 0
  /** 退場剩餘秒數 */
  retreatCountdown: number      = 0
  /** 距離下次可進入休息的「追逐秒數」（僅 chasing 時遞減） */
  nextRestIn:       number      = 0
  powerHistory:     number[]    = []
  targetHistory:    number[]    = []

  constructor() { this.scheduleRest() }

  selectPlan(plan: WorkoutPlan) { this.plan = plan }

  start() {
    this.segIdx            = 0
    this.segElapsedSec     = 0
    this.totalElapsedSec   = 0
    this.distance          = GameState.EQUILIBRIUM_AT_TARGET
    this.smoothRatio       = 1
    this.dogState          = 'chasing'
    this.restCountdown     = 0
    this.retreatCountdown  = 0
    this.isRunning         = true
    this.isPaused          = false
    this.isFinished        = false
    this.targetPower       = this.plan.segments[0].watts
    this.powerHistory      = []
    this.targetHistory     = []
    this.scheduleRest()
  }

  /**
   * 依功率完成率計算「應有」距離：
   *  0.55× → 0 m，1.0× → 40 m，1.45× → 80 m（中間線性）
   */
  equilibriumDistance(ratio: number): number {
    const r = Math.max(0.2, Math.min(1.6, ratio))
    const lo = 0.55
    const hi = 1.45
    if (r <= lo) return GameState.MIN_DIST
    if (r >= hi) return GameState.MAX_DIST
    if (r <= 1) {
      const t = (r - lo) / (1 - lo)
      return GameState.MIN_DIST + t * (GameState.EQUILIBRIUM_AT_TARGET - GameState.MIN_DIST)
    }
    const t = (r - 1) / (hi - 1)
    return GameState.EQUILIBRIUM_AT_TARGET
      + t * (GameState.MAX_DIST - GameState.EQUILIBRIUM_AT_TARGET)
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
      // 模擬：大多貼近目標，偶爾掉下去／衝一下，方便感受距離變化
      const drift = Math.sin(t * 0.35) * 0.12 + Math.sin(t * 0.11) * 0.06
      const noise = (Math.random() - 0.5) * 0.08
      const simRatio = Math.max(0.55, Math.min(1.35, 1 + drift + noise))
      this.currentPower   = Math.max(0, Math.round(seg.watts * simRatio))
      this.currentCadence = Math.round(85 + (simRatio - 1) * 25 + (Math.random() - 0.5) * 6)
      this.currentHr      = Math.round(
        125 + (seg.watts - 100) * 0.28 + (simRatio - 1) * 40 + (Math.random() - 0.5) * 4)
    }

    const rawRatio = this.currentPower / Math.max(1, this.targetPower)
    // 指數平滑，削弱一秒級功率抖動對距離的影響
    this.smoothRatio += (rawRatio - this.smoothRatio) * 0.35

    this._tickDogAndDistance()

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

  private _tickDogAndDistance() {
    switch (this.dogState) {
      case 'chasing':
        this._applyChaseDistance()
        // 只在追逐中倒數休息，避免休息／追回期間「透支」計時
        this.nextRestIn--
        if (this.nextRestIn <= 0 && this.distance >= GameState.REST_MIN_DIST) {
          this.dogState = 'retreating'
          this.retreatCountdown = GameState.RETREAT_DURATION
        } else if (this.nextRestIn <= 0) {
          // 太近時延後休息，狗繼續咬住
          this.nextRestIn = 6 + Math.random() * 6
        }
        break

      case 'retreating':
        // 退場期間騎手略拉開，但不做完整平衡收斂
        this.distance = Math.min(
          GameState.MAX_DIST,
          this.distance + GameState.REST_GAIN_PER_SEC * 0.6,
        )
        this.retreatCountdown--
        if (this.retreatCountdown <= 0) {
          this.dogState = 'resting'
          const span = GameState.REST_DURATION_MAX - GameState.REST_DURATION_MIN
          this.restCountdown = GameState.REST_DURATION_MIN + Math.random() * span
        }
        break

      case 'resting':
        // 狗在場外：功率仍影響，但整體偏向拉開（喘息空間）
        this.distance = Math.min(
          GameState.MAX_DIST,
          this.distance + GameState.REST_GAIN_PER_SEC
            + Math.max(0, this.smoothRatio - 0.9) * 1.5,
        )
        this.restCountdown--
        if (this.restCountdown <= 0) {
          this.dogState = 'returning'
        }
        break

      case 'returning': {
        // 急速追回：壓近距離，形成節奏張力；不低於緊張門檻太多以免秒殺
        const floor = Math.max(
          GameState.DANGER_THRESHOLD + 4,
          this.equilibriumDistance(this.smoothRatio) * 0.55,
        )
        this.distance = Math.max(
          floor,
          this.distance - GameState.RETURN_CLOSE_PER_SEC,
        )
        // 視覺層在 chase-scene 抵達目標位後會切回 chasing
        break
      }
    }
  }

  /** 追逐中：距離向「功率對應平衡點」平滑收斂 */
  private _applyChaseDistance() {
    const eq = this.equilibriumDistance(this.smoothRatio)
    const diff = eq - this.distance
    let rate = GameState.APPROACH_RATE
    if (diff < 0) rate *= GameState.UNDER_BOOST   // 被追上：收斂較快
    else if (diff > 0) rate *= GameState.OVER_DAMP // 拉開：需持續出力
    this.distance = Math.max(
      GameState.MIN_DIST,
      Math.min(GameState.MAX_DIST, this.distance + diff * rate),
    )
  }

  /**
   * 視覺層通知：狗已衝回畫面上正確位置，恢復追逐。
   * 在此才排程下一次休息，避免休息週期重疊。
   */
  onReturnComplete() {
    if (this.dogState !== 'returning') return
    this.dogState = 'chasing'
    this.scheduleRest()
  }

  get isDanger()  {
    return this.distance <= GameState.DANGER_THRESHOLD
      && (this.dogState === 'chasing' || this.dogState === 'returning')
  }
  get isNervous() {
    return this.distance <= GameState.NERVOUS_THRESHOLD
      && (this.dogState === 'chasing' || this.dogState === 'returning')
  }
  get powerRatio() { return this.currentPower / Math.max(1, this.targetPower) }
  get currentSegment() {
    return this.plan.segments[Math.min(this.segIdx, this.plan.segments.length - 1)]
  }

  formatTime(sec: number) {
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  }

  private scheduleRest() {
    const span = GameState.REST_INTERVAL_MAX - GameState.REST_INTERVAL_MIN
    this.nextRestIn = GameState.REST_INTERVAL_MIN + Math.random() * span
  }
}
