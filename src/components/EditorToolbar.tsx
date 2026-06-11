import type { Command } from '@codemirror/view'
import {
  bold_command,
  bullet_list_command,
  heading_command,
  inline_code_command,
  italic_command,
  link_command,
  quote_command,
} from '../lib/editor/markdownCommands'

type EditorToolbarProps = {
  run: (command: Command) => void
}

const BUTTONS: { label: string; title: string; command: Command }[] = [
  { label: 'H', title: '見出し', command: heading_command },
  { label: 'B', title: '太字 (Ctrl+B)', command: bold_command },
  { label: 'I', title: '斜体 (Ctrl+I)', command: italic_command },
  { label: '❝', title: '引用', command: quote_command },
  { label: '•', title: '箇条書き', command: bullet_list_command },
  { label: '</>', title: 'インラインコード', command: inline_code_command },
  { label: '🔗', title: 'リンク (Ctrl+K)', command: link_command },
]

export function EditorToolbar({ run }: EditorToolbarProps) {
  return (
    <div id="js-tour-format-toolbar" className="editor-toolbar" role="toolbar" aria-label="書式ツールバー">
      {BUTTONS.map((button) => (
        <button
          key={button.title}
          type="button"
          className="editor-toolbar__btn"
          title={button.title}
          aria-label={button.title}
          onClick={() => run(button.command)}
        >
          {button.label}
        </button>
      ))}
    </div>
  )
}
