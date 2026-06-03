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
      current_path: null,
      save_status: 'idle',
      is_supported: false,
      tree: [],
      folder_name: null,
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
})
