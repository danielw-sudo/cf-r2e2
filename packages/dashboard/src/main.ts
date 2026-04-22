import './css/app.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import mitt from 'mitt'

import App from './App.vue'
import { createAppRouter } from './router'
import { useSettingsStore } from './stores/settings-store'
import { useAuthStore } from './stores/auth-store'
import { useMainStore } from './stores/main-store'

async function bootstrap() {
  const app = createApp(App)

  // Pinia
  const pinia = createPinia()
  app.use(pinia)

  // Settings (theme init)
  const settingsStore = useSettingsStore(pinia)
  settingsStore.init()

  // Router
  const router = createAppRouter()
  app.use(router)

  // Event bus (mitt)
  const bus = mitt()
  app.config.globalProperties.$bus = bus
  app.provide('bus', bus)

  // Auth check
  const authStore = useAuthStore(pinia)
  const authResp = await authStore.CheckLoginInStorage(router, null)
  if (authResp === false) {
    const mainStore = useMainStore(pinia)
    await mainStore.loadServerConfigs(router, null, true)
  }

  app.mount('#app')
}

bootstrap()
