<template>
  <header class="flex h-14 items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4">
    <!-- Menu toggle -->
    <button
      class="shrink-0 rounded-lg p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"
      @click="$emit('toggle-sidebar')"
    >
      <span class="material-icons text-xl">menu</span>
    </button>

    <!-- Search (placeholder for Sprint 2) -->
    <div class="min-w-0 flex-1">
      <div class="relative max-w-md">
        <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg">
          search
        </span>
        <input
          type="text"
          placeholder="Search files..."
          class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 py-1.5 pl-10 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled
        />
      </div>
    </div>

    <!-- Bucket picker (only on routes with :bucket param) -->
    <div v-if="mainStore.buckets.length > 1 && route.params.bucket" class="relative shrink-0">
      <select
        :value="selectedBucket"
        class="max-w-32 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:max-w-none sm:px-3"
        @change="changeBucket($event.target.value)"
      >
        <option v-for="b in mainStore.buckets" :key="b.name" :value="b.name">
          {{ b.name }}
        </option>
      </select>
    </div>

    <!-- Read-only badge -->
    <span
      v-if="mainStore.apiReadonly"
      class="shrink-0 rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400"
    >
      Read only
    </span>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMainStore } from 'stores/main-store'

defineEmits(['toggle-sidebar'])

const route = useRoute()
const router = useRouter()
const mainStore = useMainStore()

const selectedBucket = computed(() => route.params.bucket || mainStore.buckets[0]?.name)
const selectedApp = computed(() => {
  const name = route.name as string
  return name?.split('-')[0] || 'files'
})

function changeBucket(bucket: string) {
  router.push({ name: `${selectedApp.value}-home`, params: { bucket } })
}
</script>
