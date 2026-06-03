import { useWorkspaceStore } from './workspaceStore'
import { create_mock_directory } from '../test/fsMocks'
import { save_handle, clear_handle } from '../lib/storage/handleStore'

// IndexedDB は使わず、ハンドル保存はメモリ上のスタブで代替する
vi.mock('../lib/storage/handleStore', () => {
  let stored: FileSystemDirectoryHandle | null = null
  return {
    save_handle: vi.fn(async (handle: FileSystemDirectoryHandle) => {
      stored = handle
    }),
    load_handle: vi.fn(async () => stored),
    clear_handle: vi.fn(async () => {
      stored = null
    }),
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
    await clear_handle()
    useWorkspaceStore.setState(initial_state, true)
  })

  it('open_folder でフォルダを開きツリーを構築する', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': '# A', docs: { 'b.md': '# B' } }))
    await useWorkspaceStore.getState().open_folder()

    const state = useWorkspaceStore.getState()
    expect(state.folder_name).toBe('notes')
    expect(state.tree.map((n) => n.name)).toEqual(['docs', 'a.md'])
  })

  it('ダイアログをキャンセルしてもエラーにしない', async () => {
    set_picker(null)
    await useWorkspaceStore.getState().open_folder()
    expect(useWorkspaceStore.getState().error).toBeNull()
    expect(useWorkspaceStore.getState().folder_name).toBeNull()
  })

  it('open_file で内容を読み込み save_status=saved になる', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': '# Hello' }))
    await useWorkspaceStore.getState().open_folder()
    await useWorkspaceStore.getState().open_file('a.md')

    const state = useWorkspaceStore.getState()
    expect(state.current_path).toBe('a.md')
    expect(state.content).toBe('# Hello')
    expect(state.save_status).toBe('saved')
  })

  it('set_content で dirty になり、save で書き込んで saved になる', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': 'old' }))
    await useWorkspaceStore.getState().open_folder()
    await useWorkspaceStore.getState().open_file('a.md')

    useWorkspaceStore.getState().set_content('updated')
    expect(useWorkspaceStore.getState().save_status).toBe('dirty')

    await useWorkspaceStore.getState().save()
    expect(useWorkspaceStore.getState().save_status).toBe('saved')

    await useWorkspaceStore.getState().open_file('a.md')
    expect(useWorkspaceStore.getState().content).toBe('updated')
  })

  it('ファイル未選択時の set_content は idle のまま', () => {
    useWorkspaceStore.getState().set_content('scratch')
    expect(useWorkspaceStore.getState().save_status).toBe('idle')
  })

  it('open_text はパス無しで内容を設定する', () => {
    useWorkspaceStore.getState().open_text('# scratch')
    const state = useWorkspaceStore.getState()
    expect(state.content).toBe('# scratch')
    expect(state.current_path).toBeNull()
  })

  it('未対応ブラウザでは init で is_supported=false', async () => {
    delete (window as { showDirectoryPicker?: unknown }).showDirectoryPicker
    await useWorkspaceStore.getState().init()
    expect(useWorkspaceStore.getState().is_supported).toBe(false)
  })

  it('init: 権限付与済みの保存ハンドルを自動復元する', async () => {
    set_picker(create_mock_directory('dummy', {}))
    await save_handle(create_mock_directory('restored', { 'a.md': '# A' }))
    await useWorkspaceStore.getState().init()
    expect(useWorkspaceStore.getState().folder_name).toBe('restored')
  })

  it('init: 権限が未許可なら can_restore=true（自動復元しない）', async () => {
    set_picker(create_mock_directory('dummy', {}))
    await save_handle(make_handle('prompt'))
    await useWorkspaceStore.getState().init()
    const state = useWorkspaceStore.getState()
    expect(state.can_restore).toBe(true)
    expect(state.folder_name).toBeNull()
  })

  it('restore_folder: 許可されればフォルダを復元する', async () => {
    await save_handle(create_mock_directory('restored', { 'a.md': '# A' }))
    await useWorkspaceStore.getState().restore_folder()
    expect(useWorkspaceStore.getState().folder_name).toBe('restored')
  })

  it('restore_folder: 保存ハンドルが無ければ can_restore=false', async () => {
    await clear_handle()
    useWorkspaceStore.setState({ can_restore: true })
    await useWorkspaceStore.getState().restore_folder()
    expect(useWorkspaceStore.getState().can_restore).toBe(false)
  })

  it('restore_folder: 許可されなければエラー', async () => {
    await save_handle(make_handle('denied'))
    await useWorkspaceStore.getState().restore_folder()
    expect(useWorkspaceStore.getState().error).toBeTruthy()
  })

  it('open_folder: ダイアログ以外のエラーはエラー表示する', async () => {
    window.showDirectoryPicker = (async () => {
      throw new Error('boom')
    }) as typeof window.showDirectoryPicker
    await useWorkspaceStore.getState().open_folder()
    expect(useWorkspaceStore.getState().error).toBe('フォルダを開けませんでした')
  })

  it('open_file: 読み込み失敗でエラー表示する', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': 'x' }))
    await useWorkspaceStore.getState().open_folder()
    await useWorkspaceStore.getState().open_file('missing.md')
    expect(useWorkspaceStore.getState().error).toContain('missing.md')
  })

  it('save: 書き込み失敗で save_status=error', async () => {
    const failing = {
      write_file: async () => {
        throw new Error('fail')
      },
    }
    useWorkspaceStore.setState({ workspace: failing as never, current_path: 'a.md', content: 'x' })
    await useWorkspaceStore.getState().save()
    expect(useWorkspaceStore.getState().save_status).toBe('error')
  })

  it('close_folder: 状態をリセットする', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': 'x' }))
    await useWorkspaceStore.getState().open_folder()
    await useWorkspaceStore.getState().close_folder()
    const state = useWorkspaceStore.getState()
    expect(state.folder_name).toBeNull()
    expect(state.workspace).toBeNull()
  })
})
