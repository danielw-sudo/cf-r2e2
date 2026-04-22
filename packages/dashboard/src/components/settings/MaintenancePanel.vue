<template>
  <div class="space-y-6">
    <!-- Backfill D1 Index -->
    <section class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <h2 class="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">Backfill D1 Index</h2>
      <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">Index existing images into D1 for search and tagging.</p>
      <button
        class="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        :disabled="backfilling"
        @click="runBackfill"
      >{{ backfillLabel }}</button>
    </section>

    <!-- Orphan Scanner -->
    <section class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <h2 class="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">Orphan Cleanup</h2>
      <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Find stale sidecars, dangling media index rows, and unused tags.
      </p>

      <div class="flex items-center gap-2">
        <select
          v-model="scanBucket"
          class="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
        >
          <option value="">All buckets</option>
          <option v-for="b in mainStore.buckets" :key="b.name" :value="b.name">{{ b.name }}</option>
        </select>
        <button
          class="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          :disabled="scanning"
          @click="scan"
        >{{ scanning ? 'Scanning…' : 'Scan' }}</button>
      </div>

      <!-- Results -->
      <div v-if="orphans.length" class="mt-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ orphans.length }} orphan(s) found</span>
          <div class="flex gap-2">
            <button class="text-xs text-blue-500 hover:text-blue-400" @click="selectAll">Select all</button>
            <button class="text-xs text-gray-400 hover:text-gray-300" @click="selected.clear()">Clear</button>
          </div>
        </div>

        <OrphanGroup v-if="sidecars.length" label="Orphaned Sidecars" icon="description" :items="sidecars" :selected="selected" @toggle="toggle" />
        <OrphanGroup v-if="mediaRows.length" label="Stale Media Rows" icon="broken_image" :items="mediaRows" :selected="selected" @toggle="toggle" />
        <OrphanGroup v-if="staleTags.length" label="Unused Tags" icon="sell" :items="staleTags" :selected="selected" @toggle="toggle" />

        <button
          v-if="selected.size"
          class="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          :disabled="cleaning"
          @click="clean"
        >{{ cleaning ? 'Cleaning…' : `Delete ${selected.size} selected` }}</button>
      </div>

      <p v-else-if="scanned && !orphans.length" class="mt-3 text-xs text-green-500">All clean — no orphans found.</p>
    </section>

    <!-- Last auto-maintenance report -->
    <section v-if="lastReport" class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <h2 class="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">Last Auto-Maintenance</h2>
      <p class="text-xs text-gray-500 dark:text-gray-400">{{ lastReport.ranAt }}</p>
      <div class="mt-2 flex flex-wrap gap-3 text-xs">
        <span class="text-gray-600 dark:text-gray-300">Backfill: {{ lastReport.backfill }} indexed</span>
        <span class="text-gray-600 dark:text-gray-300">Orphans: {{ lastReport.orphans }} found</span>
        <span v-if="lastReport.orphans > 0" class="text-amber-500">Action needed — review orphans above</span>
      </div>
    </section>

    <!-- Delete confirm -->
    <ConfirmDialog
      v-if="confirmClean"
      :title="`Delete ${selected.size} orphan(s)?`"
      message="This cannot be undone."
      confirm-label="Delete"
      :destructive="true"
      @cancel="confirmClean = false"
      @confirm="confirmClean = false; doClean()"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from 'src/lib/api'
import { useMainStore } from 'stores/main-store'
import { useToastStore } from 'stores/toast-store'
import OrphanGroup from 'components/settings/OrphanGroup.vue'
import ConfirmDialog from 'components/shell/ConfirmDialog.vue'

interface OrphanItem { type: string; bucket?: string; key?: string; id?: number; name?: string }
interface MaintenanceReport { ranAt: string; backfill: number; orphans: number }

const mainStore = useMainStore()
const toast = useToastStore()
const orphans = ref<OrphanItem[]>([])
const selected = ref(new Set<number>())
const scanning = ref(false)
const cleaning = ref(false)
const scanned = ref(false)
const backfilling = ref(false)
const backfillLabel = ref('Backfill D1 Index')
const confirmClean = ref(false)
const scanBucket = ref('')
const lastReport = ref<MaintenanceReport | null>(null)

function indexed(type: string) {
  return orphans.value.map((o, i) => ({ ...o, _idx: i })).filter((o) => o.type === type)
}
const sidecars = computed(() => indexed('sidecar'))
const mediaRows = computed(() => indexed('media'))
const staleTags = computed(() => indexed('stale_tag'))

function selectAll() { orphans.value.forEach((_, i) => selected.value.add(i)) }
function toggle(idx: number) {
  if (selected.value.has(idx)) selected.value.delete(idx)
  else selected.value.add(idx)
}

async function scan() {
  scanning.value = true
  scanned.value = false
  orphans.value = []
  selected.value.clear()
  try {
    const params = scanBucket.value ? { bucket: scanBucket.value } : {}
    const res = await api.get('/admin/orphans', { params })
    orphans.value = (res.data as { orphans: OrphanItem[] }).orphans
    scanned.value = true
  } catch { toast.show({ message: 'Scan failed', type: 'error' }) }
  finally { scanning.value = false }
}

function clean() { confirmClean.value = true }

async function doClean() {
  cleaning.value = true
  const items = [...selected.value].map((i) => orphans.value[i])
  try {
    const res = await api.post('/admin/orphans/clean', { items })
    const { deleted, errors } = res.data as { deleted: number; errors: number }
    toast.show({ message: `Deleted ${deleted}${errors ? `, ${errors} errors` : ''}`, type: errors ? 'warning' : 'success' })
    await scan()
  } catch { toast.show({ message: 'Cleanup failed', type: 'error' }) }
  finally { cleaning.value = false }
}

async function runBackfill() {
  backfilling.value = true
  backfillLabel.value = 'Running...'
  try {
    const res = await api.post('/admin/backfill')
    const { processed, errors, hasMore } = res.data as { processed: number; errors: number; hasMore: boolean }
    const suffix = hasMore ? ' (more remaining — run again)' : ''
    backfillLabel.value = `Done: ${processed} indexed, ${errors} errors${suffix}`
    toast.show({ message: `Backfill: ${processed} indexed${suffix}`, type: hasMore ? 'warning' : 'success' })
    setTimeout(() => { backfillLabel.value = 'Backfill D1 Index' }, 5000)
  } catch {
    backfillLabel.value = 'Backfill failed'
    toast.show({ message: 'Backfill failed', type: 'error' })
    setTimeout(() => { backfillLabel.value = 'Backfill D1 Index' }, 5000)
  } finally { backfilling.value = false }
}

async function loadReport() {
  try {
    const res = await api.get('/settings/d1/maintenance')
    const data = res.data as Record<string, string>
    if (data.value) lastReport.value = JSON.parse(data.value)
  } catch { /* no report yet */ }
}

onMounted(loadReport)
</script>
