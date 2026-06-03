import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

// html: true で生HTMLを許可するが、出力は必ず DOMPurify でサニタイズしてXSSを防ぐ
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
})

/**
 * Markdown文字列をサニタイズ済みのHTMLへ変換する。
 * 信頼できないローカル.mdファイル由来の内容を扱うため、サニタイズは必須。
 */
export function render_markdown(source: string): string {
  const raw_html = md.render(source ?? '')
  return DOMPurify.sanitize(raw_html)
}
