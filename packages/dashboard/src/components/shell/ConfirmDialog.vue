<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="$emit('cancel')">
    <div class="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl">
      <h3 class="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{{ title }}</h3>
      <p class="mb-4 text-xs text-gray-500 dark:text-gray-400">{{ message }}</p>
      <div class="flex justify-end gap-2">
        <button
          class="rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="$emit('cancel')"
        >Cancel</button>
        <button
          :class="destructive
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-blue-600 hover:bg-blue-700'"
          class="rounded-lg px-3 py-1.5 text-sm text-white"
          @click="$emit('confirm')"
        >{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
}>()
defineEmits<{ cancel: []; confirm: [] }>()
</script>
