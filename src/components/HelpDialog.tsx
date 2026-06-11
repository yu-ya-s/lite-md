import { useEffect, useRef } from 'react'

type HelpDialogProps = {
  open: boolean
  on_close: () => void
}

export function HelpDialog({ open, on_close }: HelpDialogProps) {
  const close_ref = useRef<HTMLButtonElement>(null)
  const previously_focused = useRef<HTMLElement | null>(null)

  // 開いたら閉じるボタンへフォーカスし、閉じたら元の要素へフォーカスを戻す
  useEffect(() => {
    if (open) {
      previously_focused.current = document.activeElement as HTMLElement | null
      close_ref.current?.focus()
    } else {
      previously_focused.current?.focus?.()
    }
  }, [open])

  // Esc で閉じる
  useEffect(() => {
    if (!open) return
    const on_keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        on_close()
      }
    }
    window.addEventListener('keydown', on_keydown)
    return () => window.removeEventListener('keydown', on_keydown)
  }, [open, on_close])

  if (!open) {
    return null
  }

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="ヘルプ" onClick={on_close}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <div className="dialog__header">
          <h2 className="dialog__title">ヘルプ</h2>
          <button
            type="button"
            className="dialog__close"
            aria-label="閉じる"
            ref={close_ref}
            onClick={on_close}
          >
            ✕
          </button>
        </div>

        <div className="dialog__body">
          <section className="settings__section">
            <h3 className="settings__heading">ファイルを開く</h3>
            <ul className="settings__list">
              <li>左の ☰ サイドバーからフォルダを選択（Chrome / Edge など Chromium 系のみ対応）</li>
            </ul>
            <p className="settings__note">Firefox / Safari では単一ファイルの読み込みのみ対応します。</p>
          </section>

          <section className="settings__section">
            <h3 className="settings__heading">編集と保存</h3>
            <ul className="settings__list">
              <li>既定は手動保存（<code>Ctrl+S</code> または 💾 ボタン）</li>
              <li>設定（⚙）から自動保存に変更可能</li>
              <li>変更行は保存時点からの差分としてハイライト</li>
            </ul>
          </section>

          <section className="settings__section">
            <h3 className="settings__heading">表示</h3>
            <ul className="settings__list">
              <li>👁 / ◧ で表示モード切替（エディタ＋プレビュー / プレビューのみ）</li>
              <li>中央の区切りをドラッグまたは矢印キーで幅調整</li>
            </ul>
          </section>

          <section className="settings__section">
            <h3 className="settings__heading">書式ショートカット</h3>
            <ul className="settings__list">
              <li><code>Ctrl+B</code> 太字</li>
              <li><code>Ctrl+I</code> 斜体</li>
              <li><code>Ctrl+K</code> リンク</li>
              <li>エディタ上部の書式ツールバーからも挿入可能</li>
            </ul>
          </section>

          <section className="settings__section">
            <h3 className="settings__heading">サイドバー</h3>
            <ul className="settings__list">
              <li>複数フォルダを同時に開ける</li>
              <li>✎ でラベル編集・↻ で再読み込み</li>
              <li>【済】フィルタで処理済みファイルの表示切替</li>
            </ul>
          </section>

          <section className="settings__section">
            <h3 className="settings__heading">処理済みトグル</h3>
            <ul className="settings__list">
              <li>「済」ボタンで現在のファイル名の先頭に【済】を付け外し</li>
            </ul>
          </section>

          <section className="settings__section">
            <h3 className="settings__heading">図</h3>
            <ul className="settings__list">
              <li>Mermaid はブラウザ内で描画</li>
              <li>PlantUML は設定（⚙）で有効化・サーバー指定</li>
            </ul>
          </section>

          <section className="settings__section">
            <h3 className="settings__heading">プライバシー</h3>
            <p className="settings__note">
              文書本文・ローカルファイルは外部に送信しません。読み書きはすべてブラウザ内で完結します。PlantUML を有効にした場合のみ図ソースが設定サーバーへ送信されます。
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
