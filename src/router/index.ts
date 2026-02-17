import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import HistoryView from '@/views/HistoryView.vue'
import SettingsView from '@/views/SettingsView.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'dashboard', component: DashboardView },
  { path: '/history', name: 'history', component: HistoryView },
  { path: '/settings', name: 'settings', component: SettingsView },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
