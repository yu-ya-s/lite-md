import { useEffect } from 'react'
import { useDebouncedValue } from './useDebouncedValue'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useSettingsStore } from '../store/settingsStore'

/**
 * 保存モードが「自動」のときだけ、入力が止まってから自動保存する。
 * ファイルを開いていて（current あり）未保存（dirty）のときのみ保存する。
 */
export function useAutoSave(delay_ms = 800) {
  const content = useWorkspaceStore((s) => s.content)
  const save_mode = useSettingsStore((s) => s.save_mode)
  const debounced = useDebouncedValue(content, delay_ms)

  useEffect(() => {
    if (save_mode !== 'auto') return
    const state = useWorkspaceStore.getState()
    if (state.current && state.save_status === 'dirty') {
      void state.save()
    }
  }, [debounced, save_mode])
}
