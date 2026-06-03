import { save_handles, load_handles } from './handleStore'

// setup.ts で fake-indexeddb/auto を読み込み済み
describe('handleStore', () => {
  it('保存した複数ハンドルを読み戻せる', async () => {
    await save_handles([
      { name: 'folder-a' } as unknown as FileSystemDirectoryHandle,
      { name: 'folder-b' } as unknown as FileSystemDirectoryHandle,
    ])
    const loaded = await load_handles()
    expect(loaded.map((h) => h.name)).toEqual(['folder-a', 'folder-b'])
  })

  it('空配列を保存すると空配列を返す', async () => {
    await save_handles([])
    expect(await load_handles()).toEqual([])
  })
})
