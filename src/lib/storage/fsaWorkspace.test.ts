import { FsaWorkspace } from './fsaWorkspace'
import { create_mock_directory } from '../../test/fsMocks'

describe('FsaWorkspace', () => {
  it('Markdownのみツリーに含め、ディレクトリを先頭に名前順で並べる', async () => {
    const root = create_mock_directory('root', {
      'a.md': '# A',
      'readme.txt': 'ignore',
      docs: { 'b.markdown': '# B' },
      empty: { 'note.txt': 'x' },
    })
    const ws = new FsaWorkspace(root)
    const tree = await ws.build_tree()

    // docs(ディレクトリ) が先、その後 a.md。empty は md を含まないので除外
    expect(tree.map((n) => n.name)).toEqual(['docs', 'a.md'])
    const docs = tree[0]
    expect(docs.kind).toBe('directory')
    if (docs.kind === 'directory') {
      expect(docs.children.map((c) => c.name)).toEqual(['b.markdown'])
      expect(docs.children[0].path).toBe('docs/b.markdown')
    }
  })

  it('ファイルを読み込める', async () => {
    const root = create_mock_directory('root', { 'a.md': '# Hello' })
    const ws = new FsaWorkspace(root)
    await ws.build_tree()
    expect(await ws.read_file('a.md')).toBe('# Hello')
  })

  it('書き込んだ内容を読み戻せる', async () => {
    const root = create_mock_directory('root', { 'a.md': 'old' })
    const ws = new FsaWorkspace(root)
    await ws.build_tree()
    await ws.write_file('a.md', 'new content')
    expect(await ws.read_file('a.md')).toBe('new content')
  })

  it('存在しないパスの読み込みはエラー', async () => {
    const root = create_mock_directory('root', { 'a.md': 'x' })
    const ws = new FsaWorkspace(root)
    await ws.build_tree()
    await expect(ws.read_file('missing.md')).rejects.toThrow()
  })

  it('存在しないパスの書き込みはエラー', async () => {
    const root = create_mock_directory('root', { 'a.md': 'x' })
    const ws = new FsaWorkspace(root)
    await ws.build_tree()
    await expect(ws.write_file('missing.md', 'y')).rejects.toThrow()
  })
})
