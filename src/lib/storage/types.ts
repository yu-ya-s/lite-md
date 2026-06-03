export type FileNode = {
  kind: 'file'
  name: string
  path: string
}

export type DirectoryNode = {
  kind: 'directory'
  name: string
  path: string
  children: TreeNode[]
}

export type TreeNode = FileNode | DirectoryNode

/**
 * ワークスペース（編集対象の文書群）へのアクセスを抽象化するインターフェース。
 * 現状は File System Access API 実装のみだが、将来クラウド同期実装を
 * 差し替えられるようにこの境界を設けている。
 */
export interface WorkspaceStorage {
  readonly name: string
  build_tree(): Promise<TreeNode[]>
  read_file(path: string): Promise<string>
  write_file(path: string, content: string): Promise<void>
}
