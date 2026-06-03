import { render, screen } from '@testing-library/react'
import { SaveStatus } from './SaveStatus'
import { useWorkspaceStore } from '../store/workspaceStore'

const initial_state = useWorkspaceStore.getState()

describe('SaveStatus', () => {
  beforeEach(() => {
    useWorkspaceStore.setState(initial_state, true)
  })

  it('ファイル未選択時は何も表示しない', () => {
    const { container } = render(<SaveStatus />)
    expect(container).toBeEmptyDOMElement()
  })

  it('ファイル選択中はファイル名と保存状態を表示する', () => {
    useWorkspaceStore.setState({ current_path: 'docs/a.md', save_status: 'saved' })
    render(<SaveStatus />)
    expect(screen.getByText('a.md')).toBeInTheDocument()
    expect(screen.getByText('保存済み')).toBeInTheDocument()
  })
})
