import { useEffect } from 'react'
import { useWorkspaceStore } from '../store/workspaceStore'

/**
 * 開いているファイルの外部変更を定期的にチェックする。
 * File System Access API には安定した監視APIが無いため、更新時刻のポーリングで検知する。
 */
export function useExternalChangeWatcher(interval_ms = 3000) {
  useEffect(() => {
    const timer = setInterval(() => {
      void useWorkspaceStore.getState().check_external_change()
    }, interval_ms)
    return () => clearInterval(timer)
  }, [interval_ms])
}
