<template>
  <div class="mx-auto max-w-4xl">
    <h1 class="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">Upload History</h1>

    <div v-if="uploadStore.queue.length === 0" class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-16 text-gray-400 dark:text-gray-500">
      <span class="material-icons mb-2 text-4xl">cloud_done</span>
      <p class="text-sm">No upload activity yet</p>
    </div>

    <div v-else>
      <!-- Summary -->
      <div class="mb-4 flex items-center gap-4 text-sm">
        <span class="text-gray-600 dark:text-gray-400">{{ uploadStore.totalCount }} total</span>
        <span v-if="uploadStore.doneCount" class="text-green-600">{{ uploadStore.doneCount }} completed</span>
        <span v-if="uploadStore.errorCount" class="text-red-600">{{ uploadStore.errorCount }} failed</span>
        <div class="flex-1" />
        <button
          v-if="uploadStore.doneCount > 0"
          class="rounded-lg px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="uploadStore.clearCompleted()"
        >Clear completed</button>
      </div>

      <!-- Queue items -->
      <div class="space-y-2">
        <div
          v-for="item in uploadStore.queue"
          :key="item.id"
          class="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
        >
          <span class="material-icons text-lg" :class="statusIconClass(item.status)">
            {{ statusIcon(item.status) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{{ item.file.name }}</p>
            <div class="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <span>{{ item.originalSize }}</span>
              <template v-if="item.optimizedSize">
                <span class="text-green-600">→ {{ item.optimizedSize }}</span>
              </template>
              <span>• {{ item.bucket }}</span>
            </div>
          </div>
          <span class="text-xs" :class="statusTextClass(item.status)">{{ statusLabel(item.status) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUploadStore } from 'stores/upload-store'

const uploadStore = useUploadStore()

function statusIcon(status: string) {
  switch (status) {
    case 'done': return 'check_circle'
    case 'error': return 'error'
    case 'uploading': return 'cloud_upload'
    case 'optimizing': return 'tune'
    default: return 'schedule'
  }
}

function statusIconClass(status: string) {
  switch (status) {
    case 'done': return 'text-green-500'
    case 'error': return 'text-red-500'
    case 'uploading': return 'text-blue-500'
    case 'optimizing': return 'text-purple-500'
    default: return 'text-gray-400'
  }
}

function statusTextClass(status: string) {
  switch (status) {
    case 'done': return 'text-green-600'
    case 'error': return 'text-red-600'
    default: return 'text-gray-500'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'done': return 'Done'
    case 'error': return 'Failed'
    case 'uploading': return 'Uploading'
    case 'optimizing': return 'Optimizing'
    case 'ready': return 'Ready'
    default: return 'Queued'
  }
}
</script>
