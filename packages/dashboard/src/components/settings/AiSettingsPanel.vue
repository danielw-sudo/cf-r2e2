<template>
  <div v-if="loading" class="flex items-center gap-2 text-sm text-gray-400">
    <div class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
    Loading...
  </div>

  <div v-else class="space-y-4">
    <!-- Model -->
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Model</label>
      <select
        v-model="model"
        class="w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
      >
        <option v-for="m in models" :key="m.id" :value="m.id">
          {{ m.name }} ({{ m.tier }})
        </option>
      </select>
      <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ currentNote }}</p>
    </div>

    <!-- Prompt -->
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">System Prompt</label>
      <textarea
        v-model="prompt"
        rows="5"
        class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 font-mono"
      />
      <p v-if="promptHint" class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ promptHint }}</p>
    </div>

    <!-- Max Tokens -->
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
        Max Tokens: {{ maxTokens }}
      </label>
      <input
        v-model.number="maxTokens"
        type="range"
        min="64"
        max="2048"
        step="64"
        class="w-full accent-blue-600"
      />
      <div class="flex justify-between text-xs text-gray-400"><span>64</span><span>2048</span></div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <button
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        :disabled="saving"
        @click="save"
      >{{ saving ? 'Saving...' : 'Save' }}</button>
      <button
        class="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
        @click="reset"
      >Reset to defaults</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from 'src/lib/api'
import { useToastStore } from 'stores/toast-store'

interface ModelDef { id: string; name: string; tier: string; note: string }

const props = defineProps<{
  namespace: string
  promptHint?: string
}>()

const toast = useToastStore()
const loading = ref(true)
const saving = ref(false)
const model = ref('')
const prompt = ref('')
const maxTokens = ref(512)
const models = ref<ModelDef[]>([])

let defaults = { model: '', prompt: '', maxTokens: 512 }

const currentNote = computed(() => models.value.find((m) => m.id === model.value)?.note ?? '')

onMounted(async () => {
  try {
    const res = await api.get(`/settings/ai`, { params: { namespace: props.namespace } })
    const d = res.data as any
    models.value = d.models || []
    defaults = { model: d.defaultModel, prompt: d.defaultPrompt, maxTokens: d.defaultMaxTokens }
    model.value = models.value.find((m) => m.id === d.model) ? d.model : defaults.model
    prompt.value = d.prompt || defaults.prompt
    maxTokens.value = d.maxTokens || defaults.maxTokens
  } catch {
    toast.show({ message: 'Failed to load settings', type: 'error' })
  } finally {
    loading.value = false
  }
})

async function save() {
  saving.value = true
  try {
    await api.put('/settings/ai', {
      model: model.value, prompt: prompt.value, maxTokens: maxTokens.value, namespace: props.namespace,
    })
    toast.show({ message: 'Settings saved', type: 'success' })
  } catch {
    toast.show({ message: 'Failed to save', type: 'error' })
  } finally {
    saving.value = false
  }
}

function reset() {
  model.value = defaults.model
  prompt.value = defaults.prompt
  maxTokens.value = defaults.maxTokens
}
</script>
