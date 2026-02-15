import axios from 'axios'
import type { DashboardProjection } from '@/types/projection'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export async function fetchProjection(date?: string): Promise<DashboardProjection | null> {
  const params = date ? { date } : {}
  const { data } = await api.get<DashboardProjection>('/v1/dashboard/projection', { params })
  return data
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
