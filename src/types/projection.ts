/**
 * Tipos espelhando a resposta do GET /api/v1/dashboard/projection.
 * Apenas para renderização; nenhuma lógica de cálculo.
 */
export interface DashboardProjection {
  period: PeriodInfo
  totals: TotalsInfo
  progress: ProgressInfo
  weeks: WeekInfo[]
  goalProjection: GoalProjectionInfo | null
}

export type GoalStatus = 'ATINGIVEL' | 'EM_RISCO' | 'IMPOSSIVEL'

export interface GoalProjectionInfo {
  currentRatePerDay: number
  projectedBalanceAtEnd: number
  targetHours: number
  goalStatus: GoalStatus
}

export interface PeriodInfo {
  start: string
  end: string
  totalDays: number
}

export interface TotalsInfo {
  totalWorked: number
  totalAdjusted: number
  balance: number
  /** Proporção (expectativa/168) × 720 — horas no mês cheio (30 dias). */
  fullMonthMaxHours: number
  /** Horas disponíveis no período (proporção da semana aplicada aos dias do período). */
  availableHoursInPeriod: number
}

export interface ProgressInfo {
  daysElapsed: number
  totalDays: number
  percentageElapsed: number
}

export interface DayInWeek {
  date: string
  weekdayLabel: string
  dayOfMonth: number
  past: boolean
  holiday: boolean
  userOverride: boolean
}

export interface WeekInfo {
  weekStart: string
  weekEnd: string
  totalWorked: number
  totalAdjusted: number
  balance: number
  workingDaysCount: number
  hoursAvailable: number
  baseWeeklyHours: number
  /** Total de horas do segmento (24 × dias). Usado no label "Z Totais". */
  totalSegmentHours: number
  /** Ordem Seg–Dom: S T Q Q S (S)(D) */
  days: DayInWeek[]
}
