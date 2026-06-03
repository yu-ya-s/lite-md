import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  it('アプリタイトルを表示する', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'lite-md' })).toBeInTheDocument()
  })

  it('エディタとプレビューの領域を表示する', () => {
    render(<App />)
    expect(screen.getByLabelText('エディタ')).toBeInTheDocument()
    expect(screen.getByLabelText('プレビュー')).toBeInTheDocument()
  })

  it('テーマ切替ボタンでテーマが切り替わる', async () => {
    const user = userEvent.setup()
    render(<App />)

    const before = document.documentElement.getAttribute('data-theme')
    await user.click(screen.getByRole('button', { name: /モードに切替/ }))
    const after = document.documentElement.getAttribute('data-theme')

    expect(after).toBeTruthy()
    expect(after).not.toBe(before)
  })
})
