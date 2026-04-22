import { defineStore } from 'pinia'

export const useGalleryStore = defineStore('gallery', {
  state: () => ({
    viewMode: (localStorage.getItem('r2_view_mode') || 'table') as 'table' | 'grid',
    selectedItems: [] as string[],
  }),
  actions: {
    toggleViewMode() {
      this.viewMode = this.viewMode === 'table' ? 'grid' : 'table'
      localStorage.setItem('r2_view_mode', this.viewMode)
    },
    toggleSelection(key: string) {
      const idx = this.selectedItems.indexOf(key)
      if (idx === -1) {
        this.selectedItems.push(key)
      } else {
        this.selectedItems.splice(idx, 1)
      }
    },
    clearSelection() {
      this.selectedItems = []
    },
  },
})
