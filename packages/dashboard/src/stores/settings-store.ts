import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'system'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    theme: (localStorage.getItem('r2_theme') || 'light') as ThemeMode,
    sidebarCollapsed: localStorage.getItem('r2_sidebar') === 'collapsed',
  }),

  actions: {
    setTheme(mode: ThemeMode) {
      this.theme = mode
      localStorage.setItem('r2_theme', mode)
      applyTheme(mode)
    },

    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
      localStorage.setItem('r2_sidebar', this.sidebarCollapsed ? 'collapsed' : 'expanded')
    },

    init() {
      applyTheme(this.theme)

      // Live-update when OS dark mode changes (only affects 'system' mode)
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.theme === 'system') applyTheme('system')
      })
    },
  },
})

function applyTheme(mode: ThemeMode) {
  const html = document.documentElement
  if (mode === 'dark') {
    html.classList.add('dark')
  } else if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.classList.toggle('dark', prefersDark)
  } else {
    html.classList.remove('dark')
  }
}
