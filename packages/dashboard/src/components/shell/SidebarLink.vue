<template>
  <button
    :class="[
      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
    ]"
    :title="collapsed ? label : undefined"
    @click="$emit('click')"
  >
    <span class="material-icons shrink-0 text-xl">{{ icon }}</span>
    <span v-if="!collapsed" class="truncate">{{ label }}</span>
  </button>
</template>

<script setup>
defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  active: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
})
defineEmits(['click'])
</script>
