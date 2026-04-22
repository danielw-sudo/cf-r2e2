import type { Router } from 'vue-router'
import { api } from 'src/lib/api'
import { defineStore } from 'pinia'
import { useToastStore } from 'stores/toast-store'

interface BucketInfo {
  name: string
  [key: string]: unknown
}

interface ServerConfig {
  readonly: boolean
  showHiddenFiles: boolean
  [key: string]: unknown
}

export const useMainStore = defineStore('main', {
  state: () => ({
    apiReadonly: true,
    auth: {} as Record<string, unknown>,
    config: {} as ServerConfig,
    version: '',
    showHiddenFiles: false,
    buckets: [] as BucketInfo[],
  }),
  getters: {
    serverUrl(): string {
      if (import.meta.env.DEV) {
        return (import.meta.env.VITE_SERVER_URL as string) || 'http://localhost:8787'
      }
      return window.location.origin
    },
  },
  actions: {
    async loadServerConfigs(router: Router, _unused?: unknown, handleError = false): Promise<boolean> {
      try {
        const response = await api.get('/server/config', {
          validateStatus: (status: number) => status >= 200 && status < 300,
        })

        const data = response.data as {
          config: ServerConfig
          auth: Record<string, unknown>
          version: string
          buckets: BucketInfo[]
        }

        this.apiReadonly = data.config.readonly
        this.config = data.config
        this.auth = data.auth
        this.version = data.version
        this.showHiddenFiles = data.config.showHiddenFiles
        this.buckets = data.buckets

        const url = new URL(window.location.href)
        if (url.searchParams.get('next')) {
          await router.replace(url.searchParams.get('next')!)
        } else if (url.pathname === '/' || url.pathname === '/auth/login') {
          await router.push({ name: 'files-home', params: { bucket: this.buckets[0].name } })
        }

        return true
      } catch (error: unknown) {
        console.error('[main] Config load failed:', error)
        const err = error as { response?: { status: number; headers: Record<string, string>; data: string } }

        if (err.response?.status === 302) {
          const nextUrl = err.response.headers.Location
          if (nextUrl) window.location.replace(nextUrl)
        }

        if (handleError) {
          const respText = err.response?.data
          if (respText === 'Authentication error: Basic Auth required') {
            await router.push({ name: 'login', query: { next: router.currentRoute.value.fullPath } })
            return false
          }

          const toast = useToastStore()
          toast.show({ type: 'error', message: respText || 'Unknown error', timeout: 10000 })
        } else {
          throw error
        }
      }

      return false
    },
  },
})
