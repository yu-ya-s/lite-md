import { useEffect, useMemo, useRef } from 'react'
import { render_markdown } from '../lib/markdown/renderer'
import { render_diagrams } from '../lib/markdown/diagrams'
import { useSettingsStore } from '../store/settingsStore'

type PreviewProps = {
  markdown: string
}

export function Preview({ markdown }: PreviewProps) {
  const html = useMemo(() => render_markdown(markdown), [markdown])
  const plantuml_enabled = useSettingsStore((s) => s.plantuml_enabled)
  const plantuml_server = useSettingsStore((s) => s.plantuml_server)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current
    if (container) {
      void render_diagrams(container, { plantuml_enabled, plantuml_server })
    }
  }, [html, plantuml_enabled, plantuml_server])

  return (
    <div
      ref={ref}
      className="preview markdown-body"
      // render_markdown 内で DOMPurify によりサニタイズ済みのHTMLのみを描画する
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
