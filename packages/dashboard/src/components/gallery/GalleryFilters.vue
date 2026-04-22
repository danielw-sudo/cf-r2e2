<template>
  <div class="flex flex-wrap items-center gap-3">
    <!-- Type filter -->
    <select
      :value="filters.type"
      class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
      @change="update('type', ($event.target as HTMLSelectElement).value)"
    >
      <option value="all">All types</option>
      <option value="image">Images</option>
      <option value="video">Videos</option>
      <option value="document">Documents</option>
    </select>

    <!-- Sort -->
    <select
      :value="filters.sort"
      class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
      @change="update('sort', ($event.target as HTMLSelectElement).value)"
    >
      <option value="newest">Newest first</option>
      <option value="oldest">Oldest first</option>
      <option value="largest">Largest first</option>
      <option value="smallest">Smallest first</option>
      <option value="name">Name A–Z</option>
    </select>

    <!-- Tag filter -->
    <TagFilter v-model="tagFilter" @update:modelValue="update('tag', $event)" />

    <!-- Count -->
    <span class="text-xs text-gray-400 dark:text-gray-500">{{ count }} file{{ count !== 1 ? 's' : '' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TagFilter from './TagFilter.vue'

export interface GalleryFilterState {
  type: string
  sort: string
  tag: string
}

defineProps<{
  filters: GalleryFilterState
  count: number
}>()

const emit = defineEmits<{
  (e: 'update', key: string, value: string): void
}>()

const tagFilter = ref('')

function update(key: string, value: string) {
  if (key === 'tag') tagFilter.value = value
  emit('update', key, value)
}
</script>
