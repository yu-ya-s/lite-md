import { render, screen, fireEvent } from '@testing-library/react'

// CodeMirror は jsdom 上でレイアウト計測ができず不安定なため、
// テストでは値と onChange の配線確認に集中できるよう textarea へ差し替える
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) => (
    <textarea
      data-testid="cm-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

import { Editor } from './Editor'

describe('Editor', () => {
  it('渡された値を表示する', () => {
    render(<Editor value="hello" on_change={() => {}} />)
    expect(screen.getByTestId('cm-editor')).toHaveValue('hello')
  })

  it('変更時に on_change を呼ぶ', () => {
    const on_change = vi.fn()
    render(<Editor value="hello" on_change={on_change} />)
    fireEvent.change(screen.getByTestId('cm-editor'), { target: { value: 'world' } })
    expect(on_change).toHaveBeenCalledWith('world')
  })
})
