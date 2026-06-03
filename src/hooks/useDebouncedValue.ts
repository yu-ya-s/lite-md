import { useEffect, useState } from 'react'

/**
 * 値の更新を delay_ms だけ遅延させて返す。
 * キー入力ごとの重いプレビュー再描画を抑えるために使う。
 */
export function useDebouncedValue<T>(value: T, delay_ms: number): T {
  const [debounced, set_debounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => set_debounced(value), delay_ms)
    return () => clearTimeout(timer)
  }, [value, delay_ms])

  return debounced
}
