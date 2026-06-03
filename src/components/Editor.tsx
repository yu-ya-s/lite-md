import { useRef } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import type { Command } from '@codemirror/view'
import { EditorToolbar } from './EditorToolbar'
import { markdown_keymap } from '../lib/editor/markdownCommands'

type EditorProps = {
  value: string
  on_change: (value: string) => void
}

const extensions = [markdown(), markdown_keymap]

export function Editor({ value, on_change }: EditorProps) {
  const cm_ref = useRef<ReactCodeMirrorRef>(null)

  const run = (command: Command) => {
    const view = cm_ref.current?.view
    if (view) {
      command(view)
    }
  }

  return (
    <div className="editor-wrap">
      <EditorToolbar run={run} />
      <CodeMirror
        ref={cm_ref}
        className="editor"
        value={value}
        extensions={extensions}
        onChange={on_change}
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
      />
    </div>
  )
}
