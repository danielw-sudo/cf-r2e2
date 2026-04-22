import type { Router } from 'vue-router'
import { api } from 'src/lib/api'
import { defineStore } from 'pinia'
import { useMainStore } from 'stores/main-store'

const SESSION_KEY = 'r2_explorer_session_token'

interface LoginForm {
  username: string
  password: string
  remind: boolean
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as string | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
  },
  actions: {
    async LogIn(router: Router, form: LoginForm) {
      const mainStore = useMainStore()
      const token = btoa(`${form.username}:${form.password}`)

      api.defaults.headers.common['Authorization'] = `Basic ${token}`
      try {
        await mainStore.loadServerConfigs(router)
      } catch (e) {
        console.error('[auth] Login failed:', e)
        delete api.defaults.headers.common['Authorization']
        throw new Error('Invalid username or password')
      }

      this.user = form.username
      api.defaults.headers.common.Authorization = `Basic ${token}`

      if (form.remind) {
        localStorage.setItem(SESSION_KEY, token)
      } else {
        sessionStorage.setItem(SESSION_KEY, token)
      }
    },

    async CheckLoginInStorage(router: Router) {
      let token = sessionStorage.getItem(SESSION_KEY)
      if (!token) token = localStorage.getItem(SESSION_KEY)
      if (!token) return false

      const mainStore = useMainStore()
      api.defaults.headers.common['Authorization'] = `Basic ${token}`

      const authed = await mainStore.loadServerConfigs(router, undefined, true)
      if (!authed) {
        delete api.defaults.headers.common['Authorization']
        return false
      }

      this.user = 'session'
      return true
    },

    async LogOut(router: Router) {
      localStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(SESSION_KEY)
      this.user = null
      await router.replace({ name: 'login' })
    },
  },
})
