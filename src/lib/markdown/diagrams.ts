// プレビュー内の図プレースホルダ（renderer.ts が生成）を非同期に実際の図へ描画する。
// mermaid はブラウザ内で描画し、PlantUML は設定したサーバーで画像化する。

export type DiagramOptions = {
  plantuml_enabled: boolean
  plantuml_server: string
}

let mermaid_promise: Promise<typeof import('mermaid').default> | null = null
let mermaid_counter = 0
const mermaid_cache = new Map<string, string>()

let hljs_promise: Promise<typeof import('highlight.js/lib/common').default> | null = null

async function load_hljs() {
  if (!hljs_promise) {
    hljs_promise = import('highlight.js/lib/common').then((module) => module.default)
  }
  return hljs_promise
}

async function highlight_code(container: HTMLElement) {
  const blocks = container.querySelectorAll<HTMLElement>(
    'pre code[class*="language-"]:not([data-highlighted])',
  )
  if (blocks.length === 0) return

  const hljs = await load_hljs()
  for (const block of blocks) {
    const lang_class = Array.from(block.classList).find((name) => name.startsWith('language-'))
    const lang = lang_class ? lang_class.slice('language-'.length) : ''
    if (!lang || !hljs.getLanguage(lang)) {
      block.dataset.highlighted = 'skip'
      continue
    }
    try {
      block.innerHTML = hljs.highlight(block.textContent ?? '', { language: lang }).value
      block.classList.add('hljs')
      block.dataset.highlighted = 'yes'
    } catch {
      block.dataset.highlighted = 'error'
    }
  }
}

async function load_mermaid() {
  if (!mermaid_promise) {
    mermaid_promise = import('mermaid').then((module) => {
      const mermaid = module.default
      const is_dark = document.documentElement.getAttribute('data-theme') === 'dark'
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: is_dark ? 'dark' : 'default',
      })
      return mermaid
    })
  }
  return mermaid_promise
}

function source_of(node: HTMLElement): string {
  const encoded = node.dataset.source
  if (encoded) {
    try {
      return decodeURIComponent(encoded)
    } catch {
      // 不正なエンコードならテキスト内容にフォールバック
    }
  }
  return node.textContent ?? ''
}

async function render_mermaid_nodes(container: HTMLElement) {
  const nodes = container.querySelectorAll<HTMLElement>('.lite-md-mermaid')
  if (nodes.length === 0) return

  const mermaid = await load_mermaid()
  for (const node of nodes) {
    const source = source_of(node)
    const cached = mermaid_cache.get(source)
    if (cached) {
      node.innerHTML = cached
      node.classList.add('lite-md-diagram--rendered')
      continue
    }

    const id = `lite-md-mermaid-${mermaid_counter++}`
    try {
      const { svg } = await mermaid.render(id, source)
      mermaid_cache.set(source, svg)
      node.innerHTML = svg
      node.classList.add('lite-md-diagram--rendered')
    } catch {
      node.textContent = 'Mermaidの構文エラーです'
      node.classList.add('lite-md-diagram--error')
      // mermaid が body に挿入した一時要素を掃除する
      document.getElementById(id)?.remove()
    }
  }
}

async function render_plantuml_nodes(container: HTMLElement, options: DiagramOptions) {
  const nodes = container.querySelectorAll<HTMLElement>('.lite-md-plantuml')
  if (nodes.length === 0) return

  if (!options.plantuml_enabled) {
    for (const node of nodes) {
      node.textContent = 'PlantUMLは未有効です（⚙設定から有効化してください）'
      node.classList.add('lite-md-diagram--note')
    }
    return
  }

  const { default: encoder } = await import('plantuml-encoder')
  const base = options.plantuml_server.replace(/\/+$/, '')

  for (const node of nodes) {
    const source = source_of(node)
    const encoded = encoder.encode(source)
    const image = document.createElement('img')
    image.src = `${base}/svg/${encoded}`
    image.alt = 'PlantUML図'
    image.className = 'lite-md-plantuml-img'
    node.innerHTML = ''
    node.appendChild(image)
    node.classList.add('lite-md-diagram--rendered')
  }
}

export async function render_diagrams(container: HTMLElement, options: DiagramOptions): Promise<void> {
  await Promise.all([
    render_mermaid_nodes(container),
    render_plantuml_nodes(container, options),
    highlight_code(container),
  ])
}
