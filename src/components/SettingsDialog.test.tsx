import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsDialog } from './SettingsDialog'
import { useSettingsStore } from '../store/settingsStore'

describe('SettingsDialog', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      plantuml_enabled: true,
      plantuml_server: 'https://www.plantuml.com/plantuml',
      save_mode: 'manual',
      allow_remote_images: false,
    })
  })

  it('保存モードを自動に切り替えられる', () => {
    render(<SettingsDialog open on_close={() => {}} />)
    fireEvent.click(screen.getByRole('radio', { name: /自動保存/ }))
    expect(useSettingsStore.getState().save_mode).toBe('auto')
  })

  it('open=false なら何も表示しない', () => {
    const { container } = render(<SettingsDialog open={false} on_close={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('PlantUMLサーバーURLを変更できる', () => {
    render(<SettingsDialog open on_close={() => {}} />)
    const input = screen.getByLabelText('レンダリングサーバー')
    fireEvent.change(input, { target: { value: 'http://localhost:8080' } })
    expect(useSettingsStore.getState().plantuml_server).toBe('http://localhost:8080')
  })

  it('PlantUML有効チェックを切り替えられる', () => {
    render(<SettingsDialog open on_close={() => {}} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /PlantUML描画/ }))
    expect(useSettingsStore.getState().plantuml_enabled).toBe(false)
  })

  it('外部画像の許可を切り替えられる', () => {
    render(<SettingsDialog open on_close={() => {}} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /外部画像/ }))
    expect(useSettingsStore.getState().allow_remote_images).toBe(true)
  })

  it('閉じるボタンで on_close を呼ぶ', () => {
    const on_close = vi.fn()
    render(<SettingsDialog open on_close={on_close} />)
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(on_close).toHaveBeenCalled()
  })

  it('Escキーで on_close を呼ぶ', () => {
    const on_close = vi.fn()
    render(<SettingsDialog open on_close={on_close} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(on_close).toHaveBeenCalled()
  })
})
