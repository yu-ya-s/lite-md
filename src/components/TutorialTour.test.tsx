import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TutorialTour } from './TutorialTour'

// jsdom では offsetParent が常に null、getBoundingClientRect が全0を返すため、
// ツアーが描画される状態を作るためのヘルパ関数を定義する

// 復元用に jsdom 本来の offsetParent ディスクリプタを保持する
const offset_parent_descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')

function enable_all_visible(): () => void {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return document.body
    },
  })
  const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    top: 100,
    right: 200,
    bottom: 140,
    width: 100,
    height: 40,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  } as DOMRect)

  return () => {
    spy.mockRestore()
    if (offset_parent_descriptor) {
      Object.defineProperty(HTMLElement.prototype, 'offsetParent', offset_parent_descriptor)
    } else {
      delete (HTMLElement.prototype as unknown as { offsetParent?: unknown }).offsetParent
    }
  }
}

function make_invisible(el: HTMLElement): void {
  Object.defineProperty(el, 'offsetParent', {
    configurable: true,
    get() {
      return null
    },
  })
}

// テスト対象の6ステップに対応する target_id
const ALL_TARGET_IDS = [
  'js-tour-open-folder',
  'js-tour-format-toolbar',
  'js-tour-actions',
  'js-tour-view-mode',
  'js-tour-settings',
  'js-tour-help',
]

function insert_all_targets(): HTMLElement[] {
  return ALL_TARGET_IDS.map((id) => {
    const btn = document.createElement('button')
    btn.id = id
    document.body.appendChild(btn)
    return btn
  })
}

function insert_targets(ids: string[]): HTMLElement[] {
  return ids.map((id) => {
    const btn = document.createElement('button')
    btn.id = id
    document.body.appendChild(btn)
    return btn
  })
}

