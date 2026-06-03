import { create } from 'zustand'
import type { TreeNode } from '../lib/storage/types'
import { FsaWorkspace } from '../lib/storage/fsaWorkspace'
import { is_fsa_supported } from '../lib/storage/support'
import { load_handles, save_handles } from '../lib/storage/handleStore'

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export type LoadedWorkspace = {
  id: string
  name: string
  handle: FileSystemDirectoryHandle
  workspace: FsaWorkspace
  tree: TreeNode[]
}

export type CurrentFile = {
  workspace_id: string
  path: string
}

export const WELCOME_CONTENT = `# lite-md へようこそ

左上の「フォルダを追加」からローカルフォルダを選ぶと、\`.md\` ファイルを直接編集できます。
複数のフォルダを同時に開けます。

ファイルの内容はブラウザ内だけで処理され、サーバーには送信されません。
`

let workspace_seq = 0

async function build_loaded(handle: FileSystemDirectoryHandle): Promise<LoadedWorkspace> {
  const workspace = new FsaWorkspace(handle)
  const tree = await workspace.build_tree()
  workspace_seq += 1
  return { id: `ws-${workspace_seq}`, name: handle.name, handle, workspace, tree }
}

type WorkspaceState = {
  is_supported: boolean
  workspaces: LoadedWorkspace[]
  current: CurrentFile | null
  content: string
  save_status: SaveStatus
  can_restore: boolean
  error: string | null

  init: () => Promise<void>
  add_folder: () => Promise<void>
  restore_folders: () => Promise<void>
  open_file: (workspace_id: string, path: string) => Promise<void>
  set_content: (content: string) => void
  open_text: (content: string) => void
  save: () => Promise<void>
  close_folder: (workspace_id: string) => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  is_supported: false,
  workspaces: [],
  current: null,
  content: WELCOME_CONTENT,
  save_status: 'idle',
  can_restore: false,
  error: null,

  init: async () => {
    const supported = is_fsa_supported()
    set({ is_supported: supported })
    if (!supported) return
    try {
      const handles = await load_handles()
      if (handles.length === 0) return

      const loaded: LoadedWorkspace[] = []
      let any_denied = false
      for (const handle of handles) {
        if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') {
          loaded.push(await build_loaded(handle))
        } else {
          any_denied = true
        }
      }
      set({ workspaces: loaded, can_restore: any_denied })
    } catch {
      // 復元に失敗しても致命的ではない（手動で開けばよい）ので黙って無視する
    }
  },

  add_folder: async () => {
    try {
      const handle = await window.showDirectoryPicker({ id: 'lite-md', mode: 'readwrite' })
      const loaded = await build_loaded(handle)
      const workspaces = [...get().workspaces, loaded]
      set({ workspaces, error: null })
      await save_handles(workspaces.map((w) => w.handle))
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      set({ error: 'フォルダを開けませんでした' })
    }
  },

  restore_folders: async () => {
    try {
      const handles = await load_handles()
      if (handles.length === 0) {
        set({ can_restore: false })
        return
      }

      const loaded: LoadedWorkspace[] = []
      for (const handle of handles) {
        if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
          loaded.push(await build_loaded(handle))
        }
      }

      if (loaded.length === 0) {
        set({ error: 'フォルダへのアクセスが許可されませんでした' })
        return
      }
      set({ workspaces: loaded, can_restore: false, error: null, current: null })
    } catch {
      set({ error: 'フォルダを復元できませんでした' })
    }
  },

  open_file: async (workspace_id, path) => {
    const ws = get().workspaces.find((w) => w.id === workspace_id)
    if (!ws) return
    try {
      const content = await ws.workspace.read_file(path)
      set({ current: { workspace_id, path }, content, save_status: 'saved', error: null })
    } catch {
      set({ error: `ファイルを開けませんでした: ${path}` })
    }
  },

  set_content: (content) => {
    set({ content, save_status: get().current ? 'dirty' : 'idle' })
  },

  open_text: (content) => {
    set({ content, current: null, save_status: 'idle' })
  },

  save: async () => {
    const { workspaces, current, content } = get()
    if (!current) return
    const ws = workspaces.find((w) => w.id === current.workspace_id)
    if (!ws) return
    set({ save_status: 'saving' })
    try {
      await ws.workspace.write_file(current.path, content)
      set({ save_status: 'saved' })
    } catch {
      set({ save_status: 'error', error: '保存に失敗しました' })
    }
  },

  close_folder: async (workspace_id) => {
    const { workspaces, current } = get()
    const remaining = workspaces.filter((w) => w.id !== workspace_id)
    const closing_current = current?.workspace_id === workspace_id

    if (closing_current) {
      set({
        workspaces: remaining,
        current: null,
        content: WELCOME_CONTENT,
        save_status: 'idle',
      })
    } else {
      set({ workspaces: remaining })
    }
    await save_handles(remaining.map((w) => w.handle))
  },
}))
