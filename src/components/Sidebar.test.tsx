import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { useWorkspaceStore } from '../store/workspaceStore'

const initial_state = useWorkspaceStore.getState()

describe('Sidebar', () => {
  beforeEach(() => {
    useWorkspaceStore.setState(initial_state, true)
  })

  it('未対応ブラウザではフォールバックの案内を表示する', () => {
    useWorkspaceStore.setState({ is_supported: false })
    render(<Sidebar />)
    expect(screen.getByText(/Chrome \/ Edge/)).toBeInTheDocument()
  })

  it('対応ブラウザでは「フォルダを開く」を表示し、クリックで open_folder を呼ぶ', () => {
    const open_folder = vi.fn(async () => {})
    useWorkspaceStore.setState({ is_supported: true, open_folder })
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'フォルダを開く' }))
    expect(open_folder).toHaveBeenCalled()
  })

  it('can_restore が true なら復元ボタンを表示する', () => {
    useWorkspaceStore.setState({ is_supported: true, can_restore: true })
    render(<Sidebar />)
    expect(screen.getByRole('button', { name: '前回のフォルダを開く' })).toBeInTheDocument()
  })

  it('フォルダを開いているとフォルダ名とツリーを表示する', () => {
    useWorkspaceStore.setState({
      is_supported: true,
      folder_name: 'my-notes',
      tree: [{ kind: 'file', name: 'a.md', path: 'a.md' }],
    })
    render(<Sidebar />)
    expect(screen.getByText('📁 my-notes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'a.md' })).toBeInTheDocument()
  })

  it('閉じるボタンで close_folder を呼ぶ', () => {
    const close_folder = vi.fn(async () => {})
    useWorkspaceStore.setState({ is_supported: true, folder_name: 'n', tree: [], close_folder })
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'フォルダを閉じる' }))
    expect(close_folder).toHaveBeenCalled()
  })

  it('復元ボタンのクリックで restore_folder を呼ぶ', () => {
    const restore_folder = vi.fn(async () => {})
    useWorkspaceStore.setState({ is_supported: true, can_restore: true, restore_folder })
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: '前回のフォルダを開く' }))
    expect(restore_folder).toHaveBeenCalled()
  })

  it('エラーがあれば表示する', () => {
    useWorkspaceStore.setState({ is_supported: true, error: '権限エラー' })
    render(<Sidebar />)
    expect(screen.getByText('権限エラー')).toBeInTheDocument()
  })

  it('フォールバックでファイルを読み込むと open_text を呼ぶ', async () => {
    const open_text = vi.fn()
    useWorkspaceStore.setState({ is_supported: false, open_text })
    const { container } = render(<Sidebar />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['# hi'], 'a.md', { type: 'text/markdown' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(open_text).toHaveBeenCalledWith('# hi'))
  })
})
