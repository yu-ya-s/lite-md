import { useWorkspaceStore } from './workspaceStore'
import { create_mock_directory } from '../test/fsMocks'
import { save_folders, type PersistedFolder } from '../lib/storage/handleStore'

// IndexedDB は使わず、フォルダ保存はメモリ上のスタブで代替する
vi.mock('../lib/storage/handleStore', () => {
  let stored: PersistedFolder[] = []
  return {
    save_folders: vi.fn(async (folders: PersistedFolder[]) => {
      stored = folders
    }),
    load_folders: vi.fn(async () => stored),
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
    await save_folders([])
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

  it('ダイアログをキャンセルしてもエラーにせず読み込み中にもしない', async () => {
    set_picker(null)
    await useWorkspaceStore.getState().add_folder()
    expect(useWorkspaceStore.getState().error).toBeNull()
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(0)
    expect(useWorkspaceStore.getState().is_loading).toBe(false)
  })

  it('add_folder はフォルダ走査中だけ is_loading を立てる', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    // 走査を途中で止められるハンドル。読み込み中の状態を観測するために使う
    const inner = create_mock_directory('slow', { 'a.md': '# A' })
    set_picker({
      name: 'slow',
      kind: 'directory',
      async *entries() {
        await gate
        yield* inner.entries()
      },
    } as unknown as FileSystemDirectoryHandle)

    const pending = useWorkspaceStore.getState().add_folder()
    await vi.waitFor(() => expect(useWorkspaceStore.getState().is_loading).toBe(true))

    release()
    await pending
    expect(useWorkspaceStore.getState().is_loading).toBe(false)
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1)
  })

  it('open_file で内容を読み込み save_status=saved になる', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': '# Hello' }))
    await useWorkspaceStore.getState().add_folder()
    const id = useWorkspaceStore.getState().workspaces[0].id
    await useWorkspaceStore.getState().open_file(id, 'a.md')

    const state = useWorkspaceStore.getState()
    expect(state.current).toEqual({ workspace_id: id, path: 'a.md' })
    expect(state.content).toBe('# Hello')
    expect(state.baseline).toBe('# Hello')
    expect(state.save_status).toBe('saved')
  })

  it('save 成功で baseline が現在の内容に更新される（変更ハイライトの基準）', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': 'old' }))
    await useWorkspaceStore.getState().add_folder()
    const id = useWorkspaceStore.getState().workspaces[0].id
    await useWorkspaceStore.getState().open_file(id, 'a.md')
    useWorkspaceStore.getState().set_content('changed')
    expect(useWorkspaceStore.getState().baseline).toBe('old')
    await useWorkspaceStore.getState().save()
    expect(useWorkspaceStore.getState().baseline).toBe('changed')
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

  it('init: 権限付与済みの保存フォルダをラベル付きで自動復元する', async () => {
    set_picker(create_mock_directory('dummy', {}))
    await save_folders([
      { handle: create_mock_directory('restored', { 'a.md': '# A' }), label: 'プロジェクトA' },
    ])
    await useWorkspaceStore.getState().init()
    const workspaces = useWorkspaceStore.getState().workspaces
    expect(workspaces.map((w) => w.name)).toEqual(['restored'])
    expect(workspaces[0].label).toBe('プロジェクトA')
  })

  it('init: 権限が未許可なら can_restore=true（自動復元しない）', async () => {
    set_picker(create_mock_directory('dummy', {}))
    await save_folders([{ handle: make_handle('prompt'), label: '' }])
    await useWorkspaceStore.getState().init()
    const state = useWorkspaceStore.getState()
    expect(state.can_restore).toBe(true)
    expect(state.workspaces).toHaveLength(0)
  })

  it('restore_folders: 許可されればフォルダを復元する', async () => {
    await save_folders([
      { handle: create_mock_directory('restored', { 'a.md': '# A' }), label: '' },
      { handle: create_mock_directory('also', { 'b.md': '# B' }), label: '' },
    ])
    await useWorkspaceStore.getState().restore_folders()
    expect(useWorkspaceStore.getState().workspaces.map((w) => w.name)).toEqual(['restored', 'also'])
  })

  it('restore_folders: 保存フォルダが無ければ can_restore=false', async () => {
    await save_folders([])
    useWorkspaceStore.setState({ can_restore: true })
    await useWorkspaceStore.getState().restore_folders()
    expect(useWorkspaceStore.getState().can_restore).toBe(false)
  })

  it('restore_folders: 許可されなければエラー', async () => {
    await save_folders([{ handle: make_handle('denied'), label: '' }])
    await useWorkspaceStore.getState().restore_folders()
    expect(useWorkspaceStore.getState().error).toBeTruthy()
  })

  it('rename_workspace で表示名（ラベル）を変更する', async () => {
    set_picker(create_mock_directory('docs', { 'a.md': 'x' }))
    await useWorkspaceStore.getState().add_folder()
    const id = useWorkspaceStore.getState().workspaces[0].id
    await useWorkspaceStore.getState().rename_workspace(id, 'プロジェクトA/docs')
    expect(useWorkspaceStore.getState().workspaces[0].label).toBe('プロジェクトA/docs')
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
        {
          id: 'ws-x',
          name: 'x',
          label: '',
          handle: {} as never,
          workspace: failing as never,
          tree: [],
        },
      ],
      current: { workspace_id: 'ws-x', path: 'a.md' },
      content: 'x',
    })
    await useWorkspaceStore.getState().save()
    expect(useWorkspaceStore.getState().save_status).toBe('error')
  })

  it('toggle_done で先頭に【済】を付け、再度実行で外す', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': '# A' }))
    await useWorkspaceStore.getState().add_folder()
    const id = useWorkspaceStore.getState().workspaces[0].id
    await useWorkspaceStore.getState().open_file(id, 'a.md')

    await useWorkspaceStore.getState().toggle_done()
    let state = useWorkspaceStore.getState()
    expect(state.current?.path).toBe('【済】a.md')
    expect(state.workspaces[0].tree.some((n) => n.name === '【済】a.md')).toBe(true)

    await useWorkspaceStore.getState().toggle_done()
    state = useWorkspaceStore.getState()
    expect(state.current?.path).toBe('a.md')
    expect(state.workspaces[0].tree.some((n) => n.name === 'a.md')).toBe(true)
  })

  it('toggle_done に他ファイルを指定すると current は変えずにそのファイルだけ済化する', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': '# A', 'b.md': '# B' }))
    await useWorkspaceStore.getState().add_folder()
    const id = useWorkspaceStore.getState().workspaces[0].id
    await useWorkspaceStore.getState().open_file(id, 'a.md')

    await useWorkspaceStore.getState().toggle_done({ workspace_id: id, path: 'b.md' })
    const state = useWorkspaceStore.getState()
    // 開いているファイルは a.md のまま、指定した b.md だけが【済】になる
    expect(state.current?.path).toBe('a.md')
    expect(state.workspaces[0].tree.some((n) => n.name === '【済】b.md')).toBe(true)
    expect(state.workspaces[0].tree.some((n) => n.name === 'a.md')).toBe(true)
  })

  it('toggle_done はファイル未選択なら何もしない', async () => {
    useWorkspaceStore.setState({ current: null })
    await useWorkspaceStore.getState().toggle_done()
    expect(useWorkspaceStore.getState().current).toBeNull()
  })

  it('toggle_done は同名の【済】ファイルが既にあれば上書きせずエラーにする', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': '# A', '【済】a.md': '# done' }))
    await useWorkspaceStore.getState().add_folder()
    const ws = useWorkspaceStore.getState().workspaces[0]
    const rename_spy = vi.spyOn(ws.workspace, 'rename_file')

    await useWorkspaceStore.getState().toggle_done({ workspace_id: ws.id, path: 'a.md' })

    expect(rename_spy).not.toHaveBeenCalled()
    expect(useWorkspaceStore.getState().error).toBe('同名のファイルがあるため変更できませんでした')
    // 元のファイルは残ったまま（上書きされていない）
    expect(useWorkspaceStore.getState().workspaces[0].tree.filter((n) => n.name === 'a.md')).toHaveLength(1)
  })

  it('mark_done は未済のみ【済】を付け、既に済のものはスキップし、build_tree はワークスペースごとに1回呼ぶ', async () => {
    set_picker(
      create_mock_directory('notes', { 'a.md': '# A', 'b.md': '# B', '【済】c.md': '# C' }),
    )
    await useWorkspaceStore.getState().add_folder()
    const ws = useWorkspaceStore.getState().workspaces[0]
    const build_tree_spy = vi.spyOn(ws.workspace, 'build_tree')

    await useWorkspaceStore.getState().mark_done([
      { workspace_id: ws.id, path: 'a.md' },
      { workspace_id: ws.id, path: 'b.md' },
      { workspace_id: ws.id, path: '【済】c.md' },
    ])

    const names = useWorkspaceStore
      .getState()
      .workspaces[0].tree.map((n) => n.name)
      .sort()
    expect(names).toEqual(['【済】a.md', '【済】b.md', '【済】c.md'])
    expect(build_tree_spy).toHaveBeenCalledTimes(1)
  })

  it('mark_done で対象に開いているファイルが含まれていれば current.path を新パスに追従させる', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': '# A' }))
    await useWorkspaceStore.getState().add_folder()
    const id = useWorkspaceStore.getState().workspaces[0].id
    await useWorkspaceStore.getState().open_file(id, 'a.md')

    await useWorkspaceStore.getState().mark_done([{ workspace_id: id, path: 'a.md' }])
    expect(useWorkspaceStore.getState().current?.path).toBe('【済】a.md')
  })

  it('mark_done は1件失敗しても他は反映され、error に失敗件数が入る', async () => {
    const rename_file = vi.fn(async (path: string, new_name: string) => {
      if (path === 'a.md') throw new Error('fail')
      return new_name
    })
    const build_tree = vi.fn(async () => [
      { kind: 'file' as const, name: '【済】b.md', path: '【済】b.md' },
    ])
    useWorkspaceStore.setState({
      workspaces: [
        {
          id: 'ws-x',
          name: 'x',
          label: '',
          handle: {} as never,
          workspace: { rename_file, build_tree } as never,
          tree: [
            { kind: 'file', name: 'a.md', path: 'a.md' },
            { kind: 'file', name: 'b.md', path: 'b.md' },
          ],
        },
      ],
    })

    await useWorkspaceStore.getState().mark_done([
      { workspace_id: 'ws-x', path: 'a.md' },
      { workspace_id: 'ws-x', path: 'b.md' },
    ])

    const state = useWorkspaceStore.getState()
    expect(state.error).toBe('ファイル名の変更に失敗しました（1件）')
    expect(state.workspaces[0].tree.some((n) => n.name === '【済】b.md')).toBe(true)
  })

  it('mark_done は同名の【済】ファイルが既にあればリネームせずスキップし、conflict件数を別メッセージで表示する', async () => {
    set_picker(create_mock_directory('notes', { 'a.md': '# A', '【済】a.md': '# done' }))
    await useWorkspaceStore.getState().add_folder()
    const ws = useWorkspaceStore.getState().workspaces[0]
    const rename_spy = vi.spyOn(ws.workspace, 'rename_file')

    const result = await useWorkspaceStore
      .getState()
      .mark_done([{ workspace_id: ws.id, path: 'a.md' }])

    expect(rename_spy).not.toHaveBeenCalled()
    expect(result).toEqual({ done: [], failed: ['a.md'] })
    expect(useWorkspaceStore.getState().error).toBe('同名のファイルがあるため変更できませんでした（1件）')
    expect(useWorkspaceStore.getState().workspaces[0].tree.filter((n) => n.name === 'a.md')).toHaveLength(1)
  })

  it('mark_done は build_tree の後に last_modified を取得して current_mtime を更新する', async () => {
    const order: string[] = []
    const rename_file = vi.fn(async (_path: string, new_name: string) => new_name)
    const build_tree = vi.fn(async () => {
      order.push('build_tree')
      return [{ kind: 'file' as const, name: '【済】a.md', path: '【済】a.md' }]
    })
    const last_modified = vi.fn(async () => {
      order.push('last_modified')
      return 999
    })
    useWorkspaceStore.setState({
      workspaces: [
        {
          id: 'ws-x',
          name: 'x',
          label: '',
          handle: {} as never,
          workspace: { rename_file, build_tree, last_modified } as never,
          tree: [{ kind: 'file', name: 'a.md', path: 'a.md' }],
        },
      ],
      current: { workspace_id: 'ws-x', path: 'a.md' },
      current_mtime: 1,
    })

    await useWorkspaceStore.getState().mark_done([{ workspace_id: 'ws-x', path: 'a.md' }])

    expect(order).toEqual(['build_tree', 'last_modified'])
    expect(useWorkspaceStore.getState().current_mtime).toBe(999)
    expect(useWorkspaceStore.getState().current?.path).toBe('【済】a.md')
  })

  it('mark_done は build_tree に失敗すると専用メッセージにし、リネーム失敗件数に合算しない', async () => {
    const rename_file = vi.fn(async (_path: string, new_name: string) => new_name)
    const build_tree = vi.fn(async () => {
      throw new Error('fail')
    })
    useWorkspaceStore.setState({
      workspaces: [
        {
          id: 'ws-x',
          name: 'x',
          label: '',
          handle: {} as never,
          workspace: { rename_file, build_tree } as never,
          tree: [{ kind: 'file', name: 'a.md', path: 'a.md' }],
        },
      ],
    })

    const result = await useWorkspaceStore
      .getState()
      .mark_done([{ workspace_id: 'ws-x', path: 'a.md' }])

    expect(result).toEqual({ done: ['a.md'], failed: [] })
    expect(useWorkspaceStore.getState().error).toBe('ファイル一覧の更新に失敗しました')
  })

  it('reload_folder でツリーを再走査して新規ファイルを反映する', async () => {
    let calls = 0
    const ws_obj = {
      build_tree: async () => {
        calls += 1
        const base = [{ kind: 'file' as const, name: 'a.md', path: 'a.md' }]
        if (calls === 1) return base
        return [...base, { kind: 'file' as const, name: '【済】new.md', path: '【済】new.md' }]
      },
    }
    useWorkspaceStore.setState({
      workspaces: [
        {
          id: 'ws-1',
          name: 'n',
          label: '',
          handle: {} as never,
          workspace: ws_obj as never,
          tree: await ws_obj.build_tree(),
        },
      ],
    })
    expect(useWorkspaceStore.getState().workspaces[0].tree).toHaveLength(1)

    await useWorkspaceStore.getState().reload_folder('ws-1')
    expect(useWorkspaceStore.getState().workspaces[0].tree).toHaveLength(2)
  })

  it('check_external_change: 未編集なら外部変更を自動で再読み込みする', async () => {
    const ws_obj = {
      read_file: async () => 'new content',
      last_modified: async () => 200,
    }
    useWorkspaceStore.setState({
      workspaces: [
        { id: 'ws-1', name: 'n', label: '', handle: {} as never, workspace: ws_obj as never, tree: [] },
      ],
      current: { workspace_id: 'ws-1', path: 'a.md' },
      content: 'old content',
      baseline: 'old content',
      current_mtime: 100,
      save_status: 'saved',
    })

    await useWorkspaceStore.getState().check_external_change()

    const state = useWorkspaceStore.getState()
    expect(state.content).toBe('new content')
    expect(state.current_mtime).toBe(200)
    expect(state.external_changed).toBe(false)
  })

  it('check_external_change: 未保存編集があるときは上書きせず通知フラグを立てる', async () => {
    const ws_obj = {
      read_file: async () => 'new content',
      last_modified: async () => 200,
    }
    useWorkspaceStore.setState({
      workspaces: [
        { id: 'ws-1', name: 'n', label: '', handle: {} as never, workspace: ws_obj as never, tree: [] },
      ],
      current: { workspace_id: 'ws-1', path: 'a.md' },
      content: '編集中の内容',
      current_mtime: 100,
      save_status: 'dirty',
    })

    await useWorkspaceStore.getState().check_external_change()

    const state = useWorkspaceStore.getState()
    expect(state.external_changed).toBe(true)
    expect(state.content).toBe('編集中の内容')
  })

  it('check_external_change: 更新時刻が同じなら何もしない', async () => {
    const ws_obj = { read_file: async () => 'x', last_modified: async () => 100 }
    useWorkspaceStore.setState({
      workspaces: [
        { id: 'ws-1', name: 'n', label: '', handle: {} as never, workspace: ws_obj as never, tree: [] },
      ],
      current: { workspace_id: 'ws-1', path: 'a.md' },
      content: 'keep',
      current_mtime: 100,
      save_status: 'saved',
    })
    await useWorkspaceStore.getState().check_external_change()
    expect(useWorkspaceStore.getState().content).toBe('keep')
  })

  it('reload_current: ディスクから読み直して baseline/mtime を更新する', async () => {
    const ws_obj = { read_file: async () => 'disk content', last_modified: async () => 300 }
    useWorkspaceStore.setState({
      workspaces: [
        { id: 'ws-1', name: 'n', label: '', handle: {} as never, workspace: ws_obj as never, tree: [] },
      ],
      current: { workspace_id: 'ws-1', path: 'a.md' },
      content: 'editing',
      save_status: 'dirty',
      external_changed: true,
    })
    await useWorkspaceStore.getState().reload_current()
    const state = useWorkspaceStore.getState()
    expect(state.content).toBe('disk content')
    expect(state.current_mtime).toBe(300)
    expect(state.external_changed).toBe(false)
    expect(state.save_status).toBe('saved')
  })

  it('save: 保存中にファイルが切り替わったら状態を上書きしない', async () => {
    let resolve_write!: () => void
    const slow_ws = {
      write_file: () =>
        new Promise<void>((resolve) => {
          resolve_write = resolve
        }),
    }
    useWorkspaceStore.setState({
      workspaces: [
        { id: 'ws-x', name: 'x', label: '', handle: {} as never, workspace: slow_ws as never, tree: [] },
      ],
      current: { workspace_id: 'ws-x', path: 'a.md' },
      content: 'new content',
    })

    const saving = useWorkspaceStore.getState().save()
    // 保存完了前に別ファイルへ切り替える
    useWorkspaceStore.setState({ current: { workspace_id: 'ws-x', path: 'b.md' } })
    resolve_write()
    await saving

    // 'a.md' の保存完了が 'b.md' の状態（baseline）を上書きしていないこと
    expect(useWorkspaceStore.getState().baseline).not.toBe('new content')
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
