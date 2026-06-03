import { save_handle, load_handle, clear_handle } from './handleStore'

// setup.ts で fake-indexeddb/auto を読み込み済み
describe('handleStore', () => {
  it('保存したハンドルを読み戻せる', async () => {
    const fake = { name: 'my-folder', kind: 'directory' } as unknown as FileSystemDirectoryHandle
    await save_handle(fake)
    const loaded = await load_handle()
    expect(loaded?.name).toBe('my-folder')
  })

  it('clear 後は null を返す', async () => {
    await save_handle({ name: 'x' } as unknown as FileSystemDirectoryHandle)
    await clear_handle()
    expect(await load_handle()).toBeNull()
  })
})
