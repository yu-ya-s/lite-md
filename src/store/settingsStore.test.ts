import { useSettingsStore, load_settings } from './settingsStore'

const DEFAULT_SERVER = 'https://www.plantuml.com/plantuml'

describe('settingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettingsStore.setState({
      plantuml_enabled: true,
      plantuml_server: DEFAULT_SERVER,
      save_mode: 'manual',
      allow_remote_images: false,
    })
  })

  it('デフォルトでPlantUMLは有効・公式サーバー・手動保存・外部画像オフ', () => {
    const state = useSettingsStore.getState()
    expect(state.plantuml_enabled).toBe(true)
    expect(state.plantuml_server).toContain('plantuml.com')
    expect(state.save_mode).toBe('manual')
    expect(state.allow_remote_images).toBe(false)
  })

  it('外部画像の許可設定がlocalStorageに永続化される', () => {
    useSettingsStore.getState().set_allow_remote_images(true)
    expect(useSettingsStore.getState().allow_remote_images).toBe(true)
    expect(JSON.parse(localStorage.getItem('lite-md:settings') ?? '{}').allow_remote_images).toBe(
      true,
    )
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

  describe('load_settings', () => {
    it('保存済みの値をそのまま読み込む', () => {
      localStorage.setItem(
        'lite-md:settings',
        JSON.stringify({
          plantuml_enabled: false,
          plantuml_server: 'http://x',
          save_mode: 'auto',
          allow_remote_images: true,
        }),
      )
      expect(load_settings()).toEqual({
        plantuml_enabled: false,
        plantuml_server: 'http://x',
        save_mode: 'auto',
        allow_remote_images: true,
      })
    })

    it('不正なJSONなら既定値にフォールバックする', () => {
      localStorage.setItem('lite-md:settings', '{壊れたJSON')
      const settings = load_settings()
      expect(settings.save_mode).toBe('manual')
      expect(settings.plantuml_enabled).toBe(true)
    })

    it('一部のキーが不正でも既定値で補完する', () => {
      localStorage.setItem(
        'lite-md:settings',
        JSON.stringify({ plantuml_server: 123, save_mode: 'unknown' }),
      )
      const settings = load_settings()
      expect(settings.plantuml_enabled).toBe(true)
      expect(settings.plantuml_server).toContain('plantuml.com')
      expect(settings.save_mode).toBe('manual')
    })

    it('未保存なら既定値を返す', () => {
      localStorage.clear()
      expect(load_settings()).toEqual({
        plantuml_enabled: true,
        plantuml_server: DEFAULT_SERVER,
        save_mode: 'manual',
        allow_remote_images: false,
      })
    })
  })
})
