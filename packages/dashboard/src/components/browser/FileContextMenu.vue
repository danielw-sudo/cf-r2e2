<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-40"
    @click="close"
    @contextmenu.prevent="close"
  />
  <div
    v-if="visible"
    ref="menuEl"
    class="fixed z-50 min-w-[160px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg dark:shadow-gray-900/50"
    :style="{ top: `${y}px`, left: `${x}px` }"
  >
    <button class="menu-item" @click="emit('action', 'open')">
      <span class="material-icons text-base">open_in_new</span> Open
    </button>
    <button v-if="file?.type === 'file'" class="menu-item" @click="emit('action', 'download')">
      <span class="material-icons text-base">download</span> Download
    </button>
    <button v-if="file?.type === 'file'" class="menu-item" @click="emit('action', 'rename')">
      <span class="material-icons text-base">edit</span> Rename
    </button>
    <button v-if="file?.type === 'file'" class="menu-item" @click="emit('action', 'metadata')">
      <span class="material-icons text-base">info</span> Metadata
    </button>
    <hr class="my-1 border-gray-100 dark:border-gray-700" />
    <button v-if="file?.type === 'file'" class="menu-item" @click="emit('action', 'presignUrl')">
      <span class="material-icons text-base">link</span> Presigned URL
    </button>
    <button v-if="file?.type === 'file'" class="menu-item" @click="emit('action', 'publicUrl')">
      <span class="material-icons text-base">public</span> Public URL
    </button>
    <hr class="my-1 border-gray-100 dark:border-gray-700" />
    <button class="menu-item text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" @click="emit('action', 'delete')">
      <span class="material-icons text-base">delete</span> Delete
    </button>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const visible = ref(false)
const x = ref(0)
const y = ref(0)
const file = ref(null)
const menuEl = ref(null)

const emit = defineEmits(['action'])

async function open(event, f) {
  file.value = f
  x.value = event.clientX
  y.value = event.clientY
  visible.value = true

  await nextTick()
  if (menuEl.value) {
    const rect = menuEl.value.getBoundingClientRect()
    if (rect.right > window.innerWidth) x.value -= rect.width
    if (rect.bottom > window.innerHeight) y.value -= rect.height
  }
}

function close() {
  visible.value = false
  file.value = null
}

defineExpose({ open, close, file })
</script>

<style scoped>
@reference "tailwindcss";

.menu-item {
  @apply flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700;
}
</style>
