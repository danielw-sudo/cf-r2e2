<template>
  <div class="rounded border border-gray-100 dark:border-gray-700/50">
    <div class="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/30 px-3 py-2">
      <span class="material-icons text-base text-gray-400">{{ icon }}</span>
      <span class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ label }}</span>
      <span class="text-xs text-gray-400">({{ items.length }})</span>
    </div>
    <div class="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
      <label
        v-for="item in items"
        :key="item._idx"
        class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700/30"
      >
        <input
          type="checkbox"
          :checked="selected.has(item._idx)"
          class="rounded border-gray-300 dark:border-gray-600"
          @change="$emit('toggle', item._idx)"
        />
        <span class="truncate text-gray-600 dark:text-gray-300">{{ displayName(item) }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
interface IndexedOrphan { type: string; bucket?: string; key?: string; id?: number; name?: string; _idx: number }

defineProps<{ label: string; icon: string; items: IndexedOrphan[]; selected: Set<number> }>()
defineEmits<{ toggle: [idx: number] }>()

function displayName(item: IndexedOrphan) {
  if (item.type === 'stale_tag') return item.name || `Tag #${item.id}`
  return `${item.bucket}/${item.key}`
}
</script>
