import { useEffect, useRef } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import type { Command } from '@codemirror/view'
import { EditorToolbar } from './EditorToolbar'
import { markdown_keymap } from '../lib/editor/markdownCommands'
import { changed_lines_extension, set_baseline } from '../lib/editor/changedLines'
import { useThemeStore } from '../store/themeStore'

type EditorProps = {
  value: string
  baseline: string
  on_change: (value: string) => void
  on_scroller?: (el: HTMLElement) => void
}

const extensions = [markdown(), markdown_keymap, changed_lines_extension]

export function Editor({ value, baseline, on_change, on_scroller }: EditorProps) {
  const cm_ref = useRef<ReactCodeMirrorRef>(null)
  const theme = useThemeStore((s) => s.theme)

  const run = (command: Command) => {
    const view = cm_ref.current?.view
    if (view) {
      command(view)
    }
  }

  // 保存済みの内容（baseline）が変わったらエディタに伝え、変更行ハイライトを更新する
  useEffect(() => {
    const view = cm_ref.current?.view
    if (view) {
      view.dispatch({ effects: set_baseline.of(baseline) })
    }
  }, [baseline])

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
        onCreateEditor={(view) => {
          on_scroller?.(view.scrollDOM)
          view.dispatch({ effects: set_baseline.of(baseline) })
        }}
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
      />
    </div>
  )
}
