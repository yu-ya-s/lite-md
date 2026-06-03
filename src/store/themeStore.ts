import { create } from 'zustand'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'lite-md:theme'

export function get_initial_theme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') {
    return saved
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply_theme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem(STORAGE_KEY, theme)
}

type ThemeState = {
  theme: Theme
  toggle_theme: () => void
}

const initial_theme = get_initial_theme()
apply_theme(initial_theme)

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial_theme,
  toggle_theme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light'
    apply_theme(next)
    set({ theme: next })
  },
}))
