import { useEffect, useState } from 'react'
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

function App() {
  const content = useWorkspaceStore((s) => s.content)
  const set_content = useWorkspaceStore((s) => s.set_content)
  const preview_source = useDebouncedValue(content, 200)
  const [settings_open, set_settings_open] = useState(false)
  const [editor_scroller, set_editor_scroller] = useState<HTMLElement | null>(null)
  const [preview_scroller, set_preview_scroller] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    void useWorkspaceStore.getState().init()
  }, [])

  useAutoSave()
  useScrollSync(editor_scroller, preview_scroller)

  return (
    <div className="app">
      <header className="app__toolbar">
        <h1 className="app__title">lite-md</h1>
        <div className="app__toolbar-actions">
          <SaveStatus />
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
        <Sidebar />

        <main className="app__main">
          <section className="pane pane--editor" aria-label="エディタ">
            <Editor value={content} on_change={set_content} on_scroller={set_editor_scroller} />
          </section>
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
