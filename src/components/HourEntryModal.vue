<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { createHourEntry, listEntriesByDateRange } from '@/services/api'
import type { HourEntryDto } from '@/services/api'

const props = withDefaults(
  defineProps<{
    show: boolean
    /** Quando aberto pelo clique no dia; formato ISO YYYY-MM-DD */
    initialDate?: string | null
  }>(),
  { initialDate: null }
)

const emit = defineEmits<{
  close: []
  saved: []
}>()

const date = ref('')
const inputMode = ref<'range' | 'direct'>('range')
const timeFrom = ref('09:00')
const timeTo = ref('18:00')
const directHours = ref<number>(8)
const description = ref('')
const entriesForDay = ref<HourEntryDto[]>([])
const loadingEntries = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)

function formatHours(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/** Calcula horas entre dois horários no mesmo dia (ex.: 09:00–17:00 = 8). */
function hoursFromRange(from: string, to: string): number {
  const [fh, fm] = from.split(':').map(Number)
  const [th, tm] = to.split(':').map(Number)
  let minutes = (th * 60 + tm) - (fh * 60 + fm)
  if (minutes < 0) minutes += 24 * 60
  return Math.round((minutes / 60) * 100) / 100
}

const computedHours = computed(() => {
  if (inputMode.value === 'direct') return directHours.value
  return hoursFromRange(timeFrom.value, timeTo.value)
})

const canSubmitEntry = computed(() => {
  return !!date.value && computedHours.value > 0
})

async function loadEntriesForDay() {
  if (!date.value) {
    entriesForDay.value = []
    return
  }
  loadingEntries.value = true
  error.value = null
  try {
    entriesForDay.value = await listEntriesByDateRange(date.value, date.value)
  } catch (e) {
    entriesForDay.value = []
    error.value = e instanceof Error ? e.message : 'Erro ao carregar entradas'
  } finally {
    loadingEntries.value = false
  }
}

watch(
  () => props.show,
  (show) => {
    if (show) {
      date.value = props.initialDate || todayIso()
      timeFrom.value = '09:00'
      timeTo.value = '18:00'
      directHours.value = 8
      description.value = ''
      error.value = null
      loadEntriesForDay()
    }
  }
)
watch(date, (d) => {
  if (props.show && d) loadEntriesForDay()
})

function todayIso(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

async function submit() {
  if (!date.value || computedHours.value <= 0) return
  submitting.value = true
  error.value = null
  try {
    await createHourEntry({
      entryDate: date.value,
      hours: computedHours.value,
      description: description.value.trim() || undefined
    })
    emit('saved')
    emit('close')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao salvar'
  } finally {
    submitting.value = false
  }
}

function close() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="hm-entry-modal modal-backdrop" @click.self="close">
      <div class="modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
        <h2 id="modal-title" class="modal-title">Registrar horas</h2>

        <div class="modal-field">
          <label for="entry-date">Data</label>
          <input
            id="entry-date"
            v-model="date"
            type="date"
            class="modal-input"
            required
          />
        </div>

        <div class="modal-field">
          <label>Como informar as horas</label>
          <div class="modal-radio-group">
            <label class="modal-radio">
              <input v-model="inputMode" type="radio" value="range" />
              <span>De uma hora até outra</span>
            </label>
            <label class="modal-radio">
              <input v-model="inputMode" type="radio" value="direct" />
              <span>Quantidade de horas</span>
            </label>
          </div>
        </div>

        <template v-if="inputMode === 'range'">
          <div class="modal-row">
            <div class="modal-field">
              <label for="time-from">Das</label>
              <input
                id="time-from"
                v-model="timeFrom"
                type="time"
                class="modal-input"
              />
            </div>
            <div class="modal-field">
              <label for="time-to">Até</label>
              <input
                id="time-to"
                v-model="timeTo"
                type="time"
                class="modal-input"
              />
            </div>
          </div>
          <p class="modal-hint">Total: {{ formatHours(computedHours) }} h</p>
        </template>
        <div v-else class="modal-field">
          <label for="direct-hours">Horas</label>
          <input
            id="direct-hours"
            v-model.number="directHours"
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            class="modal-input"
          />
        </div>

        <div class="modal-field">
          <label for="description">Descrição</label>
          <textarea
            id="description"
            v-model="description"
            class="modal-textarea"
            rows="4"
            placeholder="O que foi feito neste período (opcional)"
          />
        </div>

        <section v-if="date" class="modal-section">
          <h3 class="modal-section-title">Entradas já registradas neste dia</h3>
          <div v-if="loadingEntries" class="modal-list-loading">Carregando…</div>
          <ul v-else-if="entriesForDay.length" class="modal-list">
            <li
              v-for="entry in entriesForDay"
              :key="entry.id"
              class="modal-list-item"
            >
              <span class="modal-list-hours">{{ formatHours(entry.hours) }} h</span>
              <span v-if="entry.description" class="modal-list-desc">{{ entry.description }}</span>
            </li>
          </ul>
          <p v-else class="modal-list-empty">Nenhuma entrada neste dia.</p>
        </section>

        <p v-if="error" class="modal-error">{{ error }}</p>

        <div class="modal-actions">
          <button type="button" class="modal-btn modal-btn--secondary" @click="close">
            Cancelar
          </button>
          <button
            type="button"
            class="modal-btn modal-btn--primary"
            :disabled="!canSubmitEntry || submitting"
            @click="submit"
          >
            {{ submitting ? 'Salvando…' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Scoped fallback; modal may be teleported so we also have .hm-entry-modal block below */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal { background: #fff; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.2); max-width: 420px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 1.5rem; }
</style>

<!-- Estilos aplicados ao modal mesmo quando teleportado para body (sem scoped) -->
<style>
.hm-entry-modal.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  font-family: 'DM Sans', system-ui, sans-serif;
}

.hm-entry-modal .modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  max-width: 420px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  box-sizing: border-box;
}

.hm-entry-modal .modal-title {
  margin: 0 0 1.25rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1a1a;
}

.hm-entry-modal .modal-field {
  margin-bottom: 1rem;
}

.hm-entry-modal .modal-field > label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.35rem;
}

.hm-entry-modal .modal-input,
.hm-entry-modal .modal-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  box-sizing: border-box;
}

.hm-entry-modal .modal-textarea {
  resize: vertical;
  min-height: 88px;
}

.hm-entry-modal .modal-row {
  display: flex;
  gap: 1rem;
}

.hm-entry-modal .modal-row .modal-field {
  flex: 1;
}

.hm-entry-modal .modal-radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hm-entry-modal .modal-radio {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 400;
  font-size: 0.95rem;
  color: #1a1a1a;
}

.hm-entry-modal .modal-hint {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: #6b6b6b;
}

.hm-entry-modal .modal-section {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.hm-entry-modal .modal-section-title {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
}

.hm-entry-modal .modal-list-loading,
.hm-entry-modal .modal-list-empty {
  font-size: 0.875rem;
  color: #6b6b6b;
  margin: 0;
}

.hm-entry-modal .modal-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 140px;
  overflow-y: auto;
}

.hm-entry-modal .modal-list-item {
  padding: 0.4rem 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.9rem;
  display: flex;
  gap: 0.75rem;
  align-items: baseline;
}

.hm-entry-modal .modal-list-hours {
  font-weight: 600;
  color: #1a1a1a;
  min-width: 4rem;
}

.hm-entry-modal .modal-list-desc {
  color: #6b6b6b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hm-entry-modal .modal-error {
  margin: 0.75rem 0 0;
  font-size: 0.875rem;
  color: #c53030;
}

.hm-entry-modal .modal-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.hm-entry-modal .modal-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  font-family: inherit;
}

.hm-entry-modal .modal-btn--secondary {
  background: #f0f0f0;
  color: #1a1a1a;
}

.hm-entry-modal .modal-btn--primary {
  background: #d97706;
  color: #fff;
}

.hm-entry-modal .modal-btn--primary:hover:not(:disabled) {
  background: #b85f05;
}

.hm-entry-modal .modal-btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
