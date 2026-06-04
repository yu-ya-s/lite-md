import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsDialog } from './SettingsDialog'
import { useSettingsStore } from '../store/settingsStore'

describe('SettingsDialog', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      plantuml_enabled: true,
      plantuml_server: 'https://www.plantuml.com/plantuml',
      save_mode: 'manual',
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

  it('有効チェックを切り替えられる', () => {
    render(<SettingsDialog open on_close={() => {}} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(useSettingsStore.getState().plantuml_enabled).toBe(false)
  })

  it('閉じるボタンで on_close を呼ぶ', () => {
    const on_close = vi.fn()
    render(<SettingsDialog open on_close={on_close} />)
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(on_close).toHaveBeenCalled()
  })
})