describe('TutorialTour', () => {
  let restore_visibility: (() => void) | null = null

  afterEach(() => {
    restore_visibility?.()
    restore_visibility = null
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('active=false では何も描画しない', () => {
    const on_close = vi.fn()
    render(<TutorialTour active={false} on_close={on_close} />)
    expect(screen.queryByRole('dialog', { name: 'チュートリアル' })).toBeNull()
    expect(on_close).not.toHaveBeenCalled()
  })

  it('active=true で先頭の可視ステップ（フォルダを開く）が表示される', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    render(<TutorialTour active={true} on_close={() => {}} />)
    const dialog = await screen.findByRole('dialog', { name: 'チュートリアル' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('フォルダを開く')).toBeInTheDocument()
    expect(dialog.className).toContain('tour-popover--right')
  })

  it('aria 属性が正しく設定されている（aria-modal / aria-label）', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    render(<TutorialTour active={true} on_close={() => {}} />)
    const dialog = await screen.findByRole('dialog', { name: 'チュートリアル' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'チュートリアル')
  })

  it('スポットライト div.tour-spotlight が aria-hidden で描画され style に非ゼロ width/height を持つ', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    const { container } = render(<TutorialTour active={true} on_close={() => {}} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    // raf による rect 更新を待つ
    const spotlight = container.querySelector<HTMLElement>('.tour-spotlight')
    expect(spotlight).toBeInTheDocument()
    expect(spotlight).toHaveAttribute('aria-hidden', 'true')
    await waitFor(() => {
      const style = spotlight!.style
      const width_val = parseFloat(style.width)
      const height_val = parseFloat(style.height)
      expect(width_val).toBeGreaterThan(0)
      expect(height_val).toBeGreaterThan(0)
    })
  })

  it('閉じるボタン（チュートリアルを閉じる）クリックで on_close を 1 回呼ぶ', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    const on_close = vi.fn()
    render(<TutorialTour active={true} on_close={on_close} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    fireEvent.click(screen.getByRole('button', { name: 'チュートリアルを閉じる' }))
    expect(on_close).toHaveBeenCalledTimes(1)
  })

  it('「次へ」クリックで次の可視ステップ（書式ツールバー・tour-popover--bottom）へ進む', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    render(<TutorialTour active={true} on_close={() => {}} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    expect(screen.getByText('フォルダを開く')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '次のステップへ' }))
    await waitFor(() => {
      expect(screen.getByText('書式ツールバー')).toBeInTheDocument()
    })
    const dialog = screen.getByRole('dialog', { name: 'チュートリアル' })
    expect(dialog.className).toContain('tour-popover--bottom')
  })

  it('全6可視で「次へ」5回押すとステップ6（ヘルプ）→ ボタンが「完了」になる', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    render(<TutorialTour active={true} on_close={() => {}} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: '次のステップへ' }))
    }
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'チュートリアルを完了' })).toBeInTheDocument()
    })
    expect(screen.getByText('ヘルプ')).toBeInTheDocument()
  })

  it('完了ボタンクリックで on_close を呼ぶ', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    const on_close = vi.fn()
    render(<TutorialTour active={true} on_close={on_close} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: '次のステップへ' }))
    }
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'チュートリアルを完了' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'チュートリアルを完了' }))
    expect(on_close).toHaveBeenCalledTimes(1)
  })

  it('進捗が「1 / 6」→「次へ」1回で「2 / 6」になる', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    render(<TutorialTour active={true} on_close={() => {}} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    const progress_el = await waitFor(() => {
      const el = document.querySelector('.tour-popover__progress')
      expect(el?.textContent?.trim()).toBe('1 / 6')
      return el
    })
    expect(progress_el).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '次のステップへ' }))
    await waitFor(() => {
      expect(document.querySelector('.tour-popover__progress')?.textContent?.trim()).toBe('2 / 6')
    })
  })

  it('active 化時に次へ/完了ボタンへフォーカスが当たる', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    render(<TutorialTour active={true} on_close={() => {}} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: '次のステップへ' })
      expect(document.activeElement).toBe(btn)
    })
  })

  it('active true→false で previously_focused へフォーカスが復帰する', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    const prev_btn = document.createElement('button')
    prev_btn.id = 'js-prev-focus'
    document.body.appendChild(prev_btn)
    prev_btn.focus()
    expect(document.activeElement).toBe(prev_btn)

    const { rerender } = render(<TutorialTour active={true} on_close={() => {}} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })

    rerender(<TutorialTour active={false} on_close={() => {}} />)
    await waitFor(() => {
      expect(document.activeElement).toBe(prev_btn)
    })
    expect(screen.queryByRole('dialog', { name: 'チュートリアル' })).toBeNull()
  })

  it('全ステップ不可視で即 on_close が呼ばれ dialog が描画されない', async () => {
    // 全要素を DOM に挿入するが offsetParent=null のまま（enable_all_visible を呼ばない）
    insert_all_targets()
    // offsetParent のデフォルトは null のまま
    const on_close = vi.fn()
    render(<TutorialTour active={true} on_close={on_close} />)
    await waitFor(() => {
      expect(on_close).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('dialog', { name: 'チュートリアル' })).toBeNull()
  })

  it('一部要素のみ挿入可視（ステップ1・3・5）→ 表示「フォルダを開く」、進捗「1 / 3」', async () => {
    // ステップ1(open-folder)・3(actions)・5(settings) のみ挿入
    insert_targets(['js-tour-open-folder', 'js-tour-actions', 'js-tour-settings'])
    restore_visibility = enable_all_visible()
    render(<TutorialTour active={true} on_close={() => {}} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    expect(screen.getByText('フォルダを開く')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.querySelector('.tour-popover__progress')?.textContent?.trim()).toBe('1 / 3')
    })
    fireEvent.click(screen.getByRole('button', { name: '次のステップへ' }))
    await waitFor(() => {
      expect(screen.getByText('保存と処理済み')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(document.querySelector('.tour-popover__progress')?.textContent?.trim()).toBe('2 / 3')
    })
  })

  it('ステップ2のみ getBoundingClientRect 全0（width=height=0）→ ステップ2スキップ、総数5', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    // ステップ2（js-tour-format-toolbar）のみ getBoundingClientRect を全0に上書き
    // vi.spyOn だと継承先で見つかる prototype の既存モックがそのまま返り全要素に効いてしまうため、
    // 要素自身のプロパティとして上書きする
    const step2_el = document.getElementById('js-tour-format-toolbar')!
    step2_el.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    render(<TutorialTour active={true} on_close={() => {}} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    // 総数が5になることを確認
    await waitFor(() => {
      expect(document.querySelector('.tour-popover__progress')?.textContent?.trim()).toBe('1 / 5')
    })
    // 次へを押してステップ2がスキップされることを確認
    fireEvent.click(screen.getByRole('button', { name: '次のステップへ' }))
    await waitFor(() => {
      expect(screen.getByText('保存と処理済み')).toBeInTheDocument()
    })
  })

  it('ステップ2を width=50/height=0 → OR 条件で可視扱い、総数6', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    // ステップ2（js-tour-format-toolbar）を width=50/height=0 にする（width>0 で可視）
    // vi.spyOn だと prototype の既存モックに効いてしまうため要素自身のプロパティとして上書きする
    const step2_el = document.getElementById('js-tour-format-toolbar')!
    step2_el.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 100,
        right: 150,
        bottom: 100,
        width: 50,
        height: 0,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      }) as DOMRect
    render(<TutorialTour active={true} on_close={() => {}} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    // 総数が6（スキップなし）になることを確認
    await waitFor(() => {
      expect(document.querySelector('.tour-popover__progress')?.textContent?.trim()).toBe('1 / 6')
    })
  })

  it('スキップで current が連番（ステップ3・4不可視）→ 初期「1 / 4」、次へで「2 / 4」、もう1度でステップ5「3 / 4」', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    // ステップ3（js-tour-actions）・ステップ4（js-tour-view-mode）を不可視にする
    const step3_el = document.getElementById('js-tour-actions')!
    const step4_el = document.getElementById('js-tour-view-mode')!
    make_invisible(step3_el)
    make_invisible(step4_el)
    render(<TutorialTour active={true} on_close={() => {}} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    await waitFor(() => {
      expect(document.querySelector('.tour-popover__progress')?.textContent?.trim()).toBe('1 / 4')
    })
    fireEvent.click(screen.getByRole('button', { name: '次のステップへ' }))
    await waitFor(() => {
      expect(document.querySelector('.tour-popover__progress')?.textContent?.trim()).toBe('2 / 4')
    })
    fireEvent.click(screen.getByRole('button', { name: '次のステップへ' }))
    await waitFor(() => {
      expect(screen.getByText('設定')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(document.querySelector('.tour-popover__progress')?.textContent?.trim()).toBe('3 / 4')
    })
  })

  it('Esc キーで on_close を呼ぶ', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    const on_close = vi.fn()
    render(<TutorialTour active={true} on_close={on_close} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(on_close).toHaveBeenCalledTimes(1)
  })

  it('active=false 中の Esc では on_close が呼ばれない', () => {
    const on_close = vi.fn()
    render(<TutorialTour active={false} on_close={on_close} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(on_close).not.toHaveBeenCalled()
  })

  it('Escape 以外（Enter）では on_close が呼ばれない', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    const on_close = vi.fn()
    render(<TutorialTour active={true} on_close={on_close} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(on_close).not.toHaveBeenCalled()
  })

  it('ステップ1のみ可視で最初から「完了」、進捗「1 / 1」、クリックで on_close', async () => {
    insert_targets(['js-tour-open-folder'])
    restore_visibility = enable_all_visible()
    const on_close = vi.fn()
    render(<TutorialTour active={true} on_close={on_close} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'チュートリアルを完了' })).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(document.querySelector('.tour-popover__progress')?.textContent?.trim()).toBe('1 / 1')
    })
    fireEvent.click(screen.getByRole('button', { name: 'チュートリアルを完了' }))
    expect(on_close).toHaveBeenCalledTimes(1)
  })

  it('window resize で spotlight の style が更新される', async () => {
    insert_all_targets()
    restore_visibility = enable_all_visible()
    const { container } = render(<TutorialTour active={true} on_close={() => {}} />)
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    await waitFor(() => {
      const spotlight = container.querySelector<HTMLElement>('.tour-spotlight')
      expect(parseFloat(spotlight!.style.width)).toBeGreaterThan(0)
    })
    // getBoundingClientRect の戻り値を変更してリサイズ
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 200,
      top: 200,
      right: 400,
      bottom: 260,
      width: 200,
      height: 60,
      x: 200,
      y: 200,
      toJSON: () => ({}),
    } as DOMRect)
    fireEvent(window, new Event('resize'))
    await waitFor(() => {
      const spotlight = container.querySelector<HTMLElement>('.tour-spotlight')
      // width = 200 + 8 = 208
      expect(parseFloat(spotlight!.style.width)).toBe(208)
    })
  })
})
