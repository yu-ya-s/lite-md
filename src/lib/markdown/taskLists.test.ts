import MarkdownIt from 'markdown-it'
import { task_lists_plugin, toggle_task_line } from './taskLists'

const md = new MarkdownIt().use(task_lists_plugin)

describe('task_lists_plugin', () => {
  it('- [ ] を未チェックのチェックボックスとして描画する', () => {
    const html = md.render('- [ ] 牛乳を買う')
    expect(html).toContain('<input class="task-list-checkbox" type="checkbox" data-line="0">')
    expect(html).toContain('class="task-list-item"')
    expect(html).toContain('牛乳を買う')
    expect(html).not.toContain('[ ]')
  })

  it('- [x] をチェック済みとして描画する', () => {
    const html = md.render('- [x] 完了タスク')
    expect(html).toContain('checked=""')
  })

  it('- [X]（大文字）もチェック済みとして描画する', () => {
    const html = md.render('- [X] 完了タスク')
    expect(html).toContain('checked=""')
  })

  it('data-line にソースの行番号（0始まり）を付与する', () => {
    const html = md.render('# 見出し\n\n- [ ] 1つ目\n- [x] 2つ目')
    expect(html).toContain('data-line="2"')
    expect(html).toContain('data-line="3"')
  })

  it('番号付きリスト（1. [ ]）でも変換する', () => {
    const html = md.render('1. [ ] 番号付きタスク')
    expect(html).toContain('task-list-checkbox')
  })

  it('ネストしたタスクも変換する', () => {
    const html = md.render('- [ ] 親\n  - [x] 子')
    expect(html.match(/task-list-checkbox/g)).toHaveLength(2)
    expect(html).toContain('data-line="1"')
  })

  it('空行区切りのルーズなリストでも変換する', () => {
    const html = md.render('- [ ] 1つ目\n\n- [x] 2つ目')
    expect(html.match(/task-list-checkbox/g)).toHaveLength(2)
  })

  it('タスクマーカーでない箇条書き（- [y] など）は変換しない', () => {
    const html = md.render('- [y] タスクではない\n- やること')
    expect(html).not.toContain('task-list-checkbox')
    expect(html).toContain('[y] タスクではない')
  })

  it('リスト外の [ ] は変換しない', () => {
    const html = md.render('[ ] 段落のテキスト')
    expect(html).not.toContain('task-list-checkbox')
  })

  it('マーカー直後に空白がない場合（- [ ]のみ等）は変換しない', () => {
    const html = md.render('- [ ]\n- [x]テキスト')
    expect(html).not.toContain('task-list-checkbox')
  })
})

describe('toggle_task_line', () => {
  it('未チェック行を [x] に反転する', () => {
    expect(toggle_task_line('- [ ] タスク', 0)).toBe('- [x] タスク')
  })

  it('チェック済み行を [ ] に反転する', () => {
    expect(toggle_task_line('- [x] タスク', 0)).toBe('- [ ] タスク')
  })

  it('大文字 [X] も [ ] に反転する', () => {
    expect(toggle_task_line('- [X] タスク', 0)).toBe('- [ ] タスク')
  })

  it('対象行のみ変更し他の行は保持する', () => {
    const source = '# 見出し\n\n- [ ] 1つ目\n- [ ] 2つ目'
    expect(toggle_task_line(source, 3)).toBe('# 見出し\n\n- [ ] 1つ目\n- [x] 2つ目')
  })

  it('インデント付き・別記号（* / +）・番号付きにも対応する', () => {
    expect(toggle_task_line('  - [ ] 子タスク', 0)).toBe('  - [x] 子タスク')
    expect(toggle_task_line('* [ ] アスタリスク', 0)).toBe('* [x] アスタリスク')
    expect(toggle_task_line('+ [ ] プラス', 0)).toBe('+ [x] プラス')
    expect(toggle_task_line('1. [ ] 番号', 0)).toBe('1. [x] 番号')
    expect(toggle_task_line('2) [ ] 括弧番号', 0)).toBe('2) [x] 括弧番号')
  })

  it('引用内のタスク（> - [ ]）にも対応する', () => {
    expect(toggle_task_line('> - [ ] 引用内', 0)).toBe('> - [x] 引用内')
  })

  it('タスク行でない場合は null を返す', () => {
    expect(toggle_task_line('- 普通の箇条書き', 0)).toBeNull()
    expect(toggle_task_line('テキスト [ ] あり', 0)).toBeNull()
  })

  it('行番号が範囲外・不正な場合は null を返す', () => {
    expect(toggle_task_line('- [ ] タスク', 1)).toBeNull()
    expect(toggle_task_line('- [ ] タスク', -1)).toBeNull()
    expect(toggle_task_line('- [ ] タスク', 0.5)).toBeNull()
  })
})
