<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { listEntriesPaged, deleteEntry } from '@/services/api'
import type { EntriesPageDto } from '@/services/api'

const dateStart = ref('')
const dateEnd = ref('')
const page = ref(0)
const size = 20
const result = ref<EntriesPageDto | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const deletingId = ref<string | null>(null)

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatHours(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function setDefaultRange() {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 2)
  dateEnd.value = end.toISOString().slice(0, 10)
  dateStart.value = start.toISOString().slice(0, 10)
}

const canFetch = computed(() => dateStart.value && dateEnd.value && dateStart.value <= dateEnd.value)

async function fetchPage() {
  if (!canFetch.value) return
  loading.value = true
  error.value = null
  try {
    result.value = await listEntriesPaged(dateStart.value, dateEnd.value, page.value, size)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar entradas'
    result.value = null
  } finally {
    loading.value = false
  }
}

watch([dateStart, dateEnd], () => {
  page.value = 0
  fetchPage()
}, { immediate: false })

watch(page, fetchPage, { immediate: false })

function applyFilter() {
  page.value = 0
  fetchPage()
}

function goToPage(p: number) {
  if (p >= 0 && result.value && p < result.value.totalPages) page.value = p
}

async function removeEntry(entryId: string) {
  if (deletingId.value) return
  deletingId.value = entryId
  error.value = null
  try {
    await deleteEntry(entryId)
    await fetchPage()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao remover entrada'
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  setDefaultRange()
  if (canFetch.value) fetchPage()
})
</script>

<template>
  <div class="history-page">
    <header class="history-header">
      <div class="history-header-text">
        <h1 class="history-title">Histórico de registro de horas</h1>
        <p class="history-subtitle">Filtre por período e navegue pelas entradas</p>
      </div>
      <router-link to="/" class="back-dashboard-btn">Voltar ao dashboard</router-link>
    </header>

    <section class="card filter-card">
      <h2 class="card-title">Filtro</h2>
      <div class="filter-row">
        <div class="filter-field">
          <label for="date-start">De</label>
          <input id="date-start" v-model="dateStart" type="date" class="filter-input" />
        </div>
        <div class="filter-field">
          <label for="date-end">Até</label>
          <input id="date-end" v-model="dateEnd" type="date" class="filter-input" />
        </div>
        <button
          type="button"
          class="filter-btn"
          :disabled="!canFetch || loading"
          @click="applyFilter"
        >
          {{ loading ? 'Carregando…' : 'Filtrar' }}
        </button>
      </div>
    </section>

    <p v-if="error" class="history-error">{{ error }}</p>

    <section v-else-if="result" class="history-content">
      <p v-if="result.totalElements === 0" class="history-empty">
        Nenhuma entrada no período selecionado.
      </p>
      <div v-else class="entries-grid">
        <article
          v-for="entry in result.content"
          :key="entry.id"
          class="entry-card"
        >
          <div class="entry-card-header">
            <time :datetime="entry.entryDate" class="entry-card-date">
              {{ formatDate(entry.entryDate) }}
            </time>
            <span class="entry-card-hours">{{ formatHours(entry.hours) }} h</span>
          </div>
          <p v-if="entry.description" class="entry-card-desc">{{ entry.description }}</p>
          <p v-else class="entry-card-desc entry-card-desc--muted">Sem descrição</p>
          <button
            type="button"
            class="entry-card-remove"
            :disabled="deletingId === entry.id"
            :aria-label="`Remover entrada de ${formatDate(entry.entryDate)}`"
            @click="removeEntry(entry.id)"
          >
            {{ deletingId === entry.id ? 'Removendo…' : 'Remover' }}
          </button>
        </article>
      </div>

      <nav v-if="result.totalPages > 1" class="pagination" aria-label="Páginas">
        <button
          type="button"
          class="pagination-btn"
          :disabled="page <= 0 || loading"
          aria-label="Página anterior"
          @click="goToPage(page - 1)"
        >
          ‹ Anterior
        </button>
        <span class="pagination-info">
          Página {{ page + 1 }} de {{ result.totalPages }} ({{ result.totalElements }} entradas)
        </span>
        <button
          type="button"
          class="pagination-btn"
          :disabled="page >= result.totalPages - 1 || loading"
          aria-label="Próxima página"
          @click="goToPage(page + 1)"
        >
          Próxima ›
        </button>
      </nav>
    </section>
  </div>
</template>

<style scoped>
.history-page {
  min-height: 100%;
  background: var(--bg-page, #f5f2ee);
  font-family: 'DM Sans', system-ui, sans-serif;
  padding: 1.5rem;
  box-sizing: border-box;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.history-header-text {
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

.history-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #1a1a1a);
}

.history-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.95rem;
  color: var(--text-muted, #6b6b6b);
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
  color: var(--text-muted, #6b6b6b);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-field label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted, #6b6b6b);
}

.filter-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  min-width: 140px;
}

.filter-btn {
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

.filter-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.history-error {
  color: var(--error, #c53030);
  margin: 0 0 1rem;
}

.history-empty {
  color: var(--text-muted, #6b6b6b);
  padding: 2rem;
  text-align: center;
}

.entries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.entry-card {
  background: var(--card-bg, #fff);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.15s;
}

.entry-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.entry-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.entry-card-date {
  font-size: 0.9rem;
  color: var(--text-muted, #6b6b6b);
}

.entry-card-hours {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent, #d97706);
}

.entry-card-desc {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-primary, #1a1a1a);
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.entry-card-desc--muted {
  color: var(--text-muted, #6b6b6b);
  font-style: italic;
}

.entry-card-remove {
  margin-top: 0.75rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--error, #c53030);
  background: transparent;
  border: 1px solid rgba(197, 48, 48, 0.4);
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.entry-card-remove:hover:not(:disabled) {
  background: rgba(197, 48, 48, 0.08);
}

.entry-card-remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem 0;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--accent, #d97706);
  background: transparent;
  border: 1px solid var(--accent-subtle, rgba(217, 119, 6, 0.3));
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--accent-subtle, rgba(217, 119, 6, 0.12));
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.875rem;
  color: var(--text-muted, #6b6b6b);
}
</style>
