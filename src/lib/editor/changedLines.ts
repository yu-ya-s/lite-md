import { RangeSetBuilder, StateEffect, StateField, type EditorState } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'

// 行数がこれを超えるファイルでは差分計算（O(m*n)）を省略してハイライトしない
const MAX_LINES = 2000

/**
 * baseline（保存済みの内容）と current（現在の内容）を行単位で比較し、
 * current 側で追加・変更された行番号（1始まり）の集合を返す。
 * LCS で一致行を求め、一致しない行を「変更あり」とみなす（削除行は current に存在しないため対象外）。
 */
export function changed_line_set(baseline: string, current: string): Set<number> {
  const changed = new Set<number>()
  if (baseline === current) return changed

  const a = baseline.split('\n')
  const b = current.split('\n')
  const m = a.length
  const n = b.length
  if (m > MAX_LINES || n > MAX_LINES) return changed

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++ // baseline 側の行が削除された
    } else {
      changed.add(j + 1) // current 側の行が追加・変更された
      j++
    }
  }
  while (j < n) {
    changed.add(j + 1)
    j++
  }
  return changed
}

export const set_baseline = StateEffect.define<string>()

const baseline_field = StateField.define<string>({
  create: () => '',
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(set_baseline)) {
        return effect.value
      }
    }
    return value
  },
})

const changed_line_decoration = Decoration.line({ class: 'cm-changed-line' })

function build_decorations(state: EditorState): DecorationSet {
  const baseline = state.field(baseline_field)
  const changed = changed_line_set(baseline, state.doc.toString())
  const builder = new RangeSetBuilder<Decoration>()
  for (let n = 1; n <= state.doc.lines; n++) {
    if (changed.has(n)) {
      builder.add(state.doc.line(n).from, state.doc.line(n).from, changed_line_decoration)
    }
  }
  return builder.finish()
}

export const changed_lines_field = StateField.define<DecorationSet>({
  create: (state) => build_decorations(state),
  update(decorations, tr) {
    if (tr.docChanged || tr.effects.some((effect) => effect.is(set_baseline))) {
      return build_decorations(tr.state)
    }
    return decorations
  },
  provide: (field) => EditorView.decorations.from(field),
})

export const changed_lines_extension = [baseline_field, changed_lines_field]
