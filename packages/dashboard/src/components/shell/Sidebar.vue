<template>
  <aside
    :class="[
      'flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
      'transition-transform duration-200',
      // Mobile: fixed overlay, full width; hidden by default
      'fixed inset-y-0 left-0 z-40 w-56',
      mobileOpen ? 'translate-x-0' : '-translate-x-full',
      // Desktop: inline, width based on collapsed state, always visible
      'md:static md:z-auto md:inset-y-auto md:left-auto md:translate-x-0',
      collapsed ? 'md:w-16' : 'md:w-56',
    ]"
  >
    <!-- Logo -->
    <div class="flex h-14 items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-4">
      <img src="/icons/icon-96x96.png" alt="R2-E2" class="h-8 w-8 shrink-0 rounded" />
      <span v-if="!collapsed" class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
        R2-E2
      </span>
      <!-- Close button on mobile -->
      <button
        class="ml-auto rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
        @click="$emit('close')"
      >
        <span class="material-icons text-xl">close</span>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1 px-2 py-3">
      <SidebarLink
        v-for="item in navItems"
        :key="item.name"
        :icon="item.icon"
        :label="item.label"
        :active="item.active"
        :collapsed="collapsed"
        @click="item.action(); $emit('close')"
      />
    </nav>

    <!-- Bottom -->
    <div class="border-t border-gray-200 dark:border-gray-700 px-2 py-3">
      <SidebarLink
        icon="settings"
        label="Settings"
        :collapsed="collapsed"
        :active="isRoute('settings')"
        @click="$router.push('/settings'); $emit('close')"
      />
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMainStore } from 'stores/main-store'
import SidebarLink from 'components/shell/SidebarLink.vue'

defineProps({
  collapsed: { type: Boolean, default: false },
  mobileOpen: { type: Boolean, default: false },
})
defineEmits(['toggle', 'close'])

const route = useRoute()
const router = useRouter()
const mainStore = useMainStore()

const selectedBucket = computed(() => route.params.bucket || mainStore.buckets[0]?.name)

const isRoute = (name) => route.path.includes(`/${name}`)

const navItems = computed(() => [
  {
    name: 'search',
    icon: 'search',
    label: 'Search',
    active: isRoute('search'),
    action: () => router.push('/search'),
  },
  {
    name: 'upload',
    icon: 'cloud_upload',
    label: 'Upload',
    active: isRoute('upload'),
    action: () => router.push('/upload'),
  },
  {
    name: 'tags',
    icon: 'sell',
    label: 'Tags',
    active: isRoute('tags'),
    action: () => router.push('/tags'),
  },
  {
    name: 'gallery',
    icon: 'photo_library',
    label: 'Gallery',
    active: isRoute('gallery'),
    action: () => router.push('/gallery'),
  },
  {
    name: 'shared',
    icon: 'public',
    label: 'Shared',
    active: isRoute('shared'),
    action: () => router.push('/shared'),
  },
  {
    name: 'files',
    icon: 'folder',
    label: 'Files',
    active: isRoute('files'),
    action: () => router.push(`/${selectedBucket.value}/files`),
  },
])
</script>
