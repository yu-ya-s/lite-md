import { useEffect, useRef } from 'react'
import { render_markdown } from '../lib/markdown/renderer'
import { render_diagrams } from '../lib/markdown/diagrams'
import { useSettingsStore } from '../store/settingsStore'
import { useThemeStore } from '../store/themeStore'

type PreviewProps = {
  markdown: string
  on_container?: (el: HTMLDivElement) => void
}

export function Preview({ markdown, on_container }: PreviewProps) {
  const plantuml_enabled = useSettingsStore((s) => s.plantuml_enabled)
  const plantuml_server = useSettingsStore((s) => s.plantuml_server)
  const allow_remote_images = useSettingsStore((s) => s.allow_remote_images)
  const theme = useThemeStore((s) => s.theme)
  const ref = useRef<HTMLDivElement>(null)

  // スクロール同期のため、スクロール対象の要素を親へ渡す
  useEffect(() => {
    if (ref.current) {
      on_container?.(ref.current)
    }
  }, [on_container])

  // HTML描画も図描画もこのeffect内で手動で行う。
  // React に innerHTML を管理させると、図描画（手動DOM書き換え）と衝突して
  // 描画済みの図が上書きで消えるため、プレビュー内部は React の管理外に置く。
  // theme を依存に含めるのは、テーマ切替時に Mermaid を新テーマで再描画するため。
  useEffect(() => {
    const container = ref.current
    if (!container) return
    let stale = false
    container.innerHTML = render_markdown(markdown, allow_remote_images)
    void render_diagrams(container, { plantuml_enabled, plantuml_server }, () => stale)
    return () => {
      stale = true
    }
  }, [markdown, plantuml_enabled, plantuml_server, allow_remote_images, theme])

  return <div ref={ref} className="preview markdown-body" />
}
