import { useThemeStore } from '../store/themeStore'

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const toggle_theme = useThemeStore((s) => s.toggle_theme)
  const is_dark = theme === 'dark'
  const label = is_dark ? 'ライトモードに切替' : 'ダークモードに切替'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle_theme}
      aria-label={label}
      title={label}
    >
      {is_dark ? '☀️' : '🌙'}
    </button>
  )
}
