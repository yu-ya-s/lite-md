import { useRef } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import type { Command } from '@codemirror/view'
import { EditorToolbar } from './EditorToolbar'
import { markdown_keymap } from '../lib/editor/markdownCommands'
import { useThemeStore } from '../store/themeStore'

type EditorProps = {
  value: string
  on_change: (value: string) => void
  on_scroller?: (el: HTMLElement) => void
}

const extensions = [markdown(), markdown_keymap]

export function Editor({ value, on_change, on_scroller }: EditorProps) {
  const cm_ref = useRef<ReactCodeMirrorRef>(null)
  const theme = useThemeStore((s) => s.theme)

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
        theme={theme}
        extensions={extensions}
        onChange={on_change}
        onCreateEditor={(view) => on_scroller?.(view.scrollDOM)}
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
      />
    </div>
  )
}
