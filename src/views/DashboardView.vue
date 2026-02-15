<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchProjection } from '@/services/api'
import HourEntryModal from '@/components/HourEntryModal.vue'
import type { DashboardProjection, DayInWeek } from '@/types/projection'

const projection = ref<DashboardProjection | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const entryModalOpen = ref(false)
const entryModalInitialDate = ref<string | null>(null)

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  return `${formatDate(weekStart)} – ${formatDate(weekEnd)}`
}

function formatHours(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function goalStatusLabel(status: string): string {
  switch (status) {
    case 'ATINGIVEL':
      return 'Meta atingível'
    case 'EM_RISCO':
      return 'Em risco'
    case 'IMPOSSIVEL':
      return 'Impossível atingir'
    default:
      return status
  }
}

const HOURS_PER_DAY = 24

/** Dias no segmento da semana (weekStart até weekEnd, inclusive). */
function weekSegmentDays(week: { weekStart: string; weekEnd: string }): number {
  const start = new Date(week.weekStart + 'T12:00:00').getTime()
  const end = new Date(week.weekEnd + 'T12:00:00').getTime()
  return Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1
}

/** Total de horas da barra = 24 × dias do segmento (usa totalSegmentHours da API quando existir). */
function weekBarTotalHours(week: { weekStart: string; weekEnd: string; totalSegmentHours?: number }): number {
  if (week.totalSegmentHours != null && week.totalSegmentHours > 0) return week.totalSegmentHours
  return HOURS_PER_DAY * weekSegmentDays(week)
}

/** Horas efetivas da semana = trabalhado (entradas) + ajustes. */
function weekEffectiveWorked(week: { totalWorked: number; totalAdjusted: number }): number {
  return (week?.totalWorked ?? 0) + (week?.totalAdjusted ?? 0)
}

/** % do preenchimento da barra em relação ao total (0–100). */
function weekBarFillPercent(week: { weekStart: string; weekEnd: string; totalWorked: number; totalAdjusted: number }): number {
  const total = weekBarTotalHours(week)
  if (total <= 0) return 0
  const filled = weekEffectiveWorked(week)
  return Math.min(100, (filled / total) * 100)
}

/** % da posição do marco "horas disponíveis" na barra. */
function weekMarkerAvailablePercent(week: { weekStart: string; weekEnd: string; hoursAvailable: number }): number {
  const total = weekBarTotalHours(week)
  if (total <= 0 || week.hoursAvailable == null) return 0
  return Math.min(100, (week.hoursAvailable / total) * 100)
}

/** Mostrar marco "disponíveis" só se estiver dentro da barra (horas disponíveis < total da semana). */
function weekShowAvailableMarker(week: { weekStart: string; weekEnd: string; hoursAvailable: number }): boolean {
  const total = weekBarTotalHours(week)
  if (total <= 0 || week.hoursAvailable == null || week.hoursAvailable <= 0) return false
  return week.hoursAvailable < total
}

/** Cor/estado da barra: progresso em relação às horas disponíveis; ao passar, cor única. */
function weekBarFillClass(week: { totalWorked: number; totalAdjusted: number; hoursAvailable: number }): string {
  const worked = weekEffectiveWorked(week)
  const available = week.hoursAvailable ?? 0
  if (available <= 0) return 'week-bar-fill--neutral'
  if (worked >= available) return 'week-bar-fill--done'
  const ratio = worked / available
  if (ratio < 0.33) return 'week-bar-fill--low'
  if (ratio < 0.66) return 'week-bar-fill--mid'
  return 'week-bar-fill--high'
}

/** Formato por semana: Xh trabalhadas / Yh disponíveis / Zh Totais. */
function formatWeekProjection(week: { totalWorked: number; totalAdjusted?: number; hoursAvailable?: number; totalSegmentHours?: number }): string {
  const worked = formatHours(weekEffectiveWorked(week))
  const available = week.hoursAvailable != null ? formatHours(week.hoursAvailable) : '–'
  const total = week.totalSegmentHours != null ? formatHours(week.totalSegmentHours) : '–'
  return `${worked} trabalhadas / ${available} disponíveis / ${total} Totais`
}

function openEntryModal(initialDate?: string | null) {
  entryModalInitialDate.value = initialDate ?? null
  entryModalOpen.value = true
}

async function onEntryModalSaved() {
  try {
    const updated = await fetchProjection()
    if (updated) projection.value = updated
  } catch (_) {
    // mantém dados atuais em caso de falha
  }
}

/** Horas disponíveis no período (escala da barra de projeção). */
const projectionAvailableHours = computed(() =>
  projection.value ? projection.value.totals.availableHoursInPeriod : 0
)
/** Onde deveria estar hoje = proporção do período × horas disponíveis. */
const projectionTargetHours = computed(() => {
  if (!projection.value || projectionAvailableHours.value <= 0) return 0
  return projection.value.progress.percentageElapsed * projection.value.totals.availableHoursInPeriod
})
/** Posição da marca em % (de baixo para cima). */
const projectionTargetPercent = computed(() =>
  projection.value ? projection.value.progress.percentageElapsed * 100 : 0
)
/** Horas efetivas do período = trabalhado (entradas) + ajustes. */
const projectionEffectiveWorked = computed(() => {
  if (!projection.value) return 0
  return (projection.value.totals.totalWorked ?? 0) + (projection.value.totals.totalAdjusted ?? 0)
})

/** Altura do preenchimento da barra = horas efetivas / horas disponíveis (máx. 100%). */
const projectionFillPercent = computed(() => {
  if (!projection.value || projectionAvailableHours.value <= 0) return 0
  const p = (projectionEffectiveWorked.value / projectionAvailableHours.value) * 100
  return Math.min(100, p)
})

onMounted(async () => {
  try {
    projection.value = await fetchProjection()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar projeção'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <div class="dashboard-header-text">
        <h1 class="dashboard-title">Work Hours Dashboard</h1>
        <p class="dashboard-subtitle">Visão do período de fechamento</p>
      </div>
      <button
        v-if="!loading && !error && projection"
        type="button"
        class="header-cta-btn"
        @click="openEntryModal()"
      >
        Registrar horas
      </button>
    </header>

    <div v-if="loading" class="dashboard-loading">Carregando…</div>
    <div v-else-if="error" class="dashboard-error">{{ error }}</div>
    <div v-else-if="!projection" class="dashboard-empty">
      Nenhuma configuração de fechamento. Configure o período no backend.
    </div>

    <template v-else>
      <!-- Linha do período -->
      <section class="card period-line-card">
        <h2 class="card-title">Período</h2>
        <div class="period-line">
          <span class="period-line-label start">{{ formatDate(projection.period.start) }}</span>
          <div class="period-line-track">
            <div
              class="period-line-fill"
              :style="{ width: `${projection.progress.percentageElapsed * 100}%` }"
            />
            <div
              class="period-line-marker"
              :style="{ left: `${projection.progress.percentageElapsed * 100}%` }"
              title="Posição atual"
            />
          </div>
          <span class="period-line-label end">{{ formatDate(projection.period.end) }}</span>
        </div>
        <p class="period-position">
          Dia <strong>{{ projection.progress.daysElapsed }}</strong> de
          <strong>{{ projection.progress.totalDays }}</strong>
          ({{ (projection.progress.percentageElapsed * 100).toFixed(0) }}% do período)
        </p>
      </section>

      <!-- Resumo geral -->
      <section class="card summary-card">
        <h2 class="card-title">Resumo geral</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Total trabalhado</span>
            <span class="summary-value worked">{{ formatHours(projection.totals.totalWorked) }} h</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total ajustado</span>
            <span class="summary-value adjusted">{{ formatHours(projection.totals.totalAdjusted) }} h</span>
          </div>
          <div class="summary-item highlight">
            <span class="summary-label">Saldo do período</span>
            <span class="summary-value balance">{{ formatHours(projection.totals.balance) }} h</span>
          </div>
        </div>
      </section>

      <!-- Projeção e status da meta -->
      <section v-if="projection.goalProjection" class="card goal-card">
        <h2 class="card-title">Projeção até o fim do período</h2>
        <div class="goal-content">
          <div class="goal-stats">
            <div class="goal-stat">
              <span class="goal-stat-label">Ritmo atual</span>
              <span class="goal-stat-value">{{ formatHours(projection.goalProjection.currentRatePerDay) }} h/dia</span>
            </div>
            <div class="goal-stat">
              <span class="goal-stat-label">Projeção ao fim</span>
              <span class="goal-stat-value">{{ formatHours(projection.goalProjection.projectedBalanceAtEnd) }} h</span>
            </div>
            <div class="goal-stat">
              <span class="goal-stat-label">Meta do período</span>
              <span class="goal-stat-value">{{ formatHours(projection.goalProjection.targetHours) }} h</span>
            </div>
          </div>
          <div class="goal-status" :class="projection.goalProjection.goalStatus">
            <span class="goal-status-label">{{ goalStatusLabel(projection.goalProjection.goalStatus) }}</span>
          </div>
        </div>
      </section>

      <div class="dashboard-row">
        <!-- Indicador de projeção: barra = horas trabalhadas; marca = onde deveria estar hoje -->
        <section class="card projection-indicator-card">
          <h2 class="card-title">Projeção do período</h2>
          <div class="projection-bar">
            <div class="projection-bar-track">
              <div
                class="projection-bar-fill"
                :style="{ height: `${projectionFillPercent}%` }"
              />
              <div
                v-if="projectionAvailableHours > 0"
                class="projection-bar-marker"
                :style="{ bottom: `${projectionTargetPercent}%` }"
                title="Onde você deveria estar hoje"
              />
            </div>
            <div class="projection-bar-labels">
              <span>{{ formatHours(projection.totals.availableHoursInPeriod) }} h</span>
              <span v-if="projectionAvailableHours > 0" class="projection-label-today">{{ formatHours(projectionTargetHours) }} h (hoje)</span>
              <span>0 h</span>
            </div>
          </div>
          <p class="projection-bar-caption">Horas trabalhadas — suba até a marca para acompanhar o ritmo do período.</p>
        </section>

        <!-- Barras semanais: [intervalo] bolinhas (dia da semana + número) [barra] -->
        <section class="card weeks-card">
          <h2 class="card-title">Horas por semana</h2>
          <div class="weeks-bars">
            <div
              v-for="(week, i) in projection.weeks"
              :key="i"
              class="week-row"
            >
              <span class="week-label">{{ formatWeekRange(week.weekStart, week.weekEnd) }}</span>
              <div class="week-days-slot">
                <div
                  v-for="(day, j) in (week.days ?? [])"
                  :key="j"
                  class="day-ball"
                  :class="{
                    'day-ball--past': day.past,
                    'day-ball--holiday': day.holiday,
                    'day-ball--clickable': !day.past
                  }"
                  :title="day.past ? 'Dia passado' : (day.holiday ? 'Feriado' : 'Clique para registrar horas')"
                  @click="!day.past && openEntryModal(day.date)"
                >
                  <span class="day-ball-weekday">{{ day.weekdayLabel }}</span>
                  <span class="day-ball-num">{{ day.dayOfMonth }}</span>
                  <span v-if="day.holiday" class="day-ball-badge day-ball-badge--feriado">Feriado</span>
                </div>
              </div>
              <div
                class="week-bar-track"
                :title="`Totais: ${formatHours(weekBarTotalHours(week))} h · Trabalhadas: ${formatHours(weekEffectiveWorked(week))} h · Disponíveis: ${formatHours(week.hoursAvailable ?? 0)} h`"
              >
                <div
                  class="week-bar-fill"
                  :class="weekBarFillClass(week)"
                  :style="{ width: `${weekBarFillPercent(week)}%` }"
                  :title="`Horas trabalhadas: ${formatHours(weekEffectiveWorked(week))} h`"
                />
                <div
                  v-if="weekShowAvailableMarker(week)"
                  class="week-bar-marker"
                  :style="{ left: `${weekMarkerAvailablePercent(week)}%` }"
                  :title="`Horas disponíveis (proporção da semana): ${formatHours(week.hoursAvailable)} h`"
                />
              </div>
              <span class="week-value week-projection">{{ formatWeekProjection(week) }}</span>
            </div>
          </div>
        </section>
      </div>

      <HourEntryModal
        :show="entryModalOpen"
        :initial-date="entryModalInitialDate"
        @close="entryModalOpen = false"
        @saved="onEntryModalSaved"
      />
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100%;
  background: var(--bg-page, #f5f2ee);
  font-family: 'DM Sans', system-ui, sans-serif;
  padding: 1.5rem;
  box-sizing: border-box;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
}

.dashboard-header-text {
  min-width: 0;
}

.dashboard-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #1a1a1a);
  letter-spacing: -0.02em;
}

.dashboard-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.95rem;
  color: var(--text-muted, #6b6b6b);
}

.header-cta-btn {
  flex-shrink: 0;
  padding: 0.5rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  background: var(--accent, #d97706);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}

.header-cta-btn:hover {
  background: var(--accent-hover, #b85f05);
}

.dashboard-loading,
.dashboard-error,
.dashboard-empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
}

.dashboard-error {
  color: var(--error, #c53030);
}

.card {
  background: var(--card-bg, #fff);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.card-title {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Linha do período */
.period-line {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.period-line-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  flex-shrink: 0;
  min-width: 4rem;
}

.period-line-label.end {
  text-align: right;
}

.period-line-track {
  flex: 1;
  height: 10px;
  background: var(--track-bg, #e8e4df);
  border-radius: 5px;
  position: relative;
  overflow: visible;
}

.period-line-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--accent, #d97706);
  border-radius: 5px;
  transition: width 0.3s ease;
}

.period-line-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: var(--accent, #d97706);
  border: 2px solid var(--card-bg, #fff);
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  z-index: 1;
  transition: left 0.3s ease;
}

.period-position {
  margin: 0.75rem 0 0;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.period-position strong {
  color: var(--accent, #d97706);
}

/* Projeção e meta */
.goal-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem;
}

.goal-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.goal-stat {
  padding: 0.5rem 0.75rem;
  background: var(--bg-page, #f5f2ee);
  border-radius: 8px;
}

.goal-stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.15rem;
}

.goal-stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.goal-status {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
}

.goal-status.ATINGIVEL {
  background: var(--status-ok, rgba(34, 197, 94, 0.2));
  color: var(--status-ok-text, #15803d);
}

.goal-status.EM_RISCO {
  background: var(--status-warn, rgba(234, 179, 8, 0.25));
  color: var(--status-warn-text, #a16207);
}

.goal-status.IMPOSSIVEL {
  background: var(--status-danger, rgba(220, 38, 38, 0.15));
  color: var(--status-danger-text, #b91c1c);
}

/* Resumo */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.summary-item {
  padding: 0.75rem;
  background: var(--bg-page, #f5f2ee);
  border-radius: 8px;
}

.summary-item.highlight {
  background: var(--accent-subtle, rgba(217, 119, 6, 0.12));
}

.summary-label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary);
}

.summary-value.balance {
  color: var(--accent, #d97706);
}

.summary-hint {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

/* Layout em linha: termômetro + semanas */
.dashboard-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1.25rem;
}

@media (max-width: 700px) {
  .dashboard-row {
    grid-template-columns: 1fr;
  }
}

/* Indicador de projeção: barra = horas trabalhadas; marca = onde deveria estar hoje */
.projection-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.projection-bar-track {
  width: 28px;
  height: 160px;
  background: var(--track-bg, #e8e4df);
  border-radius: 14px;
  position: relative;
  overflow: visible;
}

.projection-bar-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, var(--accent, #d97706), #f59e0b);
  border-radius: 14px;
  transition: height 0.3s ease;
}

.projection-bar-marker {
  position: absolute;
  left: -4px;
  right: -4px;
  height: 3px;
  margin-bottom: -1.5px;
  background: var(--text-primary, #1a1a1a);
  border-radius: 2px;
  z-index: 1;
  box-shadow: 0 0 0 1px var(--card-bg, #fff);
}

.projection-bar-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 160px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.projection-bar-caption {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Barras semanais */
.weeks-bars {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.week-row {
  display: grid;
  grid-template-columns: 140px 296px minmax(80px, 1fr) 260px;
  align-items: center;
  gap: 0 1rem;
  min-width: 0;
}

/* Largura fixa = espaço de 7 dias + folga para não cortar. Barras alinhadas. */
.week-days-slot {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
  min-width: 280px;
  max-width: 280px;
  flex-shrink: 0;
  box-sizing: border-box;
  padding-right: 1rem;
  overflow: visible;
}

.day-ball {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  width: 34px;
  height: 44px;
  padding: 4px 2px;
  border-radius: 10px;
  background: var(--track-bg, #e8e4df);
  transition: background 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.day-ball--past {
  opacity: 0.5;
  pointer-events: none;
}

.day-ball--holiday {
  border: 1px solid var(--accent, #d97706);
  background: rgba(217, 119, 6, 0.08);
}

.day-ball-badge--feriado {
  font-size: 0.6rem;
  padding: 0.1rem 0.35rem;
  background: rgba(217, 119, 6, 0.2);
  color: #92400e;
  border-radius: 4px;
}

.day-ball--clickable {
  cursor: pointer;
}

.day-ball--clickable:hover {
  box-shadow: 0 0 0 2px var(--accent-subtle, rgba(217, 119, 6, 0.4));
}

.day-ball-weekday {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.1;
  margin-bottom: 2px;
}

.day-ball-num {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.day-ball--past .day-ball-num,
.day-ball--past .day-ball-weekday {
  color: var(--text-muted);
}

.day-ball-badge {
  font-size: 0.55rem;
  color: var(--accent, #d97706);
  font-weight: 600;
  text-transform: uppercase;
  margin-top: 1px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.week-label {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.week-bar-track {
  position: relative;
  height: 24px;
  min-width: 60px;
  margin-left: 0.5rem;
  background: var(--track-bg, #e8e4df);
  border-radius: 6px;
  overflow: visible;
}

.week-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s ease;
  cursor: default;
  position: relative;
  z-index: 0;
}

/* Cores flat (sem fade) */
.week-bar-fill--low {
  background: #ea580c;
}

.week-bar-fill--mid {
  background: #eab308;
}

.week-bar-fill--high {
  background: #22c55e;
}

.week-bar-fill--done {
  background: #16a34a;
}

.week-bar-fill--neutral {
  background: var(--accent, #d97706);
}

/* Marcos iguais ao da projeção do período: preto, bordinha pra fora da barra */
.week-bar-marker {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 3px;
  margin-left: -1.5px;
  background: var(--text-primary, #1a1a1a);
  border-radius: 2px;
  box-shadow: 0 0 0 1px var(--card-bg, #fff);
  z-index: 1;
  pointer-events: auto;
  cursor: default;
  box-sizing: border-box;
}

.week-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
}

.week-value.week-projection {
  font-weight: 500;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  min-width: 0;
  word-break: break-word;
}

@media (max-width: 900px) {
  .week-row {
    grid-template-columns: 120px 276px minmax(60px, 1fr) 220px;
    gap: 0 0.75rem;
  }
  .week-days-slot {
    min-width: 260px;
    max-width: 260px;
    padding-right: 0.75rem;
  }
  .week-bar-track {
    margin-left: 0.375rem;
  }
}
</style>
