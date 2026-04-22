/** Base64 key representing a space character — used as root folder sentinel */
export const ROOT_FOLDER = 'IA=='

export const encode = (key: string): string => {
  if (key && key !== '/' && key.startsWith('/')) {
    key = key.slice(1)
  }
  return btoa(unescape(encodeURIComponent(key)))
}

export const decode = (key: string): string => {
  return decodeURIComponent(escape(atob(key)))
}
