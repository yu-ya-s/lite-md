import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'

type EditorProps = {
  value: string
  on_change: (value: string) => void
}

const extensions = [markdown()]

export function Editor({ value, on_change }: EditorProps) {
  return (
    <CodeMirror
      className="editor"
      value={value}
      extensions={extensions}
      onChange={on_change}
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
    />
  )
}
