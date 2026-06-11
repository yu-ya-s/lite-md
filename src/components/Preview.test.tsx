import { render, screen, fireEvent } from '@testing-library/react'
import { Preview } from './Preview'

describe('Preview', () => {
  it('Markdownをレンダリングして表示する', () => {
    render(<Preview markdown="# タイトル" />)
    expect(screen.getByRole('heading', { name: 'タイトル' })).toBeInTheDocument()
  })

  it('危険なスクリプトは描画しない', () => {
    const { container } = render(<Preview markdown={'<script>alert(1)</script>'} />)
    expect(container.querySelector('script')).toBeNull()
  })

  it('タスクリストをチェックボックスとして描画する', () => {
    render(<Preview markdown={'- [ ] 未完了\n- [x] 完了'} />)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(2)
    expect(boxes[0]).not.toBeChecked()
    expect(boxes[1]).toBeChecked()
  })

  it('チェックボックスのクリックで on_toggle_task が行番号付きで呼ばれる', () => {
    const on_toggle_task = vi.fn()
    render(
      <Preview markdown={'# 見出し\n\n- [ ] 1つ目\n- [x] 2つ目'} on_toggle_task={on_toggle_task} />,
    )
    const boxes = screen.getAllByRole('checkbox')
    fireEvent.click(boxes[1])
    expect(on_toggle_task).toHaveBeenCalledTimes(1)
    expect(on_toggle_task).toHaveBeenCalledWith(3)
  })

  it('on_toggle_task 未指定でもチェックボックスのクリックで例外を投げない', () => {
    render(<Preview markdown={'- [ ] タスク'} />)
    expect(() => fireEvent.click(screen.getByRole('checkbox'))).not.toThrow()
  })
})
