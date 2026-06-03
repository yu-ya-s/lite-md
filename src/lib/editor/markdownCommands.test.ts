import { EditorSelection, EditorState } from '@codemirror/state'
import { wrap_selection, toggle_line_prefix, insert_link } from './markdownCommands'

type SpecFn = (state: EditorState) => ReturnType<typeof wrap_selection>

function apply(doc: string, from: number, to: number, fn: SpecFn) {
  const state = EditorState.create({ doc, selection: EditorSelection.single(from, to) })
  const tr = state.update(fn(state))
  return {
    text: tr.newDoc.toString(),
    from: tr.state.selection.main.from,
    to: tr.state.selection.main.to,
  }
}

describe('wrap_selection', () => {
  it('選択範囲を太字で囲む', () => {
    const result = apply('hello', 0, 5, (s) => wrap_selection(s, '**'))
    expect(result.text).toBe('**hello**')
    // 元のテキストが選択されたまま
    expect(result.text.slice(result.from, result.to)).toBe('hello')
  })

  it('すでに太字なら外す', () => {
    const result = apply('**hello**', 2, 7, (s) => wrap_selection(s, '**'))
    expect(result.text).toBe('hello')
  })

  it('選択無しではマーカーだけ挿入しカーソルを中央に置く', () => {
    const result = apply('', 0, 0, (s) => wrap_selection(s, '**'))
    expect(result.text).toBe('****')
    expect(result.from).toBe(2)
    expect(result.to).toBe(2)
  })
})

describe('toggle_line_prefix', () => {
  it('行頭に見出しを付ける', () => {
    const result = apply('line', 0, 0, (s) => toggle_line_prefix(s, '# '))
    expect(result.text).toBe('# line')
  })

  it('すでに見出しなら外す', () => {
    const result = apply('# line', 0, 0, (s) => toggle_line_prefix(s, '# '))
    expect(result.text).toBe('line')
  })

  it('複数行に箇条書きを付ける', () => {
    const result = apply('a\nb', 0, 3, (s) => toggle_line_prefix(s, '- '))
    expect(result.text).toBe('- a\n- b')
  })
})

describe('insert_link', () => {
  it('選択無しではプレースホルダのリンクを挿入する', () => {
    const result = apply('', 0, 0, insert_link)
    expect(result.text).toBe('[リンクテキスト](url)')
  })

  it('選択をリンクテキストにし url を選択状態にする', () => {
    const result = apply('text', 0, 4, insert_link)
    expect(result.text).toBe('[text](url)')
    expect(result.text.slice(result.from, result.to)).toBe('url')
  })
})
