import { useMemo } from 'react'
import { render_markdown } from '../lib/markdown/renderer'

type PreviewProps = {
  markdown: string
}

export function Preview({ markdown }: PreviewProps) {
  const html = useMemo(() => render_markdown(markdown), [markdown])

  return (
    <div
      className="preview markdown-body"
      // render_markdown 内で DOMPurify によりサニタイズ済みのHTMLのみを描画する
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
