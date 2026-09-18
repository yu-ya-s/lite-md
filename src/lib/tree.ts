import type { FileNode, TreeNode } from './storage/types'

/**
 * 指定の接頭辞で始まるファイルをツリーから除外する（表示用のフィルタ）。
 * フィルタ後に空になったディレクトリも取り除く。実ファイルには影響しない。
 */
export function filter_out_prefixed(nodes: TreeNode[], prefix: string): TreeNode[] {
  const result: TreeNode[] = []
  for (const node of nodes) {
    if (node.kind === 'file') {
      if (!node.name.startsWith(prefix)) {
        result.push(node)
      }
    } else {
      const children = filter_out_prefixed(node.children, prefix)
      if (children.length > 0) {
        result.push({ ...node, children })
      }
    }
  }
  return result
}

/**
 * ツリーを再帰的に潜り、全ファイルを平坦な配列にして返す（一括選択の対象集めに使う）。
 */
export function collect_files(nodes: TreeNode[]): FileNode[] {
  const result: FileNode[] = []
  for (const node of nodes) {
    if (node.kind === 'file') {
      result.push(node)
    } else {
      result.push(...collect_files(node.children))
    }
  }
  return result
}
