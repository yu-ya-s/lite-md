import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { useWorkspaceStore } from './store/workspaceStore'

// App は内部で CodeMirror を描画するため、jsdom で安定動作する textarea に差し替える
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) => (
    <textarea
      data-testid="cm-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

import App from './App'

describe('App', () => {
  beforeEach(() => {
    // ストアを既知の状態へ。init はテストでは副作用を起こさないよう no-op にする
    useWorkspaceStore.setState({
      content: '',
      current: null,
      save_status: 'idle',
      is_supported: false,
      workspaces: [],
      can_restore: false,
      init: async () => {},
    })
  })

  it('ツールバーにアプリタイトルを表示する', () => {
    render(<App />)
    const toolbar = screen.getByRole('banner')
    expect(within(toolbar).getByRole('heading', { name: 'lite-md' })).toBeInTheDocument()
  })

  it('エディタとプレビューの領域を表示する', () => {
    render(<App />)
    expect(screen.getByLabelText('エディタ')).toBeInTheDocument()
    expect(screen.getByLabelText('プレビュー')).toBeInTheDocument()
  })

  it('テーマ切替ボタンでテーマが切り替わる', () => {
    render(<App />)
    const before = document.documentElement.getAttribute('data-theme')
    fireEvent.click(screen.getByRole('button', { name: /モードに切替/ }))
    const after = document.documentElement.getAttribute('data-theme')
    expect(after).toBeTruthy()
    expect(after).not.toBe(before)
  })

  it('入力するとプレビューに反映される', async () => {
    render(<App />)
    fireEvent.change(screen.getByTestId('cm-editor'), {
      target: { value: '# 反映テスト' },
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '反映テスト' })).toBeInTheDocument()
    })
  })

  it('サイドバー切替ボタンでサイドバーを折りたためる', () => {
    render(<App />)
    const aside = screen.getByLabelText('ファイル一覧')
    expect(aside.className).not.toContain('app__sidebar--collapsed')
    fireEvent.click(screen.getByRole('button', { name: 'サイドバーの表示切替' }))
    expect(aside.className).toContain('app__sidebar--collapsed')
  })

  it('エディタとプレビューの間に区切り（separator）がある', () => {
    render(<App />)
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('区切りのドラッグでエディタ幅の比率が変わる', () => {
    render(<App />)
    const separator = screen.getByRole('separator')
    const main = separator.closest('.app__main') as HTMLElement
    main.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 1000,
        height: 0,
        right: 1000,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect

    fireEvent.pointerDown(separator)
    fireEvent.pointerMove(window, { clientX: 300 })
    expect(main.style.getPropertyValue('--editor-fr')).toBe('0.3fr')
    fireEvent.pointerUp(window)
  })
})
