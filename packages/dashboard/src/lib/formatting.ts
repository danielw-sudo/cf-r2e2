export const timeSince = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  let interval: number
  let calc: number

  interval = seconds / 31536000
  if (interval > 1) return date.toLocaleDateString()

  interval = seconds / 2592000
  if (interval > 1) return date.toLocaleDateString()

  interval = seconds / 86400
  if (interval > 1) return date.toLocaleDateString()

  interval = seconds / 3600
  if (interval > 1) {
    calc = Math.floor(interval)
    return calc + (calc === 1 ? ' hour' : ' hours')
  }

  interval = seconds / 60
  if (interval > 1) {
    calc = Math.floor(interval)
    return calc + (calc === 1 ? ' minute' : ' minutes')
  }

  calc = Math.floor(seconds)
  return calc + (calc === 1 ? ' second' : ' seconds')
}

export const bytesToSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 Byte'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Math.round(bytes / 1024 ** i)} ${sizes[i]}`
}

export const bytesToMegabytes = (bytes: number): number => {
  return Math.round(bytes / 1024 ** 2)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  initialDelay = 1000,
  maxDelay = 10000,
  backoffFactor = 2,
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt === maxAttempts) throw lastError

      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay,
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Unexpected error in retryWithBackoff')
}
