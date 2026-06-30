import { useState } from 'react'
import { DONE_PREFIX, useWorkspaceStore } from '../store/workspaceStore'
import type { DirectoryNode, FileNode, TreeNode } from '../lib/storage/types'

function FileItem({ workspace_id, node }: { workspace_id: string; node: FileNode }) {
  const open_file = useWorkspaceStore((s) => s.open_file)
  const toggle_done = useWorkspaceStore((s) => s.toggle_done)
  const current = useWorkspaceStore((s) => s.current)
  const is_active = current?.workspace_id === workspace_id && current.path === node.path
  const is_done = node.name.startsWith(DONE_PREFIX)

  return (
    <li className="tree__item">
      <button
        type="button"
        className={`tree__file${is_active ? ' tree__file--active' : ''}`}
        title={node.name}
        onClick={() => void open_file(workspace_id, node.path)}
      >
        {node.name}
      </button>
      <button
        type="button"
        className={`tree__done${is_done ? ' tree__done--active' : ''}`}
        aria-label={is_done ? `${node.name} の処理済みを解除` : `${node.name} を処理済みにする`}
        aria-pressed={is_done}
        title={is_done ? '処理済みを解除（【済】を外す）' : '処理済みにする（【済】を付ける）'}
        onClick={() => void toggle_done({ workspace_id, path: node.path })}
      >
        {is_done ? '↩' : '済'}
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
        title={node.name}
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
