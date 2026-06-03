import { render, screen, fireEvent } from '@testing-library/react'
import { FileTree } from './FileTree'
import { useWorkspaceStore } from '../store/workspaceStore'
import type { TreeNode } from '../lib/storage/types'

const initial_open_file = useWorkspaceStore.getState().open_file

const tree: TreeNode[] = [
  {
    kind: 'directory',
    name: 'docs',
    path: 'docs',
    children: [{ kind: 'file', name: 'b.md', path: 'docs/b.md' }],
  },
  { kind: 'file', name: 'a.md', path: 'a.md' },
]

describe('FileTree', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ open_file: initial_open_file, current_path: null })
  })

  it('空のときは案内を表示する', () => {
    render(<FileTree nodes={[]} />)
    expect(screen.getByText('Markdownファイルがありません')).toBeInTheDocument()
  })

  it('ファイルとディレクトリを表示する', () => {
    render(<FileTree nodes={tree} />)
    expect(screen.getByRole('button', { name: 'a.md' })).toBeInTheDocument()
    expect(screen.getByText('b.md')).toBeInTheDocument()
  })

  it('ファイルをクリックすると open_file を呼ぶ', () => {
    const open_file = vi.fn(async () => {})
    useWorkspaceStore.setState({ open_file })
    render(<FileTree nodes={tree} />)
    fireEvent.click(screen.getByRole('button', { name: 'a.md' }))
    expect(open_file).toHaveBeenCalledWith('a.md')
  })

  it('ディレクトリのトグルで子の表示を切り替える', () => {
    render(<FileTree nodes={tree} />)
    expect(screen.getByText('b.md')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /docs/ }))
    expect(screen.queryByText('b.md')).toBeNull()
  })
})
