import { useThemeStore, get_initial_theme } from './themeStore'

const STORAGE_KEY = 'lite-md:theme'

function set_matchmedia(matches: boolean) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

describe('get_initial_theme', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('保存済みの値を優先する', () => {
    localStorage.setItem(STORAGE_KEY, 'dark')
    expect(get_initial_theme()).toBe('dark')
  })

  it('保存値が無くOSがダークなら dark', () => {
    localStorage.clear()
    set_matchmedia(true)
    expect(get_initial_theme()).toBe('dark')
  })

  it('保存値が無くOSがライトなら light', () => {
    localStorage.clear()
    set_matchmedia(false)
    expect(get_initial_theme()).toBe('light')
  })
})

describe('useThemeStore', () => {
  it('toggle_theme でテーマを反転し data-theme に反映する', () => {
    const before = useThemeStore.getState().theme
    useThemeStore.getState().toggle_theme()
    const after = useThemeStore.getState().theme
    expect(after).not.toBe(before)
    expect(document.documentElement.getAttribute('data-theme')).toBe(after)
  })
})
