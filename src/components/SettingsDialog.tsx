import { useSettingsStore } from '../store/settingsStore'

type SettingsDialogProps = {
  open: boolean
  on_close: () => void
}

export function SettingsDialog({ open, on_close }: SettingsDialogProps) {
  const plantuml_enabled = useSettingsStore((s) => s.plantuml_enabled)
  const plantuml_server = useSettingsStore((s) => s.plantuml_server)
  const set_plantuml_enabled = useSettingsStore((s) => s.set_plantuml_enabled)
  const set_plantuml_server = useSettingsStore((s) => s.set_plantuml_server)

  if (!open) {
    return null
  }

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="設定" onClick={on_close}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <div className="dialog__header">
          <h2 className="dialog__title">設定</h2>
          <button type="button" className="dialog__close" aria-label="閉じる" onClick={on_close}>
            ✕
          </button>
        </div>

        <div className="dialog__body">
          <section className="settings__section">
            <h3 className="settings__heading">PlantUML</h3>

            <label className="settings__row">
              <input
                type="checkbox"
                checked={plantuml_enabled}
                onChange={(event) => set_plantuml_enabled(event.target.checked)}
              />
              PlantUML描画を有効にする
            </label>

            <label className="settings__field">
              レンダリングサーバー
              <input
                type="url"
                className="settings__input"
                value={plantuml_server}
                onChange={(event) => set_plantuml_server(event.target.value)}
              />
            </label>

            <p className="settings__note">
              注意: PlantUMLの図ソースは上記サーバーに送信されます（Mermaidや文書本文は送信されません）。
              プライバシーを重視する場合は <code>docker run -d -p 8080:8080 plantuml/plantuml-server</code>{' '}
              をローカルで起動し、サーバーに <code>http://localhost:8080</code> を指定してください。
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
