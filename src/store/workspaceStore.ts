import { create } from 'zustand'
import type { TreeNode } from '../lib/storage/types'
import { FsaWorkspace } from '../lib/storage/fsaWorkspace'
import { is_fsa_supported } from '../lib/storage/support'
import { load_folders, save_folders } from '../lib/storage/handleStore'

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export type LoadedWorkspace = {
  id: string
  name: string
  label: string
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

async function build_loaded(
  handle: FileSystemDirectoryHandle,
  label = '',
): Promise<LoadedWorkspace> {
  const workspace = new FsaWorkspace(handle)
  const tree = await workspace.build_tree()
  workspace_seq += 1
  return { id: `ws-${workspace_seq}`, name: handle.name, label, handle, workspace, tree }
}

function to_persisted(workspaces: LoadedWorkspace[]) {
  return workspaces.map((w) => ({ handle: w.handle, label: w.label }))
}

type WorkspaceState = {
  is_supported: boolean
  workspaces: LoadedWorkspace[]
  current: CurrentFile | null
  content: string
  baseline: string
  // 開いているファイルの最終更新時刻（外部変更検知用）
  current_mtime: number | null
  // 外部で変更されたが未保存編集があるため自動反映できない状態
  external_changed: boolean
  save_status: SaveStatus
  can_restore: boolean
  error: string | null

  init: () => Promise<void>
  add_folder: () => Promise<void>
  restore_folders: () => Promise<void>
  reload_folder: (workspace_id: string) => Promise<void>
  rename_workspace: (workspace_id: string, label: string) => Promise<void>
  open_file: (workspace_id: string, path: string) => Promise<void>
  set_content: (content: string) => void
  open_text: (content: string) => void
  save: () => Promise<void>
  toggle_done: () => Promise<void>
  reload_current: () => Promise<void>
  check_external_change: () => Promise<void>
  close_folder: (workspace_id: string) => Promise<void>
}

// 処理済みを表すファイル名の接頭辞
export const DONE_PREFIX = '【済】'

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  is_supported: false,
  workspaces: [],
  current: null,
  content: WELCOME_CONTENT,
  baseline: WELCOME_CONTENT,
  current_mtime: null,
  external_changed: false,
  save_status: 'idle',
  can_restore: false,
  error: null,

  init: async () => {
    const supported = is_fsa_supported()
    set({ is_supported: supported })
    if (!supported) return
    try {
      const folders = await load_folders()
      if (folders.length === 0) return

      const loaded: LoadedWorkspace[] = []
      let any_denied = false
      for (const folder of folders) {
        if ((await folder.handle.queryPermission({ mode: 'readwrite' })) === 'granted') {
          loaded.push(await build_loaded(folder.handle, folder.label))
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
      await save_folders(to_persisted(workspaces))
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      set({ error: 'フォルダを開けませんでした' })
    }
  },

  restore_folders: async () => {
    try {
      const folders = await load_folders()
      if (folders.length === 0) {
        set({ can_restore: false })
        return
      }

      const loaded: LoadedWorkspace[] = []
      for (const folder of folders) {
        if ((await folder.handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
          loaded.push(await build_loaded(folder.handle, folder.label))
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

  reload_folder: async (workspace_id) => {
    const ws = get().workspaces.find((w) => w.id === workspace_id)
    if (!ws) return
    // ハンドルは保持済みなので、ページを再読み込みせずツリーだけ再走査する
    // （裏で生成されたファイルなどを反映するため）
    try {
      const tree = await ws.workspace.build_tree()
      set({
        workspaces: get().workspaces.map((w) => (w.id === workspace_id ? { ...w, tree } : w)),
        error: null,
      })
    } catch {
      set({ error: 'フォルダの再読み込みに失敗しました' })
    }
  },

  rename_workspace: async (workspace_id, label) => {
    const workspaces = get().workspaces.map((w) =>
      w.id === workspace_id ? { ...w, label } : w,
    )
    set({ workspaces })
    await save_folders(to_persisted(workspaces))
  },

  open_file: async (workspace_id, path) => {
    const ws = get().workspaces.find((w) => w.id === workspace_id)
    if (!ws) return
    try {
      const content = await ws.workspace.read_file(path)
      const mtime = await ws.workspace.last_modified(path)
      set({
        current: { workspace_id, path },
        content,
        baseline: content,
        current_mtime: mtime,
        external_changed: false,
        save_status: 'saved',
        error: null,
      })
    } catch {
      set({ error: `ファイルを開けませんでした: ${path}` })
    }
  },

  set_content: (content) => {
    set({ content, save_status: get().current ? 'dirty' : 'idle' })
  },

  open_text: (content) => {
    set({
      content,
      baseline: content,
      current: null,
      current_mtime: null,
      external_changed: false,
      save_status: 'idle',
    })
  },

  save: async () => {
    const { workspaces, current, content } = get()
    if (!current) return
    const ws = workspaces.find((w) => w.id === current.workspace_id)
    if (!ws) return
    const saved = current
    set({ save_status: 'saving' })
    try {
      await ws.workspace.write_file(saved.path, content)
      // 保存中にユーザーが別ファイルへ切り替えていたら、現在の状態を上書きしない
      const now = get().current
      if (now?.workspace_id === saved.workspace_id && now.path === saved.path) {
        // 自分の書き込みを外部変更として誤検知しないよう、更新時刻を取り直す
        let mtime = get().current_mtime
        try {
          mtime = await ws.workspace.last_modified(saved.path)
        } catch {
          // 取得失敗は無視（次回チェックで吸収）
        }
        set({ save_status: 'saved', baseline: content, current_mtime: mtime, external_changed: false })
      }
    } catch {
      set({ save_status: 'error', error: '保存に失敗しました' })
    }
  },

  toggle_done: async () => {
    const { workspaces, current } = get()
    if (!current) return
    const ws = workspaces.find((w) => w.id === current.workspace_id)
    if (!ws) return

    const name = current.path.split('/').pop() ?? ''
    const next_name = name.startsWith(DONE_PREFIX)
      ? name.slice(DONE_PREFIX.length)
      : `${DONE_PREFIX}${name}`

    try {
      const new_path = await ws.workspace.rename_file(current.path, next_name)
      const tree = await ws.workspace.build_tree()
      let mtime = get().current_mtime
      try {
        mtime = await ws.workspace.last_modified(new_path)
      } catch {
        // 取得失敗は無視
      }
      set({
        workspaces: get().workspaces.map((w) => (w.id === ws.id ? { ...w, tree } : w)),
        current: { workspace_id: ws.id, path: new_path },
        current_mtime: mtime,
        error: null,
      })
    } catch {
      set({ error: 'ファイル名の変更に失敗しました' })
    }
  },

  reload_current: async () => {
    const { workspaces, current } = get()
    if (!current) return
    const ws = workspaces.find((w) => w.id === current.workspace_id)
    if (!ws) return
    try {
      const content = await ws.workspace.read_file(current.path)
      const mtime = await ws.workspace.last_modified(current.path)
      set({
        content,
        baseline: content,
        current_mtime: mtime,
        external_changed: false,
        save_status: 'saved',
        error: null,
      })
    } catch {
      set({ error: 'ファイルの再読み込みに失敗しました' })
    }
  },

  check_external_change: async () => {
    const { workspaces, current, current_mtime, save_status } = get()
    if (!current || current_mtime === null) return
    const ws = workspaces.find((w) => w.id === current.workspace_id)
    if (!ws) return

    let mtime: number
    try {
      mtime = await ws.workspace.last_modified(current.path)
    } catch {
      return // ファイルが消えた等は無視
    }
    if (mtime === current_mtime) return

    // 未保存編集があるときは上書きせず通知のみ。なければ自動で再読み込み
    if (save_status === 'dirty' || save_status === 'saving') {
      set({ external_changed: true })
      return
    }
    try {
      const content = await ws.workspace.read_file(current.path)
      set({ content, baseline: content, current_mtime: mtime, external_changed: false, save_status: 'saved' })
    } catch {
      // 読み込み失敗は無視
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
        baseline: WELCOME_CONTENT,
        current_mtime: null,
        external_changed: false,
        save_status: 'idle',
      })
    } else {
      set({ workspaces: remaining })
    }
    await save_folders(to_persisted(remaining))
  },
}))
