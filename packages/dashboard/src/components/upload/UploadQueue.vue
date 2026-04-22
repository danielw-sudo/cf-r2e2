<template>
  <div v-if="store.queue.length > 0" class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-2">
      <div class="flex items-center gap-3 text-sm">
        <span class="font-medium text-gray-800 dark:text-gray-200">
          {{ store.totalCount }} file{{ store.totalCount !== 1 ? 's' : '' }}
        </span>
        <span v-if="store.doneCount > 0" class="text-green-600">
          {{ store.doneCount }} done
        </span>
        <span v-if="store.errorCount > 0" class="text-red-600">
          {{ store.errorCount }} failed
        </span>
      </div>
      <div class="flex gap-1">
        <button
          v-if="store.doneCount > 0"
          class="rounded px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
          @click="store.clearCompleted()"
        >
          Clear done
        </button>
        <button
          v-if="store.totalCount > 0 && store.isIdle"
          class="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
          @click="store.clearAll()"
        >
          Clear all
        </button>
      </div>
    </div>

    <!-- Queue items -->
    <div class="max-h-80 space-y-1 overflow-y-auto p-2">
      <UploadQueueItem
        v-for="item in store.queue"
        :key="item.id"
        :item="item"
        @remove="store.removeItem"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUploadStore } from 'stores/upload-store'
import UploadQueueItem from './UploadQueueItem.vue'

const store = useUploadStore()
</script>
