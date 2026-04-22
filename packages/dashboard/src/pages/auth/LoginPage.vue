<template>
  <div class="flex min-h-screen items-center justify-center dark:bg-gray-900">
    <div class="w-full max-w-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg dark:shadow-gray-900/50">
      <div class="mb-6 text-center">
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Sign in</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Enter your credentials to access the admin panel.</p>
      </div>

      <div v-if="showError" class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ showError }}
      </div>

      <form @submit.prevent="onSubmit" class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
          <input
            v-model="form.username"
            type="text"
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <input
            v-model="form.password"
            type="password"
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <label class="flex items-center gap-2">
          <input v-model="form.remind" type="checkbox" class="h-4 w-4 rounded border-gray-300 dark:border-gray-600" />
          <span class="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
        </label>
        <button
          type="submit"
          class="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          :disabled="loading"
        >
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from 'stores/auth-store'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'LoginPage',
  data() {
    return {
      loading: false,
      showError: '',
      form: { username: '', password: '', remind: true },
    }
  },
  methods: {
    async onSubmit() {
      this.loading = true
      try {
        await useAuthStore().LogIn(this.$router, this.form)
        this.showError = ''
      } catch (error) {
        this.showError = error.message
      } finally {
        this.loading = false
      }
    },
  },
})
</script>
