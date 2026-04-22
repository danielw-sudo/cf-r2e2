<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="$emit('cancel')">
    <div class="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl">
      <h3 class="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Merge Tag</h3>
      <p class="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Merge <strong class="text-gray-700 dark:text-gray-300">{{ source.name }}</strong> into another tag. All files will be re-tagged.
      </p>

      <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Target tag</label>
      <select
        v-model="target"
        class="mb-4 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
               px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
      >
        <option value="" disabled>Select target…</option>
        <option v-for="tag in candidates" :key="tag.slug" :value="tag.slug">
          {{ tag.name }} ({{ tag.usage_count }})
        </option>
      </select>

      <div class="flex justify-end gap-2">
        <button
          class="rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="$emit('cancel')"
        >Cancel</button>
        <button
          :disabled="!target"
          class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
          @click="$emit('confirm', target)"
        >Merge</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Tag } from 'stores/tags-store'

const props = defineProps<{ source: Tag; tags: Tag[] }>()
defineEmits<{ cancel: []; confirm: [slug: string] }>()

const target = ref('')
const candidates = computed(() => props.tags.filter((t) => t.slug !== props.source.slug))
</script>
