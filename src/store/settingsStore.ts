import { create } from 'zustand'

const STORAGE_KEY = 'lite-md:settings'
const DEFAULT_SERVER = 'https://www.plantuml.com/plantuml'

type Settings = {
  plantuml_enabled: boolean
  plantuml_server: string
}

function load_settings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>
      return {
        plantuml_enabled:
          typeof parsed.plantuml_enabled === 'boolean' ? parsed.plantuml_enabled : true,
        plantuml_server:
          typeof parsed.plantuml_server === 'string' ? parsed.plantuml_server : DEFAULT_SERVER,
      }
    }
  } catch {
    // 破損時は既定値にフォールバックする
  }
  return { plantuml_enabled: true, plantuml_server: DEFAULT_SERVER }
}

type SettingsState = Settings & {
  set_plantuml_enabled: (enabled: boolean) => void
  set_plantuml_server: (server: string) => void
}

function persist(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...load_settings(),

  set_plantuml_enabled: (enabled) => {
    set({ plantuml_enabled: enabled })
    persist({ plantuml_enabled: get().plantuml_enabled, plantuml_server: get().plantuml_server })
  },

  set_plantuml_server: (server) => {
    set({ plantuml_server: server })
    persist({ plantuml_enabled: get().plantuml_enabled, plantuml_server: get().plantuml_server })
  },
}))
