import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LogView from '../views/LogView.vue'
import StatsView from '../views/StatsView.vue'
import SettingsView from '../views/SettingsView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/log', name: 'log', component: LogView },
  { path: '/stats', name: 'stats', component: StatsView },
  { path: '/settings', name: 'settings', component: SettingsView },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

const savedRoute = sessionStorage.getItem('redirect')
if (savedRoute) {
  sessionStorage.removeItem('redirect')
  const target = savedRoute.replace(import.meta.env.BASE_URL, '/')
  if (target !== '/') {
    router.isReady().then(() => router.replace(target))
  }
}

export default router
