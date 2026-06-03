import {
  EditorSelection,
  Prec,
  type ChangeSpec,
  type EditorState,
  type TransactionSpec,
} from '@codemirror/state'
import { keymap, type Command, type EditorView } from '@codemirror/view'

// 選択範囲を marker（** や * など）で囲む / すでに囲まれていれば外す
export function wrap_selection(state: EditorState, marker: string): TransactionSpec {
  const range = state.selection.main
  const selected = state.sliceDoc(range.from, range.to)
  const before = state.sliceDoc(Math.max(0, range.from - marker.length), range.from)
  const after = state.sliceDoc(range.to, Math.min(state.doc.length, range.to + marker.length))

  if (selected && before === marker && after === marker) {
    return {
      changes: [
        { from: range.from - marker.length, to: range.from },
        { from: range.to, to: range.to + marker.length },
      ],
      selection: EditorSelection.range(range.from - marker.length, range.to - marker.length),
    }
  }

  return {
    changes: [
      { from: range.from, insert: marker },
      { from: range.to, insert: marker },
    ],
    selection: EditorSelection.range(range.from + marker.length, range.to + marker.length),
  }
}

// 選択行の行頭に prefix（'# ' や '- ' など）を付ける / すでに付いていれば外す
export function toggle_line_prefix(state: EditorState, prefix: string): TransactionSpec {
  const range = state.selection.main
  const start_line = state.doc.lineAt(range.from)
  const end_line = state.doc.lineAt(range.to)
  const changes: ChangeSpec[] = []

  for (let n = start_line.number; n <= end_line.number; n++) {
    const line = state.doc.line(n)
    if (line.text.startsWith(prefix)) {
      changes.push({ from: line.from, to: line.from + prefix.length })
    } else {
      changes.push({ from: line.from, insert: prefix })
    }
  }

  return { changes }
}

// リンク記法を挿入。選択があればリンクテキストにし、カーソルは url 部分へ
export function insert_link(state: EditorState): TransactionSpec {
  const range = state.selection.main
  const selected = state.sliceDoc(range.from, range.to)
  const text = selected || 'リンクテキスト'
  const insert = `[${text}](url)`
  const url_start = range.from + text.length + 3 // "[" + text + "]("

  return {
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.range(url_start, url_start + 3),
  }
}

function command_from(make_spec: (state: EditorState) => TransactionSpec): Command {
  return (view: EditorView) => {
    view.dispatch(view.state.update(make_spec(view.state)))
    view.focus()
    return true
  }
}

export const bold_command = command_from((s) => wrap_selection(s, '**'))
export const italic_command = command_from((s) => wrap_selection(s, '*'))
export const inline_code_command = command_from((s) => wrap_selection(s, '`'))
export const heading_command = command_from((s) => toggle_line_prefix(s, '# '))
export const bullet_list_command = command_from((s) => toggle_line_prefix(s, '- '))
export const quote_command = command_from((s) => toggle_line_prefix(s, '> '))
export const link_command = command_from(insert_link)

export const markdown_keymap = Prec.high(
  keymap.of([
    { key: 'Mod-b', run: bold_command },
    { key: 'Mod-i', run: italic_command },
    { key: 'Mod-k', run: link_command },
  ]),
)
