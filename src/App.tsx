import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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
import { useWorkspaceStore } from './store/workspaceStore'

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
  const set_content = useWorkspaceStore((s) => s.set_content)
  const preview_source = useDebouncedValue(content, 200)

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

      <div className="app__body">
        <Sidebar collapsed={sidebar_collapsed} />

        <main
          className={`app__main${view_mode === 'preview' ? ' app__main--preview' : ''}`}
          ref={main_ref}
          style={main_style}
        >
          <section className="pane pane--editor" aria-label="エディタ">
            <Editor value={content} on_change={set_content} on_scroller={set_editor_scroller} />
          </section>
          <div
            className="splitter"
            role="separator"
            aria-orientation="vertical"
            aria-label="エディタとプレビューの幅を調整"
            onPointerDown={start_drag}
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
