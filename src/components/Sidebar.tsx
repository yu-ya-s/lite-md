import type { ChangeEvent } from 'react'
import { useWorkspaceStore } from '../store/workspaceStore'
import { FileTree } from './FileTree'

function FallbackOpen() {
  const open_text = useWorkspaceStore((s) => s.open_text)

  async function handle_change(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    open_text(await file.text())
  }

  return (
    <div className="sidebar__fallback">
      <p className="app__placeholder">
        フォルダ参照は Chrome / Edge に対応しています。このブラウザでは単一ファイルの読み込みのみ可能です（保存はエクスポートをご利用ください）。
      </p>
      <label className="btn">
        ファイルを開く
        <input
          type="file"
          accept=".md,.markdown,text/markdown"
          hidden
          onChange={(event) => void handle_change(event)}
        />
      </label>
    </div>
  )
}

export function Sidebar() {
  const is_supported = useWorkspaceStore((s) => s.is_supported)
  const folder_name = useWorkspaceStore((s) => s.folder_name)
  const tree = useWorkspaceStore((s) => s.tree)
  const can_restore = useWorkspaceStore((s) => s.can_restore)
  const error = useWorkspaceStore((s) => s.error)
  const open_folder = useWorkspaceStore((s) => s.open_folder)
  const restore_folder = useWorkspaceStore((s) => s.restore_folder)
  const close_folder = useWorkspaceStore((s) => s.close_folder)

  return (
    <aside className="app__sidebar" aria-label="ファイル一覧">
      {is_supported ? (
        <>
          <div className="sidebar__actions">
            <button type="button" className="btn" onClick={() => void open_folder()}>
              フォルダを開く
            </button>
            {can_restore && (
              <button
                type="button"
                className="btn btn--subtle"
                onClick={() => void restore_folder()}
              >
                前回のフォルダを開く
              </button>
            )}
          </div>

          {error && <p className="sidebar__error">{error}</p>}

          {folder_name ? (
            <>
              <div className="sidebar__folder">
                <span className="sidebar__folder-name">📁 {folder_name}</span>
                <button
                  type="button"
                  className="sidebar__close"
                  aria-label="フォルダを閉じる"
                  onClick={() => void close_folder()}
                >
                  ✕
                </button>
              </div>
              <FileTree nodes={tree} />
            </>
          ) : (
            <p className="app__placeholder">フォルダ未選択</p>
          )}
        </>
      ) : (
        <FallbackOpen />
      )}
    </aside>
  )
}
