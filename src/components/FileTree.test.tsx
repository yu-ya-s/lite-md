import { render, screen, fireEvent } from '@testing-library/react'
import { FileTree } from './FileTree'
import { useWorkspaceStore } from '../store/workspaceStore'
import type { TreeNode } from '../lib/storage/types'

const initial_open_file = useWorkspaceStore.getState().open_file
const initial_toggle_done = useWorkspaceStore.getState().toggle_done

const tree: TreeNode[] = [
  {
    kind: 'directory',
    name: 'docs',
    path: 'docs',
    children: [{ kind: 'file', name: 'b.md', path: 'docs/b.md' }],
  },
  { kind: 'file', name: 'a.md', path: 'a.md' },
]

// 選択関連のアサーションが不要なテストで毎回渡す既定値
const no_selection = { selected: new Set<string>(), on_toggle_select: () => {} }

describe('FileTree', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      open_file: initial_open_file,
      toggle_done: initial_toggle_done,
      current: null,
    })
  })

  it('空のときは案内を表示する', () => {
    render(<FileTree workspace_id="ws-1" nodes={[]} {...no_selection} />)
    expect(screen.getByText('Markdownファイルがありません')).toBeInTheDocument()
  })

  it('ファイルとディレクトリを表示する', () => {
    render(<FileTree workspace_id="ws-1" nodes={tree} {...no_selection} />)
    expect(screen.getByRole('button', { name: 'a.md' })).toBeInTheDocument()
    expect(screen.getByText('b.md')).toBeInTheDocument()
  })

  it('ファイルをクリックすると workspace_id と path で open_file を呼ぶ', () => {
    const open_file = vi.fn(async () => {})
    useWorkspaceStore.setState({ open_file })
    render(<FileTree workspace_id="ws-7" nodes={tree} {...no_selection} />)
    fireEvent.click(screen.getByRole('button', { name: 'a.md' }))
    expect(open_file).toHaveBeenCalledWith('ws-7', 'a.md')
  })

  it('ディレクトリのトグルで子の表示を切り替える', () => {
    render(<FileTree workspace_id="ws-1" nodes={tree} {...no_selection} />)
    expect(screen.getByText('b.md')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /docs/ }))
    expect(screen.queryByText('b.md')).toBeNull()
  })

  it('各ファイル行に済ボタンを表示する', () => {
    render(<FileTree workspace_id="ws-1" nodes={tree} {...no_selection} />)
    expect(screen.getByRole('button', { name: 'a.md を処理済みにする' })).toBeInTheDocument()
  })

  it('済ボタンのクリックで対象の workspace_id と path を渡して toggle_done を呼ぶ', () => {
    const toggle_done = vi.fn(async () => {})
    useWorkspaceStore.setState({ toggle_done })
    render(<FileTree workspace_id="ws-9" nodes={tree} {...no_selection} />)
    fireEvent.click(screen.getByRole('button', { name: 'a.md を処理済みにする' }))
    expect(toggle_done).toHaveBeenCalledWith({ workspace_id: 'ws-9', path: 'a.md' })
  })

  it('【済】ファイルは解除ボタン（aria-pressed=true）として表示する', () => {
    const done_tree: TreeNode[] = [{ kind: 'file', name: '【済】a.md', path: '【済】a.md' }]
    render(<FileTree workspace_id="ws-1" nodes={done_tree} {...no_selection} />)
    const done_btn = screen.getByRole('button', { name: '【済】a.md の処理済みを解除' })
    expect(done_btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('未済ファイルにはチェックボックスが出て、クリックで path を渡して on_toggle_select を呼ぶ', () => {
    const on_toggle_select = vi.fn()
    render(
      <FileTree
        workspace_id="ws-1"
        nodes={tree}
        selected={new Set()}
        on_toggle_select={on_toggle_select}
      />,
    )
    const checkbox = screen.getByRole('checkbox', { name: 'a.md を選択' })
    fireEvent.click(checkbox)
    expect(on_toggle_select).toHaveBeenCalledWith('a.md')
  })

  it('【済】ファイルにはチェックボックスを表示しない', () => {
    const done_tree: TreeNode[] = [{ kind: 'file', name: '【済】a.md', path: '【済】a.md' }]
    render(<FileTree workspace_id="ws-1" nodes={done_tree} {...no_selection} />)
    expect(screen.queryByRole('checkbox', { name: '【済】a.md を選択' })).toBeNull()
  })
})
