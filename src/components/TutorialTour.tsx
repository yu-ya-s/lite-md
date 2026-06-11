import { useEffect, useRef, useState, type CSSProperties } from 'react'

export type TutorialTourProps = { active: boolean; on_close: () => void }

type TourPlacement = 'bottom' | 'right'
type TourStep = { target_id: string; title?: string; body: string; placement: TourPlacement }

const TOUR_STEPS: TourStep[] = [
  {
    target_id: 'js-tour-open-folder',
    placement: 'right',
    title: 'フォルダを開く',
    body: 'ローカルフォルダを開いて .md ファイルを編集します。\nChromium 系（Chrome / Edge）のみ対応。Firefox / Safari は単一ファイルの読み込みのみです。',
  },
  {
    target_id: 'js-tour-format-toolbar',
    placement: 'bottom',
    title: '書式ツールバー',
    body: '見出しや太字などを挿入できます。\nCtrl+B 太字 / Ctrl+I 斜体 / Ctrl+K リンク',
  },
  {
    target_id: 'js-tour-actions',
    placement: 'bottom',
    title: '保存と処理済み',
    body: '保存（💾）と「済」はファイルを開くと表示されます。\n既定は手動保存（Ctrl+S）。「済」でファイル名に【済】を付け外しします。',
  },
  {
    target_id: 'js-tour-view-mode',
    placement: 'bottom',
    title: '表示モード切替',
    body: 'エディタ＋プレビュー / プレビューのみ を切り替えます。',
  },
  {
    target_id: 'js-tour-settings',
    placement: 'bottom',
    title: '設定',
    body: '自動保存・PlantUML・外部画像の読み込みなどを設定できます。',
  },
  {
    target_id: 'js-tour-help',
    placement: 'bottom',
    title: 'ヘルプ',
    body: 'このチュートリアルはいつでもここから再表示できます。\n文書やファイルは外部に送信されません。',
  },
]

// 位置計算のデフォルト幅（CSS の min(320px, 90vw) と揃える）
const POPOVER_DEFAULT_WIDTH = 320
// right 配置の top clamp で使う概算高さ
const POPOVER_APPROX_HEIGHT = 200

export function is_visible(el: HTMLElement | null): el is HTMLElement {
  if (!el) return false
  if (el.offsetParent === null) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 || r.height > 0
}

function find_next_visible_index(from: number): number {
  for (let i = from; i < TOUR_STEPS.length; i++) {
    const el = document.getElementById(TOUR_STEPS[i].target_id)
    if (is_visible(el)) return i
  }
  return -1
}

