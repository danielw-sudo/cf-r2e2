<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Mobile backdrop -->
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-30 bg-black/40 md:hidden"
      @click="mobileOpen = false"
    />

    <Sidebar
      :collapsed="sidebarCollapsed"
      :mobile-open="mobileOpen"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
      @close="mobileOpen = false"
    />

    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <ShellTopBar @toggle-sidebar="toggleSidebar" />

      <main class="flex-1 overflow-auto p-4">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Sidebar from 'components/shell/Sidebar.vue'
import ShellTopBar from 'components/shell/TopBar.vue'

const sidebarCollapsed = ref(false)
const mobileOpen = ref(false)

function toggleSidebar() {
  if (window.innerWidth < 768) {
    mobileOpen.value = !mobileOpen.value
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}
</script>
