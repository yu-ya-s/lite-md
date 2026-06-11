import { render_markdown } from './renderer'

describe('render_markdown', () => {
  it('見出しを変換する', () => {
    expect(render_markdown('# Hello')).toContain('<h1>Hello</h1>')
  })

  it('強調を変換する', () => {
    expect(render_markdown('**bold**')).toContain('<strong>bold</strong>')
  })

  it('インラインコードを変換する', () => {
    expect(render_markdown('`code`')).toContain('<code>code</code>')
  })

  it('テーブルを変換する', () => {
    const table = '| a | b |\n| - | - |\n| 1 | 2 |'
    expect(render_markdown(table)).toContain('<table>')
  })

  it('scriptタグを除去する（XSS対策）', () => {
    expect(render_markdown('<script>alert(1)</script>')).not.toContain('<script>')
  })

  it('危険なイベントハンドラ属性を除去する', () => {
    expect(render_markdown('<img src=x onerror="alert(1)">')).not.toContain('onerror')
  })

  it('空文字でも例外を投げず空文字を返す', () => {
    expect(render_markdown('')).toBe('')
  })

  it('null/undefined を渡しても空文字を返す', () => {
    expect(render_markdown(undefined as unknown as string)).toBe('')
  })

  it('mermaidフェンスを図プレースホルダに変換する', () => {
    const html = render_markdown('```mermaid\ngraph TD; A-->B;\n```')
    expect(html).toContain('lite-md-mermaid')
    expect(html).toContain('data-source')
  })

  it('plantuml / uml フェンスを図プレースホルダに変換する', () => {
    expect(render_markdown('```plantuml\n@startuml\n@enduml\n```')).toContain('lite-md-plantuml')
    expect(render_markdown('```uml\n@startuml\n@enduml\n```')).toContain('lite-md-plantuml')
  })

  it('言語付きコードフェンスに language クラスを付与する（ハイライトは描画時）', () => {
    const html = render_markdown('```js\nconst x = 1\n```')
    expect(html).toContain('language-js')
  })

  it('既定では外部画像のsrcを無効化する（外部送信ゼロ）', () => {
    const html = render_markdown('![alt](https://tracker.example.com/pixel.gif)')
    // 実srcは消え、data-blocked-src に退避される（先頭スペース付きで実src属性のみを判定）
    expect(html).not.toContain(' src="https://tracker.example.com')
    expect(html).toContain('data-blocked-src="https://tracker.example.com')
  })

  it('allow_images=true なら外部画像を許可する', () => {
    const html = render_markdown('![alt](https://example.com/a.png)', true)
    expect(html).toContain('src="https://example.com/a.png"')
    expect(html).not.toContain('data-blocked-src')
  })

  it('data: 画像は既定でも許可する', () => {
    const html = render_markdown('![x](data:image/png;base64,iVBORw0KGgo=)')
    expect(html).toContain('src="data:image/png')
  })

  it('タスクリストをチェックボックスとして描画する（サニタイズ後も保持）', () => {
    const html = render_markdown('- [ ] 未完了\n- [x] 完了')
    expect(html).toContain('task-list-checkbox')
    expect(html).toContain('data-line="0"')
    expect(html).toContain('data-line="1"')
    expect(html).toContain('checked')
  })
})
