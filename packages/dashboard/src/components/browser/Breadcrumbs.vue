<template>
  <nav class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
    <button
      v-for="(crumb, i) in crumbs"
      :key="crumb.path"
      class="flex items-center gap-1"
      @click="$emit('navigate', crumb)"
    >
      <span v-if="i > 0" class="text-gray-300 dark:text-gray-600">/</span>
      <span
        :class="[
          'rounded px-1.5 py-0.5 transition-colors',
          i === crumbs.length - 1
            ? 'font-medium text-gray-900 dark:text-gray-100'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer'
        ]"
      >
        {{ crumb.name }}
      </span>
    </button>
  </nav>
</template>

<script setup>
defineProps({
  crumbs: { type: Array, required: true },
})
defineEmits(['navigate'])
</script>
