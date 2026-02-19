<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getSystemConfig, saveSystemConfig } from '@/services/api'

const router = useRouter()

const HOURS_IN_WEEK = 168

const closureStartDay = ref(1)
const closureEndDay = ref(31)
const weeklyHoursInput = ref<number>(40)
const percentInput = ref<string>('23.81')
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)

const percentFromHours = computed(() => {
  const h = weeklyHoursInput.value
  if (h <= 0 || !Number.isFinite(h)) return 0
  return Math.round((h / HOURS_IN_WEEK) * 10000) / 100
})

const hoursFromPercent = computed(() => {
  const p = parseFloat(percentInput.value)
  if (!Number.isFinite(p) || p < 0 || p > 100) return 0
  return Math.round((p / 100) * HOURS_IN_WEEK * 100) / 100
})

function syncPercentFromHours() {
  percentInput.value = percentFromHours.value.toFixed(2)
}

function syncHoursFromPercent() {
  const h = hoursFromPercent.value
  if (h > 0) weeklyHoursInput.value = Math.round(h * 100) / 100
}

function formatPercent(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatHours(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

async function loadConfig() {
  loading.value = true
  error.value = null
  try {
    const config = await getSystemConfig()
    if (config) {
      closureStartDay.value = config.closureStartDay
      closureEndDay.value = config.closureEndDay
      const h = config.expectedWeeklyHours
      if (h != null && Number.isFinite(h)) {
        weeklyHoursInput.value = h
        percentInput.value = (h / HOURS_IN_WEEK * 100).toFixed(2)
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar configuração'
  } finally {
    loading.value = false
  }
}

async function save() {
  const hours = weeklyHoursInput.value
  if (hours <= 0 || !Number.isFinite(hours)) {
    error.value = 'Informe uma expectativa de horas válida.'
    return
  }
  saving.value = true
  error.value = null
  try {
    await saveSystemConfig({
      closureStartDay: closureStartDay.value,
      closureEndDay: closureEndDay.value,
      expectedWeeklyHours: hours
    })
    percentInput.value = (hours / HOURS_IN_WEEK * 100).toFixed(2)
    router.push('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao salvar'
  } finally {
    saving.value = false
  }
}

onMounted(loadConfig)
</script>

<template>
  <div class="settings-page">
    <header class="settings-header">
      <div class="settings-header-text">
        <h1 class="settings-title">Configurações de trabalho</h1>
        <p class="settings-subtitle">Defina sua expectativa semanal de horas</p>
      </div>
      <router-link to="/" class="back-dashboard-btn">Voltar ao dashboard</router-link>
    </header>

    <div v-if="loading" class="settings-loading">Carregando…</div>
    <p v-else-if="error" class="settings-error">{{ error }}</p>

    <section v-else class="settings-card-wrapper">
    <section class="card settings-card">
      <h2 class="card-title">Expectativa semanal</h2>
      <p class="settings-hint">
        O sistema usa a <strong>porcentagem da semana</strong> (168h) que você quer trabalhar.
        O jeito mais natural é pensar em <strong>horas por semana em dias úteis</strong> — traduzimos isso para você.
      </p>

      <div class="settings-block">
        <label for="weekly-hours" class="settings-label">
          Quantas horas de trabalho semanal em dias úteis?
        </label>
        <input
          id="weekly-hours"
          v-model.number="weeklyHoursInput"
          type="number"
          step="0.5"
          min="0.5"
          max="120"
          class="settings-input"
          @input="syncPercentFromHours"
        />
        <p class="settings-equivalent">
          Isso equivale a <strong>{{ formatPercent(percentFromHours) }}%</strong> da semana (168h).
        </p>
      </div>

      <div class="settings-divider">ou</div>

      <div class="settings-block">
        <label for="percent-input" class="settings-label">
          Definir diretamente a porcentagem da semana
        </label>
        <input
          id="percent-input"
          v-model="percentInput"
          type="number"
          step="0.01"
          min="0"
          max="100"
          class="settings-input"
          @input="syncHoursFromPercent"
        />
        <p class="settings-equivalent">
          Equivalente a <strong>{{ formatHours(hoursFromPercent) }} h</strong> por semana.
        </p>
      </div>

      <div class="settings-meta">
        <div class="settings-meta-row">
          <label for="closure-start" class="settings-meta-label">Dia de fechamento (início):</label>
          <input
            id="closure-start"
            v-model.number="closureStartDay"
            type="number"
            min="1"
            max="31"
            class="settings-input settings-input--small"
          />
        </div>
        <div class="settings-meta-row">
          <label for="closure-end" class="settings-meta-label">Dia de fechamento (fim):</label>
          <input
            id="closure-end"
            v-model.number="closureEndDay"
            type="number"
            min="1"
            max="31"
            class="settings-input settings-input--small"
          />
        </div>
      </div>

      <div class="settings-actions">
        <button
          type="button"
          class="settings-btn"
          :disabled="saving || weeklyHoursInput <= 0"
          @click="save"
        >
          {{ saving ? 'Salvando…' : 'Salvar configuração' }}
        </button>
      </div>
    </section>
    </section>
  </div>
</template>

<style scoped>
.settings-page {
  min-height: 100%;
  background: var(--bg-page, #f5f2ee);
  font-family: 'DM Sans', system-ui, sans-serif;
  padding: 1.5rem;
  box-sizing: border-box;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.settings-header-text {
  min-width: 0;
}

.back-dashboard-btn {
  flex-shrink: 0;
  display: inline-block;
  padding: 0.85rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  background: var(--accent, #d97706);
  border-radius: 10px;
  text-decoration: none;
  font-family: inherit;
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.35);
  transition: background 0.15s, box-shadow 0.15s;
}

.back-dashboard-btn:hover {
  background: var(--accent-hover, #b85f05);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);
}

.settings-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #1a1a1a);
}

.settings-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.95rem;
  color: var(--text-muted, #6b6b6b);
}

.settings-loading {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted, #6b6b6b);
}

.settings-error {
  color: var(--error, #c53030);
  margin: 0 0 1rem;
}

.settings-card-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
}

.settings-card-wrapper .card {
  width: 100%;
  max-width: 480px;
}

.card {
  background: var(--card-bg, #fff);
  border-radius: 12px;
  padding: 1.5rem 1.75rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.card-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

.settings-hint {
  margin: 0 0 1.5rem;
  font-size: 0.9rem;
  color: var(--text-muted, #6b6b6b);
  line-height: 1.5;
}

.settings-block {
  margin-bottom: 1.25rem;
}

.settings-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
  margin-bottom: 0.5rem;
}

.settings-input {
  width: 100%;
  max-width: 160px;
  padding: 0.6rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  box-sizing: border-box;
}

.settings-input--small {
  max-width: 80px;
}

.settings-equivalent {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  color: var(--text-muted, #6b6b6b);
}

.settings-equivalent strong {
  color: var(--accent, #d97706);
}

.settings-divider {
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted, #6b6b6b);
  margin: 1rem 0;
}

.settings-meta {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #eee;
}

.settings-meta-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.settings-meta-row:last-child {
  margin-bottom: 0;
}

.settings-meta-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary, #1a1a1a);
}

.settings-actions {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.settings-btn {
  padding: 0.6rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: var(--accent, #d97706);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}

.settings-btn:hover:not(:disabled) {
  background: var(--accent-hover, #b85f05);
}

.settings-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
