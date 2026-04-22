<template>
  <div>
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400" />
    </div>

    <template v-else>
      <!-- Summary cards -->
      <div class="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400">Total Calls (7d)</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{{ summary.totalCalls }}</p>
        </div>
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
          <p class="mt-1 text-2xl font-bold" :class="successRate >= 90 ? 'text-green-600' : 'text-amber-600'">
            {{ successRate }}%
          </p>
        </div>
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400">Top Model</p>
          <p class="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ topModel }}</p>
        </div>
      </div>

      <!-- Daily breakdown -->
      <section class="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h2 class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Daily Activity</h2>
        <div v-if="summary.byDay.length === 0" class="text-sm text-gray-400">No activity yet</div>
        <div v-else class="space-y-2">
          <div v-for="day in summary.byDay" :key="day.date" class="flex items-center gap-3">
            <span class="w-20 text-xs text-gray-500 dark:text-gray-400 shrink-0">{{ day.date.slice(5) }}</span>
            <div class="flex-1 rounded-full bg-gray-100 dark:bg-gray-700 h-5 overflow-hidden">
              <div class="h-full rounded-full bg-blue-500" :style="{ width: barWidth(day.count) }" />
            </div>
            <span class="w-8 text-right text-xs text-gray-500 dark:text-gray-400">{{ day.count }}</span>
          </div>
        </div>
      </section>

      <!-- Breakdown by action + model -->
      <div class="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h2 class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">By Action</h2>
          <div v-for="(count, action) in summary.byAction" :key="action" class="flex justify-between py-1 text-sm">
            <span class="text-gray-600 dark:text-gray-300 capitalize">{{ action }}</span>
            <span class="text-gray-900 dark:text-gray-100 font-medium">{{ count }}</span>
          </div>
        </section>
        <section class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h2 class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">By Model</h2>
          <div v-for="(count, model) in summary.byModel" :key="model" class="flex justify-between py-1 text-sm">
            <span class="text-gray-600 dark:text-gray-300 truncate mr-2">{{ shortModel(model as string) }}</span>
            <span class="text-gray-900 dark:text-gray-100 font-medium shrink-0">{{ count }}</span>
          </div>
        </section>
      </div>

      <!-- Recent activity -->
      <section class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h2 class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Recent Activity</h2>
        <div v-if="recent.length === 0" class="text-sm text-gray-400">No entries yet</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400">
                <th class="pb-2 pr-3">Time</th>
                <th class="pb-2 pr-3">Action</th>
                <th class="pb-2 pr-3">Key</th>
                <th class="pb-2 pr-3">Model</th>
                <th class="pb-2 pr-3 text-right">Latency</th>
                <th class="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in recent" :key="e.id" class="border-b border-gray-100 dark:border-gray-700/50">
                <td class="py-1.5 pr-3 text-xs text-gray-400">{{ formatTime(e.created_at) }}</td>
                <td class="py-1.5 pr-3 capitalize">{{ e.action }}</td>
                <td class="py-1.5 pr-3 truncate max-w-48 text-gray-600 dark:text-gray-300">{{ fileName(e.key) }}</td>
                <td class="py-1.5 pr-3 text-xs text-gray-400 truncate max-w-32">{{ shortModel(e.model) }}</td>
                <td class="py-1.5 pr-3 text-right text-xs text-gray-400">{{ e.latency_ms ? `${e.latency_ms}ms` : '—' }}</td>
                <td class="py-1.5">
                  <span :class="e.success ? 'text-green-500' : 'text-red-500'" class="text-xs font-medium">
                    {{ e.success ? 'OK' : 'FAIL' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from 'src/lib/api'

interface Summary {
  totalCalls: number; successCount: number; failCount: number
  byModel: Record<string, number>; byAction: Record<string, number>
  byDay: { date: string; count: number }[]
}

const loading = ref(true)
const summary = ref<Summary>({ totalCalls: 0, successCount: 0, failCount: 0, byModel: {}, byAction: {}, byDay: [] })
const recent = ref<any[]>([])

const successRate = computed(() => {
  if (!summary.value.totalCalls) return 100
  return Math.round((summary.value.successCount / summary.value.totalCalls) * 100)
})

const topModel = computed(() => {
  const entries = Object.entries(summary.value.byModel)
  if (!entries.length) return 'None'
  entries.sort((a, b) => b[1] - a[1])
  return shortModel(entries[0][0])
})

const maxDaily = computed(() => Math.max(...summary.value.byDay.map((d) => d.count), 1))

function barWidth(count: number) { return `${Math.max((count / maxDaily.value) * 100, 2)}%` }
function shortModel(m: string) { return m.split('/').pop() || m }
function fileName(key: string) { return key.split('/').pop() || key }
function formatTime(t: string) { return t?.replace('T', ' ').slice(5, 16) || '—' }

onMounted(async () => {
  try {
    const [summaryRes, recentRes] = await Promise.all([
      api.get('/ai/usage', { params: { days: 7 } }),
      api.get('/ai/usage/recent', { params: { limit: 20 } }),
    ])
    summary.value = summaryRes.data as Summary
    recent.value = (recentRes.data as any).entries || []
  } catch {
    // Silently fail — page shows empty state
  } finally {
    loading.value = false
  }
})
</script>
