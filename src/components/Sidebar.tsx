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

type SidebarProps = {
  collapsed?: boolean
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const is_supported = useWorkspaceStore((s) => s.is_supported)
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const can_restore = useWorkspaceStore((s) => s.can_restore)
  const error = useWorkspaceStore((s) => s.error)
  const add_folder = useWorkspaceStore((s) => s.add_folder)
  const restore_folders = useWorkspaceStore((s) => s.restore_folders)
  const close_folder = useWorkspaceStore((s) => s.close_folder)

  return (
    <aside
      className={`app__sidebar${collapsed ? ' app__sidebar--collapsed' : ''}`}
      aria-label="ファイル一覧"
    >
      {is_supported ? (
        <>
          <div className="sidebar__actions">
            <button type="button" className="btn" onClick={() => void add_folder()}>
              フォルダを追加
            </button>
            {can_restore && (
              <button
                type="button"
                className="btn btn--subtle"
                onClick={() => void restore_folders()}
              >
                前回のフォルダを開く
              </button>
            )}
          </div>

          {error && <p className="sidebar__error">{error}</p>}

          {workspaces.length > 0 ? (
            workspaces.map((ws) => (
              <div key={ws.id} className="workspace">
                <div className="sidebar__folder">
                  <span className="sidebar__folder-name" title={ws.name}>
                    📁 {ws.name}
                  </span>
                  <button
                    type="button"
                    className="sidebar__close"
                    aria-label={`${ws.name} を閉じる`}
                    onClick={() => void close_folder(ws.id)}
                  >
                    ✕
                  </button>
                </div>
                <FileTree workspace_id={ws.id} nodes={ws.tree} />
              </div>
            ))
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
