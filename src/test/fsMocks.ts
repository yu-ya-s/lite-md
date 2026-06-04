// テスト用に File System Access API のハンドルを模倣するモック生成ヘルパー。
// ネストしたオブジェクトでフォルダ構成を表現する（string=ファイル内容, object=サブフォルダ）。
// move() によるリネームを再現するため、名前は entry オブジェクトで共有・可変にする。

export type DirectorySpec = { [name: string]: string | DirectorySpec }

type Entry = {
  name: string
  handle: FileSystemDirectoryHandle | FileSystemFileHandle
}

function make_file_handle(entry: Entry, box: { value: string }): FileSystemFileHandle {
  return {
    kind: 'file',
    get name() {
      return entry.name
    },
    async getFile() {
      return { text: async () => box.value } as File
    },
    async createWritable() {
      return {
        async write(data: string) {
          box.value = data
        },
        async close() {},
        async abort() {},
      } as unknown as FileSystemWritableFileStream
    },
    async move(new_name: string) {
      entry.name = new_name
    },
    async queryPermission() {
      return 'granted' as PermissionState
    },
    async requestPermission() {
      return 'granted' as PermissionState
    },
  } as unknown as FileSystemFileHandle
}

function make_dir_handle(name: string, spec: DirectorySpec): FileSystemDirectoryHandle {
  const entries: Entry[] = []
  for (const [key, value] of Object.entries(spec)) {
    const entry: Entry = { name: key, handle: null as unknown as FileSystemFileHandle }
    entry.handle =
      typeof value === 'string' ? make_file_handle(entry, { value }) : make_dir_handle(key, value)
    entries.push(entry)
  }

  return {
    kind: 'directory',
    name,
    async *entries() {
      for (const entry of entries) {
        yield [entry.name, entry.handle] as [string, FileSystemDirectoryHandle | FileSystemFileHandle]
      }
    },
    async queryPermission() {
      return 'granted' as PermissionState
    },
    async requestPermission() {
      return 'granted' as PermissionState
    },
  } as unknown as FileSystemDirectoryHandle
}

export function create_mock_directory(name: string, spec: DirectorySpec): FileSystemDirectoryHandle {
  return make_dir_handle(name, spec)
}