export function TutorialTour({ active, on_close }: TutorialTourProps) {
  const [step_index, set_step_index] = useState(0)
  const [rect, set_rect] = useState<DOMRect | null>(null)
  // visible なステップ総数と現在位置（レンダー中の DOM 走査を避けるため state 化）
  const [visible_total, set_visible_total] = useState(TOUR_STEPS.length)
  const [visible_current, set_visible_current] = useState(1)
  const next_btn_ref = useRef<HTMLButtonElement>(null)
  const previously_focused = useRef<HTMLElement | null>(null)
  // リサイズ等による rect 更新のたびに再フォーカスしないよう、フォーカス済みステップを覚える
  const focused_step = useRef(-1)

  // active が true になったとき初期ステップを決定する
  useEffect(() => {
    if (!active) {
      focused_step.current = -1
      set_rect(null)
      previously_focused.current?.focus?.()
      return
    }

    previously_focused.current = document.activeElement as HTMLElement | null

    const first = find_next_visible_index(0)
    if (first === -1) {
      on_close()
      return
    }
    set_step_index(first)
  }, [active, on_close])

  // step_index または active が変化したときに rect と進捗カウントを更新する
  useEffect(() => {
    if (!active) return

    const update_rect = () => {
      const el = document.getElementById(TOUR_STEPS[step_index].target_id)
      if (is_visible(el)) {
        set_rect(el.getBoundingClientRect())
      } else {
        set_rect(null)
      }

      // 進捗カウント更新
      let total = 0
      let current = 0
      for (let i = 0; i < TOUR_STEPS.length; i++) {
        const step_el = document.getElementById(TOUR_STEPS[i].target_id)
        if (is_visible(step_el)) {
          total++
          if (i <= step_index) current++
        }
      }
      set_visible_total(total || TOUR_STEPS.length)
      set_visible_current(current || 1)
    }

    update_rect()
    window.addEventListener('resize', update_rect)
    return () => window.removeEventListener('resize', update_rect)
  }, [active, step_index])

  // 吹き出しが描画されたら次へ/完了ボタンにフォーカスする（ステップごとに1回）
  useEffect(() => {
    if (active && rect && focused_step.current !== step_index) {
      focused_step.current = step_index
      next_btn_ref.current?.focus()
    }
  }, [active, step_index, rect])

  // Esc キーで閉じる
  useEffect(() => {
    if (!active) return
    const on_keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        on_close()
      }
    }
    window.addEventListener('keydown', on_keydown)
    return () => window.removeEventListener('keydown', on_keydown)
  }, [active, on_close])

  // 対象の位置が確定するまで（全ステップ不可視の場合を含む）は何も描画しない
  if (!active || !rect) return null

  const step = TOUR_STEPS[step_index]
  const is_last = find_next_visible_index(step_index + 1) === -1

  const handle_next = () => {
    if (is_last) {
      on_close()
      return
    }
    const next = find_next_visible_index(step_index + 1)
    if (next === -1) {
      on_close()
    } else {
      set_step_index(next)
    }
  }

  // 吹き出し位置計算
  const placement = step.placement
  const popover_width = Math.min(POPOVER_DEFAULT_WIDTH, window.innerWidth * 0.9)

  let pop_left: number
  let pop_top: number

  if (placement === 'bottom') {
    const raw_left = rect.left + rect.width / 2 - popover_width / 2
    pop_left = Math.min(Math.max(raw_left, 8), window.innerWidth - popover_width - 8)
    pop_top = rect.bottom + 8
  } else {
    // right
    pop_left = Math.min(rect.right + 8, window.innerWidth - popover_width - 8)
    const raw_top = rect.top + rect.height / 2 - POPOVER_APPROX_HEIGHT / 2
    pop_top = Math.min(Math.max(raw_top, 8), window.innerHeight - POPOVER_APPROX_HEIGHT - 8)
  }

  const spotlight_style: CSSProperties = {
    left: rect.left - 4,
    top: rect.top - 4,
    width: rect.width + 8,
    height: rect.height + 8,
  }

  const popover_style: CSSProperties = {
    left: pop_left,
    top: pop_top,
  }

  return (
    <>
      <div className="tour-spotlight" style={spotlight_style} aria-hidden="true" />
      <div
        className={`tour-popover tour-popover--${placement}`}
        style={popover_style}
        role="dialog"
        aria-label="チュートリアル"
        aria-modal="true"
      >
        <button
          type="button"
          className="tour-popover__close dialog__close"
          aria-label="チュートリアルを閉じる"
          onClick={on_close}
        >
          ✕
        </button>
        {step.title && <h3 className="tour-popover__title">{step.title}</h3>}
        <p className="tour-popover__body">{step.body}</p>
        <div className="tour-popover__footer">
          <span className="tour-popover__progress">
            {visible_current} / {visible_total}
          </span>
          <button
            type="button"
            className="tour-popover__next btn"
            ref={next_btn_ref}
            aria-label={is_last ? 'チュートリアルを完了' : '次のステップへ'}
            onClick={handle_next}
          >
            {is_last ? '完了' : '次へ'}
          </button>
        </div>
        <div className="tour-popover__arrow" aria-hidden="true" />
      </div>
    </>
  )
}
