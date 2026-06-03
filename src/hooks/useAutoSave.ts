import { useEffect } from 'react'
import { useDebouncedValue } from './useDebouncedValue'
import { useWorkspaceStore } from '../store/workspaceStore'

/**
 * 編集内容を一定時間入力が止まったら自動保存する。
 * ファイルを開いていて（current_path あり）未保存（dirty）のときのみ保存する。
 */
export function useAutoSave(delay_ms = 800) {
  const content = useWorkspaceStore((s) => s.content)
  const debounced = useDebouncedValue(content, delay_ms)

  useEffect(() => {
    const state = useWorkspaceStore.getState()
    if (state.current && state.save_status === 'dirty') {
      void state.save()
    }
  }, [debounced])
}
