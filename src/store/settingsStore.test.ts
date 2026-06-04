import { useSettingsStore } from './settingsStore'

const DEFAULT_SERVER = 'https://www.plantuml.com/plantuml'

describe('settingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettingsStore.setState({
      plantuml_enabled: true,
      plantuml_server: DEFAULT_SERVER,
      save_mode: 'manual',
    })
  })

  it('デフォルトでPlantUMLは有効・公式サーバー・手動保存', () => {
    const state = useSettingsStore.getState()
    expect(state.plantuml_enabled).toBe(true)
    expect(state.plantuml_server).toContain('plantuml.com')
    expect(state.save_mode).toBe('manual')
  })

  it('サーバーURLの変更がlocalStorageに永続化される', () => {
    useSettingsStore.getState().set_plantuml_server('http://localhost:8080')
    expect(useSettingsStore.getState().plantuml_server).toBe('http://localhost:8080')
    expect(localStorage.getItem('lite-md:settings')).toContain('localhost:8080')
  })

  it('有効/無効の変更がlocalStorageに永続化される', () => {
    useSettingsStore.getState().set_plantuml_enabled(false)
    expect(useSettingsStore.getState().plantuml_enabled).toBe(false)
    expect(JSON.parse(localStorage.getItem('lite-md:settings') ?? '{}').plantuml_enabled).toBe(false)
  })

  it('保存モードの変更がlocalStorageに永続化される', () => {
    useSettingsStore.getState().set_save_mode('auto')
    expect(useSettingsStore.getState().save_mode).toBe('auto')
    expect(JSON.parse(localStorage.getItem('lite-md:settings') ?? '{}').save_mode).toBe('auto')
  })
})
