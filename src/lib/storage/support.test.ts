import { is_fsa_supported } from './support'

describe('is_fsa_supported', () => {
  const original = window.showDirectoryPicker

  afterEach(() => {
    if (original === undefined) {
      delete (window as { showDirectoryPicker?: unknown }).showDirectoryPicker
    } else {
      window.showDirectoryPicker = original
    }
  })

  it('showDirectoryPicker が関数なら true', () => {
    window.showDirectoryPicker = (async () => ({})) as typeof window.showDirectoryPicker
    expect(is_fsa_supported()).toBe(true)
  })

  it('showDirectoryPicker が無ければ false', () => {
    delete (window as { showDirectoryPicker?: unknown }).showDirectoryPicker
    expect(is_fsa_supported()).toBe(false)
  })
})
