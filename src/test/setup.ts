import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

// jsdom には matchMedia が無いため、テーマ初期判定用に最小限のスタブを用意する
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
