import { useWorkspaceStore } from './workspaceStore'
import { create_mock_directory } from '../test/fsMocks'
import { save_handles } from '../lib/storage/handleStore'

// IndexedDB は使わず、ハンドル保存はメモリ上のスタブで代替する
vi.mock('../lib/storage/handleStore', () => {
  let stored: FileSystemDirectoryHandle[] = []
  return {
    save_handles: vi.fn(async (handles: FileSystemDirectoryHandle[]) => {
      stored = handles
    }),
    load_handles: vi.fn(async () => stored),
  }
})

const initial_state = useWorkspaceStore.getState()

function set_picker(handle: FileSystemDirectoryHandle | null) {
  window.showDirectoryPicker = (async () => {
    if (!handle) {
      throw new DOMException('cancelled', 'AbortError')
    }
    return handle
  }) as typeof window.showDirectoryPicker
}

function make_handle(permission: PermissionState): FileSystemDirectoryHandle {
  return {
    name: 'persisted',
    kind: 'directory',
    queryPermission: async () => permission,
    requestPermission: async () => permission,
    async *entries() {},
  } as unknown as FileSystemDirectoryHandle
}

describe('workspaceStore', () => {
  beforeEach(async () => {
    await save_handles([])
    useWorkspaceStore.setState(initial_state, true)
  })

  it('add_folder でフォルダを開きツリーを構築する', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': '# A', docs: { 'b.md': '# B' } }))
    await useWorkspaceStore.getState().add_folder()

    const { workspaces } = useWorkspaceStore.getState()
    expect(workspaces).toHaveLength(1)
    expect(workspaces[0].name).toBe('notes')
    expect(workspaces[0].tree.map((n) => n.name)).toEqual(['docs', 'a.md'])
  })

  it('add_folder を繰り返すと複数フォルダを保持する', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': 'x' }))
    await useWorkspaceStore.getState().add_folder()
    set_picker(create_mock_directory('docs', { 'b.md': 'y' }))
    await useWorkspaceStore.getState().add_folder()

    const { workspaces } = useWorkspaceStore.getState()
    expect(workspaces.map((w) => w.name)).toEqual(['notes', 'docs'])
  })

  it('ダイアログをキャンセルしてもエラーにしない', async () => {
    set_picker(null)
    await useWorkspaceStore.getState().add_folder()
    expect(useWorkspaceStore.getState().error).toBeNull()
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(0)
  })

  it('open_file で内容を読み込み save_status=saved になる', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': '# Hello' }))
    await useWorkspaceStore.getState().add_folder()
    const id = useWorkspaceStore.getState().workspaces[0].id
    await useWorkspaceStore.getState().open_file(id, 'a.md')

    const state = useWorkspaceStore.getState()
    expect(state.current).toEqual({ workspace_id: id, path: 'a.md' })
    expect(state.content).toBe('# Hello')
    expect(state.save_status).toBe('saved')
  })

  it('set_content で dirty になり、save で書き込んで saved になる', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': 'old' }))
    await useWorkspaceStore.getState().add_folder()
    const id = useWorkspaceStore.getState().workspaces[0].id
    await useWorkspaceStore.getState().open_file(id, 'a.md')

    useWorkspaceStore.getState().set_content('updated')
    expect(useWorkspaceStore.getState().save_status).toBe('dirty')

    await useWorkspaceStore.getState().save()
    expect(useWorkspaceStore.getState().save_status).toBe('saved')

    await useWorkspaceStore.getState().open_file(id, 'a.md')
    expect(useWorkspaceStore.getState().content).toBe('updated')
  })

  it('ファイル未選択時の set_content は idle のまま', () => {
    useWorkspaceStore.getState().set_content('scratch')
    expect(useWorkspaceStore.getState().save_status).toBe('idle')
  })

  it('open_text はファイル未選択で内容を設定する', () => {
    useWorkspaceStore.getState().open_text('# scratch')
    const state = useWorkspaceStore.getState()
    expect(state.content).toBe('# scratch')
    expect(state.current).toBeNull()
  })

  it('未対応ブラウザでは init で is_supported=false', async () => {
    delete (window as { showDirectoryPicker?: unknown }).showDirectoryPicker
    await useWorkspaceStore.getState().init()
    expect(useWorkspaceStore.getState().is_supported).toBe(false)
  })

  it('init: 権限付与済みの保存フォルダを自動復元する', async () => {
    set_picker(create_mock_directory('dummy', {}))
    await save_handles([create_mock_directory('restored', { 'a.md': '# A' })])
    await useWorkspaceStore.getState().init()
    expect(useWorkspaceStore.getState().workspaces.map((w) => w.name)).toEqual(['restored'])
  })

  it('init: 権限が未許可なら can_restore=true（自動復元しない）', async () => {
    set_picker(create_mock_directory('dummy', {}))
    await save_handles([make_handle('prompt')])
    await useWorkspaceStore.getState().init()
    const state = useWorkspaceStore.getState()
    expect(state.can_restore).toBe(true)
    expect(state.workspaces).toHaveLength(0)
  })

  it('restore_folders: 許可されればフォルダを復元する', async () => {
    await save_handles([
      create_mock_directory('restored', { 'a.md': '# A' }),
      create_mock_directory('also', { 'b.md': '# B' }),
    ])
    await useWorkspaceStore.getState().restore_folders()
    expect(useWorkspaceStore.getState().workspaces.map((w) => w.name)).toEqual(['restored', 'also'])
  })

  it('restore_folders: 保存ハンドルが無ければ can_restore=false', async () => {
    await save_handles([])
    useWorkspaceStore.setState({ can_restore: true })
    await useWorkspaceStore.getState().restore_folders()
    expect(useWorkspaceStore.getState().can_restore).toBe(false)
  })

  it('restore_folders: 許可されなければエラー', async () => {
    await save_handles([make_handle('denied')])
    await useWorkspaceStore.getState().restore_folders()
    expect(useWorkspaceStore.getState().error).toBeTruthy()
  })

  it('open_file: 読み込み失敗でエラー表示する', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': 'x' }))
    await useWorkspaceStore.getState().add_folder()
    const id = useWorkspaceStore.getState().workspaces[0].id
    await useWorkspaceStore.getState().open_file(id, 'missing.md')
    expect(useWorkspaceStore.getState().error).toContain('missing.md')
  })

  it('save: 書き込み失敗で save_status=error', async () => {
    const failing = {
      write_file: async () => {
        throw new Error('fail')
      },
    }
    useWorkspaceStore.setState({
      workspaces: [
        { id: 'ws-x', name: 'x', handle: {} as never, workspace: failing as never, tree: [] },
      ],
      current: { workspace_id: 'ws-x', path: 'a.md' },
      content: 'x',
    })
    await useWorkspaceStore.getState().save()
    expect(useWorkspaceStore.getState().save_status).toBe('error')
  })

  it('close_folder: 対象フォルダを取り除く', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': 'x' }))
    await useWorkspaceStore.getState().add_folder()
    const id = useWorkspaceStore.getState().workspaces[0].id
    await useWorkspaceStore.getState().close_folder(id)
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(0)
  })

  it('close_folder: 開いていたファイルのフォルダを閉じると current をリセットする', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': '# A' }))
    await useWorkspaceStore.getState().add_folder()
    const id = useWorkspaceStore.getState().workspaces[0].id
    await useWorkspaceStore.getState().open_file(id, 'a.md')
    await useWorkspaceStore.getState().close_folder(id)
    expect(useWorkspaceStore.getState().current).toBeNull()
  })
})
