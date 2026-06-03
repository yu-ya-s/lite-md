import { ThemeToggle } from './components/ThemeToggle'

function App() {
  return (
    <div className="app">
      <header className="app__toolbar">
        <h1 className="app__title">lite-md</h1>
        <div className="app__toolbar-actions">
          <ThemeToggle />
        </div>
      </header>

      <div className="app__body">
        <aside className="app__sidebar" aria-label="ファイル一覧">
          <p className="app__placeholder">フォルダ未選択</p>
        </aside>

        <main className="app__main">
          <section className="pane pane--editor" aria-label="エディタ">
            <p className="app__placeholder">エディタ（Phase 2で実装）</p>
          </section>
          <section className="pane pane--preview" aria-label="プレビュー">
            <p className="app__placeholder">プレビュー（Phase 2で実装）</p>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
