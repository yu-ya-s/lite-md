import { useState } from 'react'
import { useWorkspaceStore } from '../store/workspaceStore'
import type { DirectoryNode, FileNode, TreeNode } from '../lib/storage/types'

function FileItem({ node }: { node: FileNode }) {
  const open_file = useWorkspaceStore((s) => s.open_file)
  const current_path = useWorkspaceStore((s) => s.current_path)
  const is_active = current_path === node.path

  return (
    <li>
      <button
        type="button"
        className={`tree__file${is_active ? ' tree__file--active' : ''}`}
        onClick={() => void open_file(node.path)}
      >
        {node.name}
      </button>
    </li>
  )
}

function DirItem({ node }: { node: DirectoryNode }) {
  const [open, set_open] = useState(true)

  return (
    <li>
      <button
        type="button"
        className="tree__dir"
        aria-expanded={open}
        onClick={() => set_open((value) => !value)}
      >
        <span className="tree__caret">{open ? '▾' : '▸'}</span> {node.name}
      </button>
      {open && <TreeList nodes={node.children} />}
    </li>
  )
}

function TreeList({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="tree__list">
      {nodes.map((node) =>
        node.kind === 'directory' ? (
          <DirItem key={node.path} node={node} />
        ) : (
          <FileItem key={node.path} node={node} />
        ),
      )}
    </ul>
  )
}

export function FileTree({ nodes }: { nodes: TreeNode[] }) {
  if (nodes.length === 0) {
    return <p className="app__placeholder">Markdownファイルがありません</p>
  }
  return <TreeList nodes={nodes} />
}
