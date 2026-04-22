<template>
  <template v-if="visible">
    <div class="fixed inset-0 z-40 bg-black/50" @click="$emit('close')" />
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-5 shadow-2xl dark:shadow-gray-900/50">
        <!-- HTTP Metadata -->
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200">HTTP Metadata</h3>
          <button class="rounded bg-blue-100 dark:bg-blue-900/30 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50" @click="httpRows.push({ key: '', value: '' })">
            <span class="material-icons text-sm">add</span>
          </button>
        </div>
        <div v-for="(_, i) in httpRows" :key="'http-' + i" class="mb-2 flex gap-2">
          <input v-model="httpRows[i].key" placeholder="Key" class="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm" />
          <input v-model="httpRows[i].value" placeholder="Value" class="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm" />
          <button class="rounded p-1 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30" @click="httpRows.splice(i, 1)">
            <span class="material-icons text-sm">remove</span>
          </button>
        </div>

        <!-- Custom Metadata -->
        <div class="mb-4 mt-6 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Custom Metadata</h3>
          <div class="relative">
            <button class="rounded bg-blue-100 dark:bg-blue-900/30 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50" @click="showPresets = !showPresets">
              <span class="material-icons text-sm">add</span>
            </button>
            <div v-if="showPresets" class="absolute right-0 top-8 z-10 w-36 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1">
              <button
                v-for="p in availablePresets" :key="p"
                class="block w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 capitalize"
                @click="addPreset(p)"
              >{{ p }}</button>
              <button
                class="block w-full px-3 py-1.5 text-left text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
                @click="addCustomRow"
              >Custom...</button>
            </div>
          </div>
        </div>
        <div v-for="(row, i) in customRows" :key="'custom-' + i" class="mb-2 flex gap-2">
          <span v-if="PRESETS.includes(row.key)" class="flex-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 px-2 py-1 text-sm capitalize">{{ row.key }}</span>
          <input v-else v-model="customRows[i].key" placeholder="Key" class="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm" />
          <input v-model="customRows[i].value" placeholder="Value" class="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm" />
          <button class="rounded p-1 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30" @click="customRows.splice(i, 1)">
            <span class="material-icons text-sm">remove</span>
          </button>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" @click="$emit('close')">Cancel</button>
          <button class="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600 disabled:opacity-50" :disabled="saving" @click="save">
            {{ saving ? 'Updating...' : 'Update' }}
          </button>
        </div>
      </div>
    </div>
  </template>
</template>

<script setup>
import { ref, computed } from 'vue'

const PRESETS = ['creator', 'project', 'tags', 'license', 'notes']

const props = defineProps({
  visible: { type: Boolean, default: false },
  httpMetadata: { type: Object, default: () => ({}) },
  customMetadata: { type: Object, default: () => ({}) },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save'])

const httpRows = ref([])
const customRows = ref([])
const showPresets = ref(false)

const availablePresets = computed(() => {
  const used = new Set(customRows.value.map((r) => r.key))
  return PRESETS.filter((p) => !used.has(p))
})

function open(httpMeta, customMeta) {
  httpRows.value = httpMeta ? Object.entries(httpMeta).map(([key, value]) => ({ key, value })) : []
  customRows.value = customMeta ? Object.entries(customMeta).map(([key, value]) => ({ key, value })) : []
  showPresets.value = false
}

function addPreset(key) {
  customRows.value.push({ key, value: '' })
  showPresets.value = false
}

function addCustomRow() {
  customRows.value.push({ key: '', value: '' })
  showPresets.value = false
}

function save() {
  const custom = customRows.value.reduce((a, v) => (v.key ? { ...a, [v.key]: v.value } : a), {})
  const http = httpRows.value.reduce((a, v) => (v.key ? { ...a, [v.key]: v.value } : a), {})
  emit('save', { customMetadata: custom, httpMetadata: http })
}

defineExpose({ open })
</script>
