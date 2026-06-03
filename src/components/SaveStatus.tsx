import { useWorkspaceStore, type SaveStatus as SaveStatusValue } from '../store/workspaceStore'

const LABELS: Record<SaveStatusValue, string> = {
  idle: '',
  dirty: '未保存',
  saving: '保存中…',
  saved: '保存済み',
  error: '保存エラー',
}

export function SaveStatus() {
  const current_path = useWorkspaceStore((s) => s.current_path)
  const save_status = useWorkspaceStore((s) => s.save_status)

  if (!current_path) {
    return null
  }

  const file_name = current_path.split('/').pop()

  return (
    <span className="save-status">
      <span className="save-status__name">{file_name}</span>
      <span className={`save-status__badge save-status__badge--${save_status}`}>
        {LABELS[save_status]}
      </span>
    </span>
  )
}
