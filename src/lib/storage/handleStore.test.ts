import { save_folders, load_folders } from './handleStore'

// setup.ts で fake-indexeddb/auto を読み込み済み
describe('handleStore', () => {
  it('ハンドルとラベルを保存して読み戻せる', async () => {
    await save_folders([
      { handle: { name: 'folder-a' } as unknown as FileSystemDirectoryHandle, label: 'プロジェクトA' },
      { handle: { name: 'folder-b' } as unknown as FileSystemDirectoryHandle, label: '' },
    ])
    const loaded = await load_folders()
    expect(loaded.map((f) => [f.handle.name, f.label])).toEqual([
      ['folder-a', 'プロジェクトA'],
      ['folder-b', ''],
    ])
  })

  it('空配列を保存すると空配列を返す', async () => {
    await save_folders([])
    expect(await load_folders()).toEqual([])
  })
})
