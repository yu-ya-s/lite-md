import { useTheme } from '../hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggle_theme } = useTheme()
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
