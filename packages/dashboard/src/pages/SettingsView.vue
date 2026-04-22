<template>
  <div class="mx-auto max-w-4xl">
    <h1 class="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>

    <!-- Tabs -->
    <div class="mb-6 flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        :class="activeTab === tab.id
          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
        @click="setTab(tab.id)"
      >{{ tab.label }}</button>
    </div>

    <!-- AI Tab (merged Vision + Tagger) -->
    <div v-if="activeTab === 'ai'" class="space-y-6">
      <section class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h2 class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Vision Analysis</h2>
        <AiSettingsPanel namespace="ai.vision" />
      </section>
      <section class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h2 class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Auto-Tagger</h2>
        <AiSettingsPanel namespace="ai.tagger" prompt-hint="Use {{TAGS}} placeholder for existing tag pool injection" />
      </section>
    </div>

    <!-- General Tab -->
    <div v-if="activeTab === 'general'" class="space-y-6">
      <section class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h2 class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Theme</h2>
        <div class="flex gap-3">
          <button
            v-for="mode in ['light', 'dark', 'system']"
            :key="mode"
            class="rounded-lg border px-4 py-2 text-sm capitalize transition-colors"
            :class="settingsStore.theme === mode
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'"
            @click="settingsStore.setTheme(mode)"
          >{{ mode }}</button>
        </div>
      </section>

      <section class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h2 class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Upload Defaults</h2>
        <ImageOptPanel
          :options="uploadStore.options"
          @update="(key, val) => uploadStore.updateOptions({ [key]: val })"
        />
      </section>
    </div>

    <!-- Usage Tab -->
    <UsagePanel v-if="activeTab === 'usage'" />

    <!-- Maintenance Tab -->
    <MaintenancePanel v-if="activeTab === 'maintenance'" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from 'stores/settings-store'
import { useUploadStore } from 'stores/upload-store'
import ImageOptPanel from 'components/upload/ImageOptPanel.vue'
import AiSettingsPanel from 'components/settings/AiSettingsPanel.vue'
import UsagePanel from 'components/settings/UsagePanel.vue'
import MaintenancePanel from 'components/settings/MaintenancePanel.vue'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
const uploadStore = useUploadStore()

const tabs = [
  { id: 'ai', label: 'AI' },
  { id: 'general', label: 'General' },
  { id: 'usage', label: 'Usage' },
  { id: 'maintenance', label: 'Maintenance' },
]

const validIds = new Set(tabs.map((t) => t.id))
const initial = validIds.has(route.query.tab as string) ? (route.query.tab as string) : 'ai'
const activeTab = ref(initial)

function setTab(id: string) {
  activeTab.value = id
  router.replace({ query: { ...route.query, tab: id } })
}

watch(() => route.query.tab, (t) => {
  if (typeof t === 'string' && validIds.has(t)) activeTab.value = t
})
</script>
