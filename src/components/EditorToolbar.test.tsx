import { render, screen, fireEvent } from '@testing-library/react'
import { EditorToolbar } from './EditorToolbar'
import { bold_command } from '../lib/editor/markdownCommands'

describe('EditorToolbar', () => {
  it('書式ボタンを表示する', () => {
    render(<EditorToolbar run={() => {}} />)
    expect(screen.getByRole('button', { name: '太字 (Ctrl+B)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '見出し' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'リンク (Ctrl+K)' })).toBeInTheDocument()
  })

  it('ボタンクリックで対応するコマンドを run に渡す', () => {
    const run = vi.fn()
    render(<EditorToolbar run={run} />)
    fireEvent.click(screen.getByRole('button', { name: '太字 (Ctrl+B)' }))
    expect(run).toHaveBeenCalledWith(bold_command)
  })
})
