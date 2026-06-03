import { useEffect } from 'react'
import { ThemeToggle } from './components/ThemeToggle'
import { Editor } from './components/Editor'
import { Preview } from './components/Preview'
import { Sidebar } from './components/Sidebar'
import { SaveStatus } from './components/SaveStatus'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useAutoSave } from './hooks/useAutoSave'
import { useWorkspaceStore } from './store/workspaceStore'

function App() {
  const content = useWorkspaceStore((s) => s.content)
  const set_content = useWorkspaceStore((s) => s.set_content)
  const preview_source = useDebouncedValue(content, 200)

  useEffect(() => {
    void useWorkspaceStore.getState().init()
  }, [])

  useAutoSave()

  return (
    <div className="app">
      <header className="app__toolbar">
        <h1 className="app__title">lite-md</h1>
        <div className="app__toolbar-actions">
          <SaveStatus />
          <ThemeToggle />
        </div>
      </header>

      <div className="app__body">
        <Sidebar />

        <main className="app__main">
          <section className="pane pane--editor" aria-label="エディタ">
            <Editor value={content} on_change={set_content} />
          </section>
          <section className="pane pane--preview" aria-label="プレビュー">
            <Preview markdown={preview_source} />
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
