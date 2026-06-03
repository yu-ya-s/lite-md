import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'lite-md:theme'

function get_initial_theme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') {
    return saved
  }
  const prefers_dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefers_dark ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, set_theme] = useState<Theme>(get_initial_theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggle_theme = useCallback(() => {
    set_theme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  return { theme, toggle_theme }
}
