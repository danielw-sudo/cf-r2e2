<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    <div
      v-for="toast in store.toasts"
      :key="toast.id"
      class="flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg dark:shadow-gray-900/50"
      :class="bgClass(toast.type)"
    >
      <!-- Spinner -->
      <div v-if="toast.spinner" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <!-- Icon -->
      <span v-else class="material-icons text-base">
        {{ iconFor(toast.type) }}
      </span>

      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium">{{ toast.message }}</p>
        <p v-if="toast.caption" class="text-xs opacity-75">{{ toast.caption }}</p>
      </div>

      <button class="ml-2 opacity-60 hover:opacity-100" @click="store.remove(toast.id)">
        <span class="material-icons text-sm">close</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from 'stores/toast-store'

const store = useToastStore()

function bgClass(type: string) {
  switch (type) {
    case 'success': return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-400'
    case 'error': return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400'
    case 'warning': return 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
    default: return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
  }
}

function iconFor(type: string) {
  switch (type) {
    case 'success': return 'check_circle'
    case 'error': return 'error'
    case 'warning': return 'warning'
    default: return 'info'
  }
}
</script>
