import { renderHook } from '@testing-library/react'
import { useScrollSync } from './useScrollSync'

// jsdom はレイアウトしないため、scrollTop/scrollHeight/clientHeight を手動で定義する
function make_el(scroll_height: number, client_height: number): HTMLElement {
  const el = document.createElement('div')
  let top = 0
  Object.defineProperty(el, 'scrollTop', {
    get: () => top,
    set: (value: number) => {
      top = value
    },
    configurable: true,
  })
  Object.defineProperty(el, 'scrollHeight', { value: scroll_height, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: client_height, configurable: true })
  return el
}

describe('useScrollSync', () => {
  it('一方のスクロールに比例して他方をスクロールさせる', () => {
    const a = make_el(200, 100) // スクロール可動域 100
    const b = make_el(400, 100) // スクロール可動域 300
    renderHook(() => useScrollSync(a, b))

    a.scrollTop = 50 // 50% 位置
    a.dispatchEvent(new Event('scroll'))

    expect(b.scrollTop).toBe(150) // 0.5 * 300
  })

  it('要素が null でも例外を投げない', () => {
    expect(() => renderHook(() => useScrollSync(null, null))).not.toThrow()
  })
})
