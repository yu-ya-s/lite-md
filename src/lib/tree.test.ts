import { collect_files, filter_out_prefixed } from './tree'
import type { TreeNode } from './storage/types'

const PREFIX = '【済】'

describe('filter_out_prefixed', () => {
  it('接頭辞で始まるファイルを除外する', () => {
    const nodes: TreeNode[] = [
      { kind: 'file', name: 'a.md', path: 'a.md' },
      { kind: 'file', name: '【済】b.md', path: '【済】b.md' },
    ]
    expect(filter_out_prefixed(nodes, PREFIX).map((n) => n.name)).toEqual(['a.md'])
  })

  it('フィルタ後に空になったディレクトリを取り除く', () => {
    const nodes: TreeNode[] = [
      {
        kind: 'directory',
        name: 'done',
        path: 'done',
        children: [{ kind: 'file', name: '【済】x.md', path: 'done/【済】x.md' }],
      },
      {
        kind: 'directory',
        name: 'docs',
        path: 'docs',
        children: [
          { kind: 'file', name: '【済】y.md', path: 'docs/【済】y.md' },
          { kind: 'file', name: 'z.md', path: 'docs/z.md' },
        ],
      },
    ]
    const result = filter_out_prefixed(nodes, PREFIX)
    expect(result.map((n) => n.name)).toEqual(['docs'])
    const docs = result[0]
    expect(docs.kind === 'directory' && docs.children.map((c) => c.name)).toEqual(['z.md'])
  })

  it('該当が無ければそのまま返す', () => {
    const nodes: TreeNode[] = [{ kind: 'file', name: 'a.md', path: 'a.md' }]
    expect(filter_out_prefixed(nodes, PREFIX)).toHaveLength(1)
  })
})

describe('collect_files', () => {
  it('ネストしたディレクトリの中のファイルも平坦に返す', () => {
    const nodes: TreeNode[] = [
      { kind: 'file', name: 'a.md', path: 'a.md' },
      {
        kind: 'directory',
        name: 'docs',
        path: 'docs',
        children: [
          { kind: 'file', name: 'b.md', path: 'docs/b.md' },
          {
            kind: 'directory',
            name: 'nested',
            path: 'docs/nested',
            children: [{ kind: 'file', name: 'c.md', path: 'docs/nested/c.md' }],
          },
        ],
      },
    ]
    expect(collect_files(nodes).map((f) => f.path)).toEqual(['a.md', 'docs/b.md', 'docs/nested/c.md'])
  })

  it('ファイルが無ければ空配列を返す', () => {
    expect(collect_files([])).toEqual([])
  })
})
