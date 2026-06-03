import { create } from 'zustand'
import type { TreeNode } from '../lib/storage/types'
import { FsaWorkspace } from '../lib/storage/fsaWorkspace'
import { is_fsa_supported } from '../lib/storage/support'
import { clear_handle, load_handle, save_handle } from '../lib/storage/handleStore'

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export const WELCOME_CONTENT = `# lite-md へようこそ

左上の「フォルダを開く」からローカルフォルダを選ぶと、\`.md\` ファイルを直接編集できます。

ファイルの内容はブラウザ内だけで処理され、サーバーには送信されません。
`

type WorkspaceState = {
  is_supported: boolean
  workspace: FsaWorkspace | null
  folder_name: string | null
  tree: TreeNode[]
  current_path: string | null
  content: string
  save_status: SaveStatus
  can_restore: boolean
  error: string | null

  init: () => Promise<void>
  open_folder: () => Promise<void>
  restore_folder: () => Promise<void>
  open_file: (path: string) => Promise<void>
  set_content: (content: string) => void
  open_text: (content: string) => void
  save: () => Promise<void>
  close_folder: () => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  async function activate(handle: FileSystemDirectoryHandle) {
    const workspace = new FsaWorkspace(handle)
    const tree = await workspace.build_tree()
    set({ workspace, folder_name: handle.name, tree, can_restore: false, error: null })
  }

  return {
    is_supported: false,
    workspace: null,
    folder_name: null,
    tree: [],
    current_path: null,
    content: WELCOME_CONTENT,
    save_status: 'idle',
    can_restore: false,
    error: null,

    init: async () => {
      const supported = is_fsa_supported()
      set({ is_supported: supported })
      if (!supported) return
      try {
        const handle = await load_handle()
        if (!handle) return
        const permission = await handle.queryPermission({ mode: 'readwrite' })
        if (permission === 'granted') {
          await activate(handle)
        } else {
          set({ can_restore: true })
        }
      } catch {
        // 復元に失敗しても致命的ではない（手動で開けばよい）ので黙って無視する
      }
    },

    open_folder: async () => {
      try {
        const handle = await window.showDirectoryPicker({ id: 'lite-md', mode: 'readwrite' })
        await save_handle(handle)
        await activate(handle)
      } catch (e) {
        // ダイアログのキャンセルは正常系として無視する
        if (e instanceof DOMException && e.name === 'AbortError') return
        set({ error: 'フォルダを開けませんでした' })
      }
    },

    restore_folder: async () => {
      try {
        const handle = await load_handle()
        if (!handle) {
          set({ can_restore: false })
          return
        }
        const permission = await handle.requestPermission({ mode: 'readwrite' })
        if (permission === 'granted') {
          await activate(handle)
        } else {
          set({ error: 'フォルダへのアクセスが許可されませんでした' })
        }
      } catch {
        set({ error: 'フォルダを復元できませんでした' })
      }
    },

    open_file: async (path) => {
      const { workspace } = get()
      if (!workspace) return
      try {
        const content = await workspace.read_file(path)
        set({ current_path: path, content, save_status: 'saved', error: null })
      } catch {
        set({ error: `ファイルを開けませんでした: ${path}` })
      }
    },

    set_content: (content) => {
      set({ content, save_status: get().current_path ? 'dirty' : 'idle' })
    },

    open_text: (content) => {
      set({ content, current_path: null, save_status: 'idle' })
    },

    save: async () => {
      const { workspace, current_path, content } = get()
      if (!workspace || !current_path) return
      set({ save_status: 'saving' })
      try {
        await workspace.write_file(current_path, content)
        set({ save_status: 'saved' })
      } catch {
        set({ save_status: 'error', error: '保存に失敗しました' })
      }
    },

    close_folder: async () => {
      await clear_handle()
      set({
        workspace: null,
        folder_name: null,
        tree: [],
        current_path: null,
        can_restore: false,
        content: WELCOME_CONTENT,
        save_status: 'idle',
      })
    },
  }
})
