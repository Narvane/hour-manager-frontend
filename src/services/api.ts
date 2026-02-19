import axios from 'axios'
import type { DashboardProjection } from '@/types/projection'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000
})

export async function fetchProjection(date?: string): Promise<DashboardProjection | null> {
  const params = date ? { date } : {}
  const res = await api.get<DashboardProjection>('/v1/dashboard/projection', { params })
  return res.status === 204 || res.data == null || res.data === '' ? null : res.data
}

export interface HourEntryDto {
  id: string
  entryDate: string
  hours: number
  description?: string | null
}

export async function createHourEntry(payload: {
  entryDate: string
  hours: number
  description?: string | null
}): Promise<HourEntryDto> {
  const { data } = await api.post<HourEntryDto>('/v1/entries', payload)
  return data
}

export async function listEntriesByDateRange(start: string, end: string): Promise<HourEntryDto[]> {
  const { data } = await api.get<HourEntryDto[]>('/v1/entries', { params: { start, end } })
  return data
}

/** Listagem paginada (page 0-based). */
export interface EntriesPageDto {
  content: HourEntryDto[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export async function listEntriesPaged(
  start: string,
  end: string,
  page: number,
  size: number = 20
): Promise<EntriesPageDto> {
  const { data } = await api.get<EntriesPageDto>('/v1/entries/paged', {
    params: { start, end, page, size }
  })
  return data
}

/** Remove uma entrada por id. Lança se não existir (404). */
export async function deleteEntry(id: string): Promise<void> {
  await api.delete(`/v1/entries/${id}`)
}

export interface SystemConfigDto {
  id?: string | null
  closureStartDay: number
  closureEndDay: number
  expectedWeeklyHours: number
  createdAt?: string | null
}

/** Define horas ajustadas do período atual (slider). Retorna a projeção atualizada. */
export async function putPeriodAdjustment(adjustedHours: number): Promise<DashboardProjection | null> {
  const res = await api.put<DashboardProjection>('/v1/dashboard/period-adjustment', {
    adjustedHours
  })
  return res.data ?? null
}

export async function getSystemConfig(): Promise<SystemConfigDto | null> {
  const res = await api.get<SystemConfigDto>('/v1/system-config')
  return res.status === 204 || res.data == null || res.data === '' ? null : res.data
}

export async function saveSystemConfig(payload: {
  closureStartDay: number
  closureEndDay: number
  expectedWeeklyHours: number
}): Promise<SystemConfigDto> {
  const { data } = await api.put<SystemConfigDto>('/v1/system-config', payload)
  return data
}
