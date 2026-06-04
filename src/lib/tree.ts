import type { TreeNode } from './storage/types'

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
