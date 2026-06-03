import { render, screen } from '@testing-library/react'
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
})
