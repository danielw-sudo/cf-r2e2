import { defineStore } from 'pinia'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  timeout: number
  spinner?: boolean
  caption?: string
  update?: (patch: Partial<Toast>) => void
}

let nextId = 0
const timers = new Map<number, ReturnType<typeof setTimeout>>()

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: [] as Toast[],
  }),

  actions: {
    show(opts: Partial<Toast> & { message: string }): (patch: Partial<Toast>) => void {
      const id = ++nextId
      const toast: Toast = {
        id,
        message: opts.message,
        type: opts.type ?? 'info',
        timeout: opts.timeout ?? 3000,
        spinner: opts.spinner ?? false,
        caption: opts.caption,
      }

      this.toasts.push(toast)

      const scheduleRemoval = (ms: number) => {
        const prev = timers.get(id)
        if (prev) clearTimeout(prev)
        timers.set(id, setTimeout(() => this.remove(id), ms))
      }

      const updater = (patch: Partial<Toast>) => {
        const idx = this.toasts.findIndex((t) => t.id === id)
        if (idx !== -1) {
          Object.assign(this.toasts[idx], patch)
          if (patch.timeout && patch.timeout > 0) scheduleRemoval(patch.timeout)
        }
      }

      if (toast.timeout > 0) scheduleRemoval(toast.timeout)

      return updater
    },

    remove(id: number) {
      const prev = timers.get(id)
      if (prev) { clearTimeout(prev); timers.delete(id) }
      this.toasts = this.toasts.filter((t) => t.id !== id)
    },
  },
})
