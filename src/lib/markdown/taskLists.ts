import type MarkdownIt from 'markdown-it'

// GFM のタスクマーカー（[ ] / [x] / [X] + 半角スペース）で始まるインラインか
const MARKER_RE = /^\[( |x|X)\] /
// リスト記号 + タスクマーカーの行（引用 > 内のタスクも対象）
const LINE_RE = /^((?:\s*>)*\s*(?:[-*+]|\d{1,9}[.)])\s+\[)( |x|X)\]/

/**
 * markdown-it に GFM タスクリスト（- [ ] / - [x]）対応を追加するプラグイン。
 * チェックボックスに 0 始まりのソース行番号を data-line で付与し、
 * プレビュー側のクリックでソースの該当行を切り替えられるようにする。
 */
export function task_lists_plugin(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'task_lists', (state) => {
    const tokens = state.tokens
    for (let i = 2; i < tokens.length; i++) {
      const inline = tokens[i]
      if (
        inline.type !== 'inline' ||
        tokens[i - 1].type !== 'paragraph_open' ||
        tokens[i - 2].type !== 'list_item_open' ||
        !inline.children?.length
      ) {
        continue
      }
      const first = inline.children[0]
      if (first.type !== 'text' || !MARKER_RE.test(first.content)) continue

      const checked = first.content[1] === 'x' || first.content[1] === 'X'
      const line = tokens[i - 2].map?.[0] ?? -1
      first.content = first.content.slice(4)

      const checkbox = new state.Token('html_inline', '', 0)
      checkbox.content = `<input class="task-list-checkbox" type="checkbox" data-line="${line}"${checked ? ' checked=""' : ''}>`
      inline.children.unshift(checkbox)
      tokens[i - 2].attrJoin('class', 'task-list-item')
    }
    return true
  })
}

/**
 * source の line 行目（0始まり）がタスクリスト行なら [ ] / [x] を反転した新しい文字列を返す。
 * タスク行でない・行が範囲外の場合は null を返す（プレビューとソースの編集ずれによる誤反転を防ぐ）。
 */
export function toggle_task_line(source: string, line: number): string | null {
  const lines = source.split('\n')
  if (!Number.isInteger(line) || line < 0 || line >= lines.length) return null
  const match = LINE_RE.exec(lines[line])
  if (!match) return null
  const next_mark = match[2] === ' ' ? 'x' : ' '
  lines[line] = match[1] + next_mark + lines[line].slice(match[1].length + 1)
  return lines.join('\n')
}
