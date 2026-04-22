<template>
  <div
    v-if="count > 0"
    class="flex items-center gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 px-4 py-2 text-sm"
  >
    <span class="font-medium text-blue-700 dark:text-blue-400">{{ count }} selected</span>
    <button
      class="rounded px-2 py-1 text-blue-600 hover:bg-blue-100"
      @click="$emit('delete')"
    >
      Delete
    </button>
    <button
      class="ml-auto rounded px-2 py-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
      @click="$emit('clear')"
    >
      Clear
    </button>
  </div>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 0 },
})
defineEmits(['delete', 'clear'])
</script>
