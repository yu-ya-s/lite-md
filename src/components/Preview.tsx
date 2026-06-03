import { useEffect, useRef } from 'react'
import { render_markdown } from '../lib/markdown/renderer'
import { render_diagrams } from '../lib/markdown/diagrams'
import { useSettingsStore } from '../store/settingsStore'

type PreviewProps = {
  markdown: string
}

export function Preview({ markdown }: PreviewProps) {
  const plantuml_enabled = useSettingsStore((s) => s.plantuml_enabled)
  const plantuml_server = useSettingsStore((s) => s.plantuml_server)
  const ref = useRef<HTMLDivElement>(null)

  // HTML描画も図描画もこのeffect内で手動で行う。
  // React に innerHTML を管理させると、図描画（手動DOM書き換え）と衝突して
  // 描画済みの図が上書きで消えるため、プレビュー内部は React の管理外に置く。
  useEffect(() => {
    const container = ref.current
    if (!container) return
    container.innerHTML = render_markdown(markdown)
    void render_diagrams(container, { plantuml_enabled, plantuml_server })
  }, [markdown, plantuml_enabled, plantuml_server])

  return <div ref={ref} className="preview markdown-body" />
}
