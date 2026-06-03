import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { useWorkspaceStore, type LoadedWorkspace } from '../store/workspaceStore'

const initial_state = useWorkspaceStore.getState()

function fake_workspace(id: string, name: string, tree: LoadedWorkspace['tree']): LoadedWorkspace {
  return { id, name, tree, handle: {} as FileSystemDirectoryHandle, workspace: {} as never }
}

describe('Sidebar', () => {
  beforeEach(() => {
    useWorkspaceStore.setState(initial_state, true)
  })

  it('未対応ブラウザではフォールバックの案内を表示する', () => {
    useWorkspaceStore.setState({ is_supported: false })
    render(<Sidebar />)
    expect(screen.getByText(/Chrome \/ Edge/)).toBeInTheDocument()
  })

  it('対応ブラウザでは「フォルダを追加」を表示し、クリックで add_folder を呼ぶ', () => {
    const add_folder = vi.fn(async () => {})
    useWorkspaceStore.setState({ is_supported: true, add_folder })
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'フォルダを追加' }))
    expect(add_folder).toHaveBeenCalled()
  })

  it('can_restore が true なら復元ボタンを表示する', () => {
    useWorkspaceStore.setState({ is_supported: true, can_restore: true })
    render(<Sidebar />)
    expect(screen.getByRole('button', { name: '前回のフォルダを開く' })).toBeInTheDocument()
  })

  it('複数フォルダを名前とツリー付きで並べて表示する', () => {
    useWorkspaceStore.setState({
      is_supported: true,
      workspaces: [
        fake_workspace('ws-1', 'notes', [{ kind: 'file', name: 'a.md', path: 'a.md' }]),
        fake_workspace('ws-2', 'docs', [{ kind: 'file', name: 'b.md', path: 'b.md' }]),
      ],
    })
    render(<Sidebar />)
    expect(screen.getByText('📁 notes')).toBeInTheDocument()
    expect(screen.getByText('📁 docs')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'a.md' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'b.md' })).toBeInTheDocument()
  })

  it('各フォルダの閉じるボタンで close_folder を呼ぶ', () => {
    const close_folder = vi.fn(async () => {})
    useWorkspaceStore.setState({
      is_supported: true,
      close_folder,
      workspaces: [fake_workspace('ws-1', 'notes', [])],
    })
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'notes を閉じる' }))
    expect(close_folder).toHaveBeenCalledWith('ws-1')
  })

  it('復元ボタンのクリックで restore_folders を呼ぶ', () => {
    const restore_folders = vi.fn(async () => {})
    useWorkspaceStore.setState({ is_supported: true, can_restore: true, restore_folders })
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: '前回のフォルダを開く' }))
    expect(restore_folders).toHaveBeenCalled()
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
