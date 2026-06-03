import { useSettingsStore } from './settingsStore'

const DEFAULT_SERVER = 'https://www.plantuml.com/plantuml'

describe('settingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettingsStore.setState({ plantuml_enabled: true, plantuml_server: DEFAULT_SERVER })
  })

  it('デフォルトでPlantUMLは有効・公式サーバー', () => {
    const state = useSettingsStore.getState()
    expect(state.plantuml_enabled).toBe(true)
    expect(state.plantuml_server).toContain('plantuml.com')
  })

  it('サーバーURLの変更がlocalStorageに永続化される', () => {
    useSettingsStore.getState().set_plantuml_server('http://localhost:8080')
    expect(useSettingsStore.getState().plantuml_server).toBe('http://localhost:8080')
    const raw = localStorage.getItem('lite-md:settings')
    expect(raw).toContain('localhost:8080')
  })

  it('有効/無効の変更がlocalStorageに永続化される', () => {
    useSettingsStore.getState().set_plantuml_enabled(false)
    expect(useSettingsStore.getState().plantuml_enabled).toBe(false)
    const raw = localStorage.getItem('lite-md:settings')
    expect(JSON.parse(raw ?? '{}').plantuml_enabled).toBe(false)
  })
})
