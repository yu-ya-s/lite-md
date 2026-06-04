import { create } from 'zustand'

const STORAGE_KEY = 'lite-md:settings'
const DEFAULT_SERVER = 'https://www.plantuml.com/plantuml'

export type SaveMode = 'manual' | 'auto'

type Settings = {
  plantuml_enabled: boolean
  plantuml_server: string
  save_mode: SaveMode
  allow_remote_images: boolean
}

const DEFAULTS: Settings = {
  plantuml_enabled: true,
  plantuml_server: DEFAULT_SERVER,
  save_mode: 'manual',
  // 外部送信ゼロを守るため、外部画像は既定で読み込まない
  allow_remote_images: false,
}

export function load_settings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>
      return {
        plantuml_enabled:
          typeof parsed.plantuml_enabled === 'boolean'
            ? parsed.plantuml_enabled
            : DEFAULTS.plantuml_enabled,
        plantuml_server:
          typeof parsed.plantuml_server === 'string'
            ? parsed.plantuml_server
            : DEFAULTS.plantuml_server,
        save_mode: parsed.save_mode === 'auto' ? 'auto' : 'manual',
        allow_remote_images:
          typeof parsed.allow_remote_images === 'boolean' ? parsed.allow_remote_images : false,
      }
    }
  } catch {
    // 破損時は既定値にフォールバックする
  }
  return { ...DEFAULTS }
}

type SettingsState = Settings & {
  set_plantuml_enabled: (enabled: boolean) => void
  set_plantuml_server: (server: string) => void
  set_save_mode: (mode: SaveMode) => void
  set_allow_remote_images: (allow: boolean) => void
}

function persist(get: () => Settings) {
  const { plantuml_enabled, plantuml_server, save_mode, allow_remote_images } = get()
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ plantuml_enabled, plantuml_server, save_mode, allow_remote_images }),
  )
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...load_settings(),

  set_plantuml_enabled: (enabled) => {
    set({ plantuml_enabled: enabled })
    persist(get)
  },

  set_plantuml_server: (server) => {
    set({ plantuml_server: server })
    persist(get)
  },

  set_save_mode: (mode) => {
    set({ save_mode: mode })
    persist(get)
  },

  set_allow_remote_images: (allow) => {
    set({ allow_remote_images: allow })
    persist(get)
  },
}))
