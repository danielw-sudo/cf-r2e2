<template>
  <div v-if="tags.length" class="flex flex-wrap gap-1">
    <button
      v-for="tag in tags"
      :key="tag.slug || tag.name"
      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
      :class="activeTag === tag.name
        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'"
      @click.stop="$emit('click-tag', tag.name)"
    >
      {{ tag.name }}
      <span v-if="removable" class="ml-1 hover:text-red-500" @click.stop="$emit('remove', tag.name)">&times;</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Tag } from 'stores/tags-store'

defineProps<{
  tags: Tag[]
  activeTag?: string
  removable?: boolean
}>()

defineEmits<{
  (e: 'click-tag', name: string): void
  (e: 'remove', name: string): void
}>()
</script>
