import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

// html: true で生HTMLを許可するが、出力は必ず DOMPurify でサニタイズしてXSSを防ぐ。
// シンタックスハイライトは初期バンドルを軽く保つため、描画後に diagrams.ts 側で
// highlight.js を遅延ロードして適用する（ここでは language-* クラスの付与のみ）。
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
})

const default_fence = md.renderer.rules.fence!

// mermaid / plantuml / uml のコードフェンスは、後段で非同期に描画するためのプレースホルダにする。
// 元のソースは data-source 属性に保持し、描画やプレビュー再生成で失われないようにする。
const DIAGRAM_LOADING = '図を描画中…'

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const info = token.info.trim().toLowerCase()
  // 元ソースは encodeURIComponent で data-source に保持（改行や記号を含めても属性に安全に収まる）。
  // 表示テキストは生ソースを出さず「描画中」表示にして、描画前のちらつきを防ぐ。
  const data_source = encodeURIComponent(token.content)

  if (info === 'mermaid') {
    return `<div class="lite-md-diagram lite-md-mermaid" data-source="${data_source}">${DIAGRAM_LOADING}</div>`
  }
  if (info === 'plantuml' || info === 'uml') {
    return `<div class="lite-md-diagram lite-md-plantuml" data-source="${data_source}">${DIAGRAM_LOADING}</div>`
  }
  return default_fence(tokens, idx, options, env, self)
}

// 外部画像ブロック用フック。allow_remote_images=false のとき http(s) の画像参照を無効化する。
// 「外部送信ゼロ」を守るため、プレビュー描画でトラッキング画像等が外部取得されるのを防ぐ。
let allow_remote_images = false

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (allow_remote_images) return
  const element = node as Element
  const tag = element.tagName
  if (tag === 'IMG' || tag === 'IMAGE') {
    for (const attr of ['src', 'xlink:href', 'href', 'srcset']) {
      const value = element.getAttribute(attr)
      if (value && /^https?:/i.test(value)) {
        element.removeAttribute(attr)
        element.setAttribute('data-blocked-src', value)
        if (tag === 'IMG' && !element.getAttribute('alt')) {
          element.setAttribute('alt', '🚫 外部画像（設定でブロック中）')
        }
      }
    }
  }
})

/**
 * Markdown文字列をサニタイズ済みのHTMLへ変換する。
 * 信頼できないローカル.mdファイル由来の内容を扱うため、サニタイズは必須。
 * allow_images=false（既定）では外部画像の参照を無効化する。
 */
export function render_markdown(source: string, allow_images = false): string {
  allow_remote_images = allow_images
  const raw_html = md.render(source ?? '')
  return DOMPurify.sanitize(raw_html)
}
