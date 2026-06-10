import { createApp } from 'vue'
import './assets/main.css'
import router from './router'
import App from './App.vue'

const app = createApp(App)

app.config.errorHandler = (err, vm, info) => {
  console.error('[Vue Error]', err.message, info)
}

app.config.warnHandler = (msg, vm, trace) => {
  console.warn('[Vue Warn]', msg)
}

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Uncaught Promise]', e.reason?.message || e.reason)
})

app.use(router).mount('#app')
