import { render, screen, fireEvent } from '@testing-library/react'
import { HelpDialog } from './HelpDialog'

describe('HelpDialog', () => {
  afterEach(() => {
    localStorage.clear()
  })

  // テスト 1: open=true でダイアログが表示される
  it('open=true でダイアログとタイトルが表示される', () => {
    render(<HelpDialog open on_close={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'ヘルプ' })).toBeInTheDocument()
    expect(screen.getByText('ヘルプ')).toBeInTheDocument()
  })

  // テスト 2: 閉じるボタンクリックで on_close が呼ばれる
  it('閉じるボタンクリックで on_close を呼ぶ', () => {
    const on_close = vi.fn()
    render(<HelpDialog open on_close={on_close} />)
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(on_close).toHaveBeenCalledTimes(1)
  })

  // テスト 3: Esc キーで on_close が呼ばれる
  it('Esc キーで on_close を呼ぶ', () => {
    const on_close = vi.fn()
    render(<HelpDialog open on_close={on_close} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(on_close).toHaveBeenCalledTimes(1)
  })

  // テスト 4: オーバーレイクリックで on_close が呼ばれる
  it('オーバーレイクリックで on_close を呼ぶ', () => {
    const on_close = vi.fn()
    render(<HelpDialog open on_close={on_close} />)
    fireEvent.click(screen.getByRole('dialog', { name: 'ヘルプ' }))
    expect(on_close).toHaveBeenCalledTimes(1)
  })

  // テスト 5: 本文クリックでは on_close を呼ばない（stopPropagation）
  it('本文内クリックでは on_close を呼ばない', () => {
    const on_close = vi.fn()
    render(<HelpDialog open on_close={on_close} />)
    const heading = screen.getByRole('heading', { level: 3, name: 'ファイルを開く' })
    fireEvent.click(heading)
    expect(on_close).not.toHaveBeenCalled()
  })

  // テスト 6: 主要セクション見出し 8 件が表示される
  it('主要セクション見出しを 8 件表示する', () => {
    render(<HelpDialog open on_close={() => {}} />)
    const headings = [
      'ファイルを開く',
      '編集と保存',
      '表示',
      '書式ショートカット',
      'サイドバー',
      '処理済みトグル',
      '図',
      'プライバシー',
    ]
    for (const name of headings) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument()
    }
  })

  // テスト 7: 開いたとき閉じるボタンにフォーカスが当たる
  it('open=true で閉じるボタンにフォーカスが当たる', () => {
    render(<HelpDialog open on_close={() => {}} />)
    const close_btn = screen.getByRole('button', { name: '閉じる' })
    expect(document.activeElement).toBe(close_btn)
  })

  // テスト 8: open=false で何も描画しない
  it('open=false で何も描画しない', () => {
    const { container } = render(<HelpDialog open={false} on_close={() => {}} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // テスト 9: open=false のとき Esc を押しても on_close を呼ばない
  it('open=false のとき Esc を押しても on_close を呼ばない', () => {
    const on_close = vi.fn()
    render(<HelpDialog open={false} on_close={on_close} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(on_close).not.toHaveBeenCalled()
  })

  // テスト 10: Escape 以外のキーでは on_close を呼ばない
  it('Enter キーでは on_close を呼ばない', () => {
    const on_close = vi.fn()
    render(<HelpDialog open on_close={on_close} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(on_close).not.toHaveBeenCalled()
  })

  // テスト 11: open=true→false の rerender でダイアログが消える
  it('open=true→false の rerender でダイアログが消える', () => {
    const { rerender } = render(<HelpDialog open on_close={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'ヘルプ' })).toBeInTheDocument()
    rerender(<HelpDialog open={false} on_close={() => {}} />)
    expect(screen.queryByRole('dialog', { name: 'ヘルプ' })).toBeNull()
  })
})
