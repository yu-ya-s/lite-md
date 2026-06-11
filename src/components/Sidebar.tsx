import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { DONE_PREFIX, useWorkspaceStore } from '../store/workspaceStore'
import { filter_out_prefixed } from '../lib/tree'
import { FileTree } from './FileTree'

const HIDE_DONE_KEY = 'lite-md:hide-done'

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
  const reload_folder = useWorkspaceStore((s) => s.reload_folder)
  const rename_workspace = useWorkspaceStore((s) => s.rename_workspace)
  const close_folder = useWorkspaceStore((s) => s.close_folder)

  const [editing_id, set_editing_id] = useState<string | null>(null)
  const [draft, set_draft] = useState('')
  const [hide_done, set_hide_done] = useState(() => localStorage.getItem(HIDE_DONE_KEY) === '1')

  useEffect(() => {
    localStorage.setItem(HIDE_DONE_KEY, hide_done ? '1' : '0')
  }, [hide_done])
  // Escape による取り消しが blur 経由で誤って確定されないよう、取り消し中フラグを持つ
  const cancel_rename = useRef(false)

  const start_rename = (id: string, current: string) => {
    set_editing_id(id)
    set_draft(current)
  }

  const finish_rename = (id: string) => {
    if (cancel_rename.current) {
      cancel_rename.current = false
    } else {
      void rename_workspace(id, draft.trim())
    }
    set_editing_id(null)
  }

  const on_rename_key = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
    } else if (event.key === 'Escape') {
      cancel_rename.current = true
      event.currentTarget.blur()
    }
  }

  return (
    <aside
      className={`app__sidebar${collapsed ? ' app__sidebar--collapsed' : ''}`}
      aria-label="ファイル一覧"
    >
      {is_supported ? (
        <>
          <div className="sidebar__actions">
            <button
              id="js-tour-open-folder"
              type="button"
              className="btn"
              onClick={() => void add_folder()}
            >
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

          {workspaces.length > 0 && (
            <button
              type="button"
              className="btn btn--subtle sidebar__filter"
              aria-pressed={hide_done}
              onClick={() => set_hide_done((value) => !value)}
            >
              {hide_done ? '【済】を表示' : '【済】を隠す'}
            </button>
          )}

          {workspaces.length > 0 ? (
            workspaces.map((ws) => {
              const display_name = ws.label || ws.name
              const nodes = hide_done ? filter_out_prefixed(ws.tree, DONE_PREFIX) : ws.tree
              return (
                <div key={ws.id} className="workspace">
                  <div className="sidebar__folder">
                    {editing_id === ws.id ? (
                      <input
                        className="sidebar__rename"
                        autoFocus
                        value={draft}
                        aria-label="フォルダの表示名"
                        onChange={(event) => set_draft(event.target.value)}
                        onBlur={() => finish_rename(ws.id)}
                        onKeyDown={on_rename_key}
                      />
                    ) : (
                      <span className="sidebar__folder-name" title={display_name}>
                        📁 {display_name}
                      </span>
                    )}
                    <span className="sidebar__folder-actions">
                      <button
                        type="button"
                        className="sidebar__icon"
                        aria-label={`${display_name} を再読み込み`}
                        title="フォルダを再読み込み（新しいファイルを反映）"
                        onClick={() => void reload_folder(ws.id)}
                      >
                        ↻
                      </button>
                      <button
                        type="button"
                        className="sidebar__icon"
                        aria-label={`${display_name} の表示名を変更`}
                        title="表示名を変更"
                        onClick={() => start_rename(ws.id, ws.label || ws.name)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="sidebar__icon"
                        aria-label={`${display_name} を閉じる`}
                        title="フォルダを閉じる"
                        onClick={() => void close_folder(ws.id)}
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                  <FileTree workspace_id={ws.id} nodes={nodes} />
                </div>
              )
            })
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
