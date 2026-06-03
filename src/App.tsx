import { useState } from 'react'
import { ThemeToggle } from './components/ThemeToggle'
import { Editor } from './components/Editor'
import { Preview } from './components/Preview'
import { useDebouncedValue } from './hooks/useDebouncedValue'

const INITIAL_CONTENT = `# lite-md

軽量Markdownエディタへようこそ。

- 左で編集すると
- 右にリアルタイムでプレビューされます

| 機能 | 状態 |
| --- | --- |
| 分割ビュー | 実装済み |
| ローカル保存 | 予定 |

\`\`\`js
console.log('hello, lite-md')
\`\`\`
`

function App() {
  const [content, set_content] = useState(INITIAL_CONTENT)
  const preview_source = useDebouncedValue(content, 200)

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
