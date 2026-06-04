import { EditorState } from '@codemirror/state'
import {
  changed_line_set,
  changed_lines_extension,
  changed_lines_field,
  set_baseline,
} from './changedLines'

describe('changed_line_set', () => {
  it('同一内容なら変更行なし', () => {
    expect(changed_line_set('a\nb\nc', 'a\nb\nc').size).toBe(0)
  })

  it('変更された行を検出する（1始まり）', () => {
    expect([...changed_line_set('a\nb\nc', 'a\nB\nc')]).toEqual([2])
  })

  it('追加された行を検出する', () => {
    // a, b の間に new を挿入
    expect([...changed_line_set('a\nb', 'a\nnew\nb')]).toEqual([2])
  })

  it('行削除では current 側に変更行は出ない', () => {
    expect(changed_line_set('a\nb\nc', 'a\nc').size).toBe(0)
  })

  it('巨大ファイルは省略して空を返す', () => {
    const big = Array.from({ length: 2001 }, (_, i) => `line ${i}`).join('\n')
    expect(changed_line_set('x', big).size).toBe(0)
  })
})

describe('changed_lines_field', () => {
  function count(state: EditorState): number {
    const decorations = state.field(changed_lines_field)
    let total = 0
    decorations.between(0, state.doc.length, () => {
      total += 1
    })
    return total
  }

  it('baseline と異なる行に装飾を付ける', () => {
    let state = EditorState.create({ doc: 'a\nB\nc', extensions: changed_lines_extension })
    state = state.update({ effects: set_baseline.of('a\nb\nc') }).state
    expect(count(state)).toBe(1)
  })

  it('baseline と一致すれば装飾なし', () => {
    let state = EditorState.create({ doc: 'a\nb\nc', extensions: changed_lines_extension })
    state = state.update({ effects: set_baseline.of('a\nb\nc') }).state
    expect(count(state)).toBe(0)
  })
})
