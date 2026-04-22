import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from 'src/lib/api'
import { encode } from 'src/lib/encoding'

export interface Tag {
  id: number
  name: string
  slug: string
  usage_count: number
}

export const useTagsStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])
  const loading = ref(false)

  async function fetchTags() {
    loading.value = true
    try {
      const res = await api.get('/tags')
      tags.value = res.data
    } catch (err) {
      console.error('[tags] Failed to load:', err)
    } finally {
      loading.value = false
    }
  }

  async function getTagsForFile(bucket: string, key: string): Promise<Tag[]> {
    try {
      const res = await api.get(`/buckets/${bucket}/${encode(key)}/tags`)
      return res.data
    } catch {
      return []
    }
  }

  async function attachTags(bucket: string, key: string, tagNames: string[]): Promise<Tag[]> {
    const res = await api.post(`/buckets/${bucket}/${encode(key)}/tags`, { tags: tagNames })
    return res.data.tags
  }

  async function detachTags(bucket: string, key: string, tagNames: string[]) {
    await api.delete(`/buckets/${bucket}/${encode(key)}/tags`, { tags: tagNames })
  }

  async function autoTag(bucket: string, key: string): Promise<string[]> {
    const res = await api.post(`/buckets/${bucket}/autotag/${encode(key)}`)
    return res.data.tags || []
  }

  async function renameTag(slug: string, newName: string): Promise<boolean> {
    try {
      await api.put(`/tags/${slug}`, { name: newName })
      await fetchTags()
      return true
    } catch { return false }
  }

  async function deleteTagBySlug(slug: string): Promise<boolean> {
    try {
      await api.delete(`/tags/${slug}`)
      await fetchTags()
      return true
    } catch { return false }
  }

  async function mergeTagSlugs(source: string, target: string): Promise<boolean> {
    try {
      await api.post('/tags/merge', { source, target })
      await fetchTags()
      return true
    } catch { return false }
  }

  return { tags, loading, fetchTags, getTagsForFile, attachTags, detachTags, autoTag, renameTag, deleteTagBySlug, mergeTagSlugs }
})
