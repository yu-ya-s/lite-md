import { useState } from 'react'
import { useWorkspaceStore } from '../store/workspaceStore'
import type { DirectoryNode, FileNode, TreeNode } from '../lib/storage/types'

function FileItem({ workspace_id, node }: { workspace_id: string; node: FileNode }) {
  const open_file = useWorkspaceStore((s) => s.open_file)
  const current = useWorkspaceStore((s) => s.current)
  const is_active = current?.workspace_id === workspace_id && current.path === node.path

  return (
    <li>
      <button
        type="button"
        className={`tree__file${is_active ? ' tree__file--active' : ''}`}
        onClick={() => void open_file(workspace_id, node.path)}
      >
        {node.name}
      </button>
    </li>
  )
}

function DirItem({ workspace_id, node }: { workspace_id: string; node: DirectoryNode }) {
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
      {open && <TreeList workspace_id={workspace_id} nodes={node.children} />}
    </li>
  )
}

function TreeList({ workspace_id, nodes }: { workspace_id: string; nodes: TreeNode[] }) {
  return (
    <ul className="tree__list">
      {nodes.map((node) =>
        node.kind === 'directory' ? (
          <DirItem key={node.path} workspace_id={workspace_id} node={node} />
        ) : (
          <FileItem key={node.path} workspace_id={workspace_id} node={node} />
        ),
      )}
    </ul>
  )
}

export function FileTree({ workspace_id, nodes }: { workspace_id: string; nodes: TreeNode[] }) {
  if (nodes.length === 0) {
    return <p className="app__placeholder">Markdownファイルがありません</p>
  }
  return <TreeList workspace_id={workspace_id} nodes={nodes} />
}
