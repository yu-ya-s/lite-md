// テスト用に File System Access API のハンドルを模倣するモック生成ヘルパー。
// ネストしたオブジェクトでフォルダ構成を表現する（string=ファイル内容, object=サブフォルダ）。

export type DirectorySpec = { [name: string]: string | DirectorySpec }

function make_file_handle(name: string, box: { value: string }): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    async getFile() {
      return { text: async () => box.value } as File
    },
    async createWritable() {
      return {
        async write(data: string) {
          box.value = data
        },
        async close() {},
      } as unknown as FileSystemWritableFileStream
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
  const entries: [string, FileSystemDirectoryHandle | FileSystemFileHandle][] = []
  for (const [key, value] of Object.entries(spec)) {
    if (typeof value === 'string') {
      entries.push([key, make_file_handle(key, { value })])
    } else {
      entries.push([key, make_dir_handle(key, value)])
    }
  }

  return {
    kind: 'directory',
    name,
    async *entries() {
      for (const entry of entries) {
        yield entry
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
