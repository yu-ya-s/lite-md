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
 * ファイル名で絞り込む（サイドバーの検索窓用）。
 * query を空白区切りにした各語を、ファイル名に大文字小文字無視のAND条件で含むものだけ残す。
 * query が空なら nodes をそのまま返す。フィルタ後に空になったディレクトリも取り除く。
 */
export function filter_by_name(nodes: TreeNode[], query: string): TreeNode[] {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0)
  if (terms.length === 0) return nodes
  return filter_by_terms(nodes, terms)
}

function filter_by_terms(nodes: TreeNode[], terms: string[]): TreeNode[] {
  const result: TreeNode[] = []
  for (const node of nodes) {
    if (node.kind === 'file') {
      const lower_name = node.name.toLowerCase()
      if (terms.every((term) => lower_name.includes(term))) {
        result.push(node)
      }
    } else {
      const children = filter_by_terms(node.children, terms)
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
