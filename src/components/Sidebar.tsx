import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { DONE_PREFIX, useWorkspaceStore } from '../store/workspaceStore'
import { collect_files, filter_out_prefixed } from '../lib/tree'
import { FileTree } from './FileTree'

const HIDE_DONE_KEY = 'lite-md:hide-done'
const EMPTY_SELECTION = new Set<string>()

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
  const is_loading = useWorkspaceStore((s) => s.is_loading)
  const error = useWorkspaceStore((s) => s.error)
  const add_folder = useWorkspaceStore((s) => s.add_folder)
  const restore_folders = useWorkspaceStore((s) => s.restore_folders)
  const reload_folder = useWorkspaceStore((s) => s.reload_folder)
  const rename_workspace = useWorkspaceStore((s) => s.rename_workspace)
  const close_folder = useWorkspaceStore((s) => s.close_folder)
  const mark_done = useWorkspaceStore((s) => s.mark_done)

  const [editing_id, set_editing_id] = useState<string | null>(null)
  const [draft, set_draft] = useState('')
  const [hide_done, set_hide_done] = useState(() => localStorage.getItem(HIDE_DONE_KEY) === '1')
  const [expanded_ids, set_expanded_ids] = useState<Set<string>>(new Set())
  // ワークスペースIDごとの選択中ファイルパス（一括「済にする」の対象）
  const [selected_paths, set_selected_paths] = useState<Record<string, Set<string>>>({})
  // 「済にする」実行中のワークスペースID（連打防止のためボタンを disabled にする）
  const [marking_ids, set_marking_ids] = useState<Set<string>>(new Set())

  useEffect(() => {
    localStorage.setItem(HIDE_DONE_KEY, hide_done ? '1' : '0')
  }, [hide_done])

  // フォルダの再読み込み・閉じる・済化などでツリーが変わったら、
  // 存在しなくなったパスの選択を落とす
  useEffect(() => {
    set_selected_paths((prev) => {
      if (Object.keys(prev).length === 0) return prev
      let changed = false
      const next: Record<string, Set<string>> = {}
      for (const [ws_id, paths] of Object.entries(prev)) {
        const ws = workspaces.find((w) => w.id === ws_id)
        if (!ws) {
          changed = true
          continue
        }
        const valid_paths = new Set(collect_files(ws.tree).map((f) => f.path))
        const filtered = new Set([...paths].filter((p) => valid_paths.has(p)))
        if (filtered.size !== paths.size) changed = true
        if (filtered.size > 0) next[ws_id] = filtered
      }
      return changed ? next : prev
    })
  }, [workspaces])
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

  const toggle_expanded = (id: string) => {
    set_expanded_ids((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const get_selected = (ws_id: string): Set<string> => selected_paths[ws_id] ?? EMPTY_SELECTION

  const toggle_select = (ws_id: string, path: string) => {
    set_selected_paths((prev) => {
      const current_set = prev[ws_id] ?? new Set<string>()
      const next_set = new Set(current_set)
      if (next_set.has(path)) next_set.delete(path)
      else next_set.add(path)
      const next = { ...prev }
      if (next_set.size > 0) next[ws_id] = next_set
      else delete next[ws_id]
      return next
    })
  }

  const toggle_select_all = (ws_id: string, paths: string[]) => {
    set_selected_paths((prev) => {
      const current_set = prev[ws_id] ?? new Set<string>()
      const all_selected = paths.length > 0 && paths.every((p) => current_set.has(p))
      const next = { ...prev }
      if (all_selected) {
        delete next[ws_id]
      } else {
        next[ws_id] = new Set(paths)
      }
      return next
    })
  }

  const clear_selection = (ws_id: string) => {
    set_selected_paths((prev) => {
      if (!prev[ws_id]) return prev
      const next = { ...prev }
      delete next[ws_id]
      return next
    })
  }

  const handle_mark_done = async (ws_id: string, paths: string[]) => {
    set_marking_ids((prev) => new Set(prev).add(ws_id))
    try {
      await mark_done(paths.map((path) => ({ workspace_id: ws_id, path })))
    } finally {
      set_marking_ids((prev) => {
        const next = new Set(prev)
        next.delete(ws_id)
        return next
      })
      clear_selection(ws_id)
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
              disabled={is_loading}
              onClick={() => void add_folder()}
            >
              フォルダを追加
            </button>
            {can_restore && (
              <button
                type="button"
                className="btn btn--subtle"
                disabled={is_loading}
                onClick={() => void restore_folders()}
              >
                前回のフォルダを開く
              </button>
            )}
          </div>

          {is_loading && (
            <p className="app__placeholder" role="status">
              フォルダを読み込み中…
            </p>
          )}

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
              const is_expanded = expanded_ids.has(ws.id)
              const undone_paths = collect_files(nodes)
                .filter((f) => !f.name.startsWith(DONE_PREFIX))
                .map((f) => f.path)
              const selected_set = get_selected(ws.id)
              const all_selected =
                undone_paths.length > 0 && undone_paths.every((p) => selected_set.has(p))
              const some_selected = undone_paths.some((p) => selected_set.has(p))
              return (
                <div key={ws.id} className="workspace">
                  <div className="sidebar__folder">
                    <button
                      type="button"
                      className="sidebar__caret"
                      aria-expanded={is_expanded}
                      aria-label={`${display_name} を${is_expanded ? '折りたたむ' : '展開する'}`}
                      title={is_expanded ? '折りたたむ' : '展開する'}
                      onClick={() => toggle_expanded(ws.id)}
                    >
                      {is_expanded ? '▾' : '▸'}
                    </button>
                    <input
                      type="checkbox"
                      className="sidebar__select-all"
                      aria-label={`${display_name} のファイルをすべて選択`}
                      disabled={undone_paths.length === 0}
                      checked={all_selected}
                      ref={(el) => {
                        if (el) el.indeterminate = !all_selected && some_selected
                      }}
                      onChange={() => toggle_select_all(ws.id, undone_paths)}
                    />
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
                  {selected_set.size > 0 && (
                    <div className="sidebar__bulk">
                      <span>{selected_set.size}件選択中</span>
                      <button
                        type="button"
                        className="btn sidebar__bulk-done"
                        aria-label={`${display_name} の選択したファイルを済にする`}
                        disabled={marking_ids.has(ws.id)}
                        onClick={() => void handle_mark_done(ws.id, [...selected_set])}
                      >
                        済にする
                      </button>
                      <button
                        type="button"
                        className="btn btn--subtle"
                        disabled={marking_ids.has(ws.id)}
                        onClick={() => clear_selection(ws.id)}
                      >
                        選択解除
                      </button>
                    </div>
                  )}
                  {is_expanded && (
                    <FileTree
                      workspace_id={ws.id}
                      nodes={nodes}
                      selected={selected_set}
                      on_toggle_select={(path) => toggle_select(ws.id, path)}
                    />
                  )}
                </div>
              )
            })
          ) : (
            // 読み込み中は「読み込み中」の表示に任せ、未選択の案内は出さない
            !is_loading && <p className="app__placeholder">フォルダ未選択</p>
          )}
        </>
      ) : (
        <FallbackOpen />
      )}
    </aside>
  )
}
