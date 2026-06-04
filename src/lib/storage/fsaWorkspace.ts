import type { TreeNode, WorkspaceStorage } from './types'

const MARKDOWN_PATTERN = /\.(md|markdown)$/i

/**
 * File System Access API の FileSystemDirectoryHandle を WorkspaceStorage として扱う実装。
 * ツリー構築時に各ファイルのハンドルを path をキーにキャッシュし、読み書きに使う。
 */
export class FsaWorkspace implements WorkspaceStorage {
  readonly name: string
  private readonly root: FileSystemDirectoryHandle
  private readonly file_handles: Map<string, FileSystemFileHandle>

  constructor(root: FileSystemDirectoryHandle) {
    this.root = root
    this.name = root.name
    this.file_handles = new Map()
  }

  async build_tree(): Promise<TreeNode[]> {
    this.file_handles.clear()
    return this.walk(this.root, '')
  }

  private async walk(dir: FileSystemDirectoryHandle, base_path: string): Promise<TreeNode[]> {
    const directories: TreeNode[] = []
    const files: TreeNode[] = []

    for await (const [name, handle] of dir.entries()) {
      const path = base_path ? `${base_path}/${name}` : name
      if (handle.kind === 'directory') {
        const children = await this.walk(handle, path)
        // Markdownを1つも含まないディレクトリはツリーに出さない
        if (children.length > 0) {
          directories.push({ kind: 'directory', name, path, children })
        }
      } else if (MARKDOWN_PATTERN.test(name)) {
        this.file_handles.set(path, handle)
        files.push({ kind: 'file', name, path })
      }
    }

    const by_name = (a: TreeNode, b: TreeNode) => a.name.localeCompare(b.name)
    directories.sort(by_name)
    files.sort(by_name)
    return [...directories, ...files]
  }

  async read_file(path: string): Promise<string> {
    const handle = this.file_handles.get(path)
    if (!handle) {
      throw new Error(`ファイルが見つかりません: ${path}`)
    }
    const file = await handle.getFile()
    return file.text()
  }

  async rename_file(path: string, new_name: string): Promise<string> {
    const handle = this.file_handles.get(path)
    if (!handle) {
      throw new Error(`ファイルが見つかりません: ${path}`)
    }
    // FileSystemFileHandle.move() は Chromium 系で同ディレクトリ内のリネームに使える
    const movable = handle as FileSystemFileHandle & { move?: (name: string) => Promise<void> }
    if (typeof movable.move !== 'function') {
      throw new Error('このブラウザはファイル名の変更に対応していません')
    }
    await movable.move(new_name)
    const slash = path.lastIndexOf('/')
    return slash >= 0 ? `${path.slice(0, slash + 1)}${new_name}` : new_name
  }

  async write_file(path: string, content: string): Promise<void> {
    const handle = this.file_handles.get(path)
    if (!handle) {
      throw new Error(`ファイルが見つかりません: ${path}`)
    }
    const writable = await handle.createWritable()
    try {
      await writable.write(content)
      await writable.close()
    } catch (e) {
      // 書き込み失敗時は書きかけを確定させず、確実にストリームを破棄する
      await writable.abort().catch(() => {})
      throw e
    }
  }
}
