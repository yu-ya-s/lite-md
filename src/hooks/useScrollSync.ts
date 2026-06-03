import { useEffect } from 'react'

/**
 * 2つのスクロール要素のスクロール位置を比例同期する。
 * 一方を動かしたとき他方を同じ割合までスクロールさせる。
 * 同期による scroll イベントが跳ね返って無限ループにならないよう locked で抑止する。
 */
export function useScrollSync(a: HTMLElement | null, b: HTMLElement | null) {
  useEffect(() => {
    if (!a || !b) return

    let locked = false

    const sync = (src: HTMLElement, dst: HTMLElement) => {
      if (locked) return
      locked = true
      const src_range = src.scrollHeight - src.clientHeight
      const dst_range = dst.scrollHeight - dst.clientHeight
      const ratio = src_range > 0 ? src.scrollTop / src_range : 0
      dst.scrollTop = ratio * dst_range
      requestAnimationFrame(() => {
        locked = false
      })
    }

    const on_a = () => sync(a, b)
    const on_b = () => sync(b, a)
    a.addEventListener('scroll', on_a, { passive: true })
    b.addEventListener('scroll', on_b, { passive: true })

    return () => {
      a.removeEventListener('scroll', on_a)
      b.removeEventListener('scroll', on_b)
    }
  }, [a, b])
}
