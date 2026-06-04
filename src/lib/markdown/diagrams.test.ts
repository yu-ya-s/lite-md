vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (_id: string, source: string) => ({
      svg: `<svg data-len="${source.length}"></svg>`,
    })),
  },
}))

vi.mock('plantuml-encoder', () => ({
  default: {
    encode: (text: string) => `ENC${text.length}`,
    decode: (text: string) => text,
  },
}))

import { render_diagrams } from './diagrams'

function make_container(html: string): HTMLElement {
  const div = document.createElement('div')
  div.innerHTML = html
  return div
}

const ENABLED = { plantuml_enabled: true, plantuml_server: 'https://www.plantuml.com/plantuml' }

describe('render_diagrams', () => {
  it('mermaidノードをSVGに置き換える', async () => {
    const container = make_container(
      '<div class="lite-md-diagram lite-md-mermaid" data-source="sequenceDiagram">x</div>',
    )
    await render_diagrams(container, ENABLED)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('PlantUML有効時はサーバーURLのimgを生成する', async () => {
    const container = make_container(
      '<div class="lite-md-diagram lite-md-plantuml" data-source="@startuml@enduml">x</div>',
    )
    await render_diagrams(container, ENABLED)
    const image = container.querySelector('img')
    expect(image).not.toBeNull()
    expect(image?.getAttribute('src')).toBe('https://www.plantuml.com/plantuml/svg/ENC16')
  })

  it('PlantUML無効時はimgを作らず注記を表示する', async () => {
    const container = make_container(
      '<div class="lite-md-diagram lite-md-plantuml" data-source="@startuml@enduml">x</div>',
    )
    await render_diagrams(container, { plantuml_enabled: false, plantuml_server: 'https://x' })
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('未有効')
  })

  it('PlantUMLサーバーURLが http/https でなければ img を作らずエラー表示', async () => {
    const container = make_container(
      '<div class="lite-md-diagram lite-md-plantuml" data-source="@startuml@enduml">x</div>',
    )
    await render_diagrams(container, { plantuml_enabled: true, plantuml_server: 'javascript:alert(1)' })
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('不正')
  })

  it('サーバーURL末尾のスラッシュは正規化する', async () => {
    const container = make_container(
      '<div class="lite-md-diagram lite-md-plantuml" data-source="ab">x</div>',
    )
    await render_diagrams(container, { plantuml_enabled: true, plantuml_server: 'http://localhost:8080/' })
    expect(container.querySelector('img')?.getAttribute('src')).toBe('http://localhost:8080/svg/ENC2')
  })

  it('図が無ければ図要素を作らない', async () => {
    const container = make_container('<p>ただの段落</p>')
    await render_diagrams(container, ENABLED)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('言語付きコードブロックをハイライトする', async () => {
    const container = make_container(
      '<pre><code class="language-js">const x = 1</code></pre>',
    )
    await render_diagrams(container, ENABLED)
    const code = container.querySelector('code')
    expect(code?.classList.contains('hljs')).toBe(true)
    expect(code?.querySelector('span')).not.toBeNull()
  })
})
