<template>
  <!-- Loading -->
  <div v-if="!fileData && type" class="flex flex-col items-center gap-4 py-8">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-blue-500" />
    <div class="h-2 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        class="h-full rounded-full bg-blue-500 transition-all"
        :style="{ width: `${Math.round(progress * 100)}%` }"
      />
    </div>
  </div>

  <!-- Image -->
  <template v-else-if="type === 'image'">
    <img :src="fileData" class="mx-auto block max-w-full" />
  </template>

  <!-- Audio -->
  <template v-else-if="type === 'audio'">
    <div class="text-center">
      <audio controls>
        <source :src="fileData" />
      </audio>
    </div>
  </template>

  <!-- Video -->
  <template v-else-if="type === 'video'">
    <div class="text-center">
      <video controls class="mx-auto max-w-full">
        <source :src="fileData" />
      </video>
    </div>
  </template>

  <!-- Text -->
  <template v-else-if="type === 'text'">
    <pre class="whitespace-pre-wrap break-words">{{ fileData }}</pre>
  </template>

  <!-- JSON -->
  <template v-else-if="type === 'json'">
    <pre>{{ JSON.stringify(fileData, null, 2) }}</pre>
  </template>

  <!-- HTML -->
  <template v-else-if="type === 'html'">
    <pre>{{ fileData }}</pre>
  </template>

  <!-- Markdown -->
  <template v-else-if="type === 'markdown'">
    <div class="markdown" v-html="sanitize(parseMarkdown(fileData))"></div>
  </template>

  <!-- CSV -->
  <template v-else-if="type === 'csv'">
    <div class="markdown" v-html="sanitize(parseCsv(fileData))"></div>
  </template>

  <!-- Log.gz -->
  <template v-else-if="type === 'logs'">
    <log-gz :filedata="fileData" />
  </template>

  <!-- Unknown / fallback text -->
  <template v-else-if="fileData">
    <div class="rounded border border-orange-200 bg-orange-50 dark:bg-orange-900/30 p-3 text-sm text-orange-700 dark:text-orange-400">
      Unknown file type — showing as text
    </div>
    <pre class="mt-2 whitespace-pre-wrap break-all">{{ fileData }}</pre>
  </template>
</template>

<script setup>
import DOMPurify from 'dompurify'
import LogGz from './logGz.vue'
import { parseMarkdown } from 'src/parsers/markdown'

const sanitize = (html) => DOMPurify.sanitize(html)

defineProps({
  type: { type: String, default: undefined },
  fileData: { default: undefined },
  progress: { type: Number, default: 0 },
})

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function parseCsv(text) {
  let result = ''
  const rows = text.split('\n')
  if (rows.length === 0) return '<h2>Empty csv</h2>'

  for (const [index, row] of rows.entries()) {
    let line = ''
    const columns = row
      .split(/(\s*"[^"]+"\s*|\s*[^,]+|,)(?=,|$)/g)
      .filter((item) => item !== '' && item !== ',')

    for (const col of columns) {
      const safe = escapeHtml(col.replaceAll('"', ''))
      if (index === 0) {
        line += `<th>${safe}</th>`
      } else {
        line += `<td>${safe}</td>`
      }
    }

    result += `<tr>${line}</tr>`
  }

  return `<table class="table">${result}</table>`
}
</script>
