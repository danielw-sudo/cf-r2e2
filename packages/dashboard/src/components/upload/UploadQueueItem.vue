<template>
  <div class="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
    <!-- Icon -->
    <span
      class="material-icons text-lg"
      :class="iconClass"
    >{{ icon }}</span>

    <!-- File info -->
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm text-gray-800 dark:text-gray-200">{{ item.file.name }}</p>
      <div class="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span>{{ item.originalSize }}</span>
        <template v-if="item.optimizedSize">
          <span class="material-icons text-xs text-green-500">arrow_forward</span>
          <span class="text-green-600">{{ item.optimizedSize }}</span>
        </template>
      </div>
    </div>

    <!-- Progress bar or status -->
    <div class="w-24 shrink-0">
      <div v-if="item.status === 'uploading' || item.status === 'optimizing'" class="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          class="h-1.5 rounded-full bg-blue-500 transition-all"
          :style="{ width: `${item.progress}%` }"
        />
      </div>
      <span v-else class="text-xs" :class="statusClass">{{ statusLabel }}</span>
    </div>

    <!-- Actions -->
    <button
      v-if="canRemove"
      class="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600"
      @click="$emit('remove', item.id)"
    >
      <span class="material-icons text-base">close</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { QueueItem } from 'stores/upload-store'

const props = defineProps<{ item: QueueItem }>()
defineEmits<{ (e: 'remove', id: string): void }>()

const icon = computed(() => {
  switch (props.item.status) {
    case 'done': return 'check_circle'
    case 'error': return 'error'
    case 'optimizing': return 'tune'
    case 'uploading': return 'cloud_upload'
    default: return 'insert_drive_file'
  }
})

const iconClass = computed(() => {
  switch (props.item.status) {
    case 'done': return 'text-green-500'
    case 'error': return 'text-red-500'
    case 'optimizing': return 'text-purple-500'
    case 'uploading': return 'text-blue-500'
    default: return 'text-gray-400'
  }
})

const statusLabel = computed(() => {
  switch (props.item.status) {
    case 'pending': return 'Queued'
    case 'ready': return 'Ready'
    case 'done': return 'Done'
    case 'error': return props.item.error || 'Failed'
    default: return ''
  }
})

const statusClass = computed(() => {
  switch (props.item.status) {
    case 'done': return 'text-green-600'
    case 'error': return 'text-red-600'
    default: return 'text-gray-500'
  }
})

const canRemove = computed(() =>
  ['pending', 'ready', 'done', 'error'].includes(props.item.status),
)
</script>
