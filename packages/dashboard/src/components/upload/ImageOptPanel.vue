<template>
  <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
    <h3 class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Image Optimization</h3>

    <!-- Compress toggle -->
    <label class="mb-3 flex items-center justify-between">
      <div>
        <span class="text-sm text-gray-700 dark:text-gray-300">Compress</span>
        <p class="text-xs text-gray-400 dark:text-gray-500">Reduce file size with lossy compression</p>
      </div>
      <input
        type="checkbox"
        :checked="options.compress"
        class="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600"
        @change="update('compress', ($event.target as HTMLInputElement).checked)"
      />
    </label>

    <!-- Quality slider (visible when compress is on) -->
    <div v-if="options.compress" class="mb-3 pl-1">
      <div class="mb-1 flex items-center justify-between">
        <span class="text-xs text-gray-500 dark:text-gray-400">Quality</span>
        <span class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ options.quality }}%</span>
      </div>
      <input
        type="range"
        min="10"
        max="100"
        step="5"
        :value="options.quality"
        class="w-full accent-blue-600"
        @input="update('quality', Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <!-- Resize toggle -->
    <label class="mb-3 flex items-center justify-between">
      <div>
        <span class="text-sm text-gray-700 dark:text-gray-300">Resize</span>
        <p class="text-xs text-gray-400 dark:text-gray-500">Scale down large images</p>
      </div>
      <input
        type="checkbox"
        :checked="options.resize"
        class="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600"
        @change="update('resize', ($event.target as HTMLInputElement).checked)"
      />
    </label>

    <!-- Max dimensions (visible when resize is on) -->
    <div v-if="options.resize" class="mb-3 flex gap-2 pl-1">
      <div class="flex-1">
        <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Max width</label>
        <input
          type="number"
          :value="options.maxWidth"
          min="100"
          max="7680"
          step="10"
          class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
          @change="update('maxWidth', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="flex-1">
        <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Max height</label>
        <input
          type="number"
          :value="options.maxHeight"
          min="100"
          max="4320"
          step="10"
          class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
          @change="update('maxHeight', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </div>

    <!-- Output format -->
    <div>
      <label class="mb-1 block text-sm text-gray-700 dark:text-gray-300">Output format</label>
      <select
        :value="options.format"
        class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
        @change="update('format', ($event.target as HTMLInputElement).value)"
      >
        <option value="webp">WebP (recommended)</option>
        <option value="jpeg">JPEG</option>
        <option value="png">PNG</option>
        <option value="original">Keep original</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OptimizeOptions } from 'src/lib/imageOptimizer'

defineProps<{ options: OptimizeOptions }>()

const emit = defineEmits<{
  (e: 'update', key: string, value: unknown): void
}>()

function update(key: string, value: unknown) {
  emit('update', key, value)
}
</script>
