import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ThemeToggle } from './components/ThemeToggle'
import { Editor } from './components/Editor'
import { Preview } from './components/Preview'
import { Sidebar } from './components/Sidebar'
import { SaveStatus } from './components/SaveStatus'
import { SettingsDialog } from './components/SettingsDialog'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useAutoSave } from './hooks/useAutoSave'
import { useScrollSync } from './hooks/useScrollSync'
import { useExternalChangeWatcher } from './hooks/useExternalChangeWatcher'
import { DONE_PREFIX, useWorkspaceStore } from './store/workspaceStore'

const SPLIT_KEY = 'lite-md:split'
const COLLAPSE_KEY = 'lite-md:sidebar-collapsed'
const VIEW_KEY = 'lite-md:view-mode'
const MIN_SPLIT = 0.15
const MAX_SPLIT = 0.85

type ViewMode = 'split' | 'preview'

function read_split(): number {
  const value = Number(localStorage.getItem(SPLIT_KEY))
  return value >= MIN_SPLIT && value <= MAX_SPLIT ? value : 0.5
}

function read_collapsed(): boolean {
  return localStorage.getItem(COLLAPSE_KEY) === '1'
}

function read_view_mode(): ViewMode {
  return localStorage.getItem(VIEW_KEY) === 'preview' ? 'preview' : 'split'
}

function App() {
  const content = useWorkspaceStore((s) => s.content)
  const baseline = useWorkspaceStore((s) => s.baseline)
  const set_content = useWorkspaceStore((s) => s.set_content)
  const current = useWorkspaceStore((s) => s.current)
  const save = useWorkspaceStore((s) => s.save)
  const toggle_done = useWorkspaceStore((s) => s.toggle_done)
  const external_changed = useWorkspaceStore((s) => s.external_changed)
  const reload_current = useWorkspaceStore((s) => s.reload_current)
  const preview_source = useDebouncedValue(content, 200)

  const current_name = current?.path.split('/').pop() ?? ''
  const is_done = current_name.startsWith(DONE_PREFIX)

  const [settings_open, set_settings_open] = useState(false)
  const [sidebar_collapsed, set_sidebar_collapsed] = useState(read_collapsed)
  const [view_mode, set_view_mode] = useState<ViewMode>(read_view_mode)
  const [split, set_split] = useState(read_split)
  const [editor_scroller, set_editor_scroller] = useState<HTMLElement | null>(null)
  const [preview_scroller, set_preview_scroller] = useState<HTMLDivElement | null>(null)
  const main_ref = useRef<HTMLElement>(null)

  useEffect(() => {
    void useWorkspaceStore.getState().init()
  }, [])

  useEffect(() => {
    const on_keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
        event.preventDefault()
        void useWorkspaceStore.getState().save()
      }
    }
    window.addEventListener('keydown', on_keydown)
    return () => window.removeEventListener('keydown', on_keydown)
  }, [])

  useEffect(() => {
    localStorage.setItem(SPLIT_KEY, String(split))
  }, [split])

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, sidebar_collapsed ? '1' : '0')
  }, [sidebar_collapsed])

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view_mode)
  }, [view_mode])

  useAutoSave()
  useScrollSync(editor_scroller, preview_scroller)
  useExternalChangeWatcher()

  const nudge_split = (delta: number) => {
    set_split((value) => {
      const next = Math.round((value + delta) * 100) / 100
      return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, next))
    })
  }

  const on_splitter_key = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      nudge_split(-0.02)
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      nudge_split(0.02)
    }
  }

  const start_drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const handle_move = (move_event: PointerEvent) => {
      const rect = main_ref.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return
      const ratio = (move_event.clientX - rect.left) / rect.width
      set_split(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, ratio)))
    }
    const handle_up = () => {
      window.removeEventListener('pointermove', handle_move)
      window.removeEventListener('pointerup', handle_up)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handle_move)
    window.addEventListener('pointerup', handle_up)
  }

  const main_style = {
    '--editor-fr': `${split}fr`,
    '--preview-fr': `${1 - split}fr`,
  } as CSSProperties

  return (
    <div className="app">
      <header className="app__toolbar">
        <div className="app__toolbar-left">
          <button
            type="button"
            className="toolbar-btn"
            aria-label="サイドバーの表示切替"
            title="サイドバーの表示切替"
            onClick={() => set_sidebar_collapsed((value) => !value)}
          >
            ☰
          </button>
          <h1 className="app__title">lite-md</h1>
        </div>
        <div className="app__toolbar-actions">
          <SaveStatus />
          {current && (
            <button
              type="button"
              className="toolbar-btn"
              aria-label="保存"
              title="保存 (Ctrl+S)"
              onClick={() => void save()}
            >
              💾
            </button>
          )}
          {current && (
            <button
              type="button"
              className={`toolbar-btn${is_done ? ' toolbar-btn--active' : ''}`}
              aria-label={is_done ? '処理済みを解除' : '処理済みにする'}
              title={is_done ? '処理済みを解除（【済】を外す）' : '処理済みにする（ファイル名の先頭に【済】）'}
              aria-pressed={is_done}
              onClick={() => void toggle_done()}
            >
              済
            </button>
          )}
          <button
            type="button"
            className="toolbar-btn"
            aria-label={view_mode === 'split' ? 'プレビューのみ表示' : 'エディタを表示'}
            title={view_mode === 'split' ? 'プレビューのみ表示' : 'エディタを表示'}
            aria-pressed={view_mode === 'preview'}
            onClick={() => set_view_mode((mode) => (mode === 'split' ? 'preview' : 'split'))}
          >
            {view_mode === 'split' ? '👁' : '◧'}
          </button>
          <button
            type="button"
            className="toolbar-btn"
            aria-label="設定"
            title="設定"
            onClick={() => set_settings_open(true)}
          >
            ⚙
          </button>
          <ThemeToggle />
        </div>
      </header>

      {external_changed && (
        <div className="external-banner" role="status">
          <span>このファイルは外部で変更されました（未保存の編集があります）。</span>
          <button type="button" className="btn btn--subtle" onClick={() => void reload_current()}>
            再読み込み
          </button>
        </div>
      )}

      <div className="app__body">
        <Sidebar collapsed={sidebar_collapsed} />

        <main
          className={`app__main${view_mode === 'preview' ? ' app__main--preview' : ''}`}
          ref={main_ref}
          style={main_style}
        >
          <section className="pane pane--editor" aria-label="エディタ">
            <Editor
              value={content}
              baseline={baseline}
              on_change={set_content}
              on_scroller={set_editor_scroller}
            />
          </section>
          <div
            className="splitter"
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-label="エディタとプレビューの幅を調整"
            aria-valuemin={Math.round(MIN_SPLIT * 100)}
            aria-valuemax={Math.round(MAX_SPLIT * 100)}
            aria-valuenow={Math.round(split * 100)}
            onPointerDown={start_drag}
            onKeyDown={on_splitter_key}
          />
          <section className="pane pane--preview" aria-label="プレビュー">
            <Preview markdown={preview_source} on_container={set_preview_scroller} />
          </section>
        </main>
      </div>

      <SettingsDialog open={settings_open} on_close={() => set_settings_open(false)} />
    </div>
  )
}

export default App
