import { renderHook, act } from '@testing-library/react'
import { useAutoSave } from './useAutoSave'
import { useWorkspaceStore } from '../store/workspaceStore'

const initial_state = useWorkspaceStore.getState()

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useWorkspaceStore.setState(initial_state, true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ファイル選択中で dirty なら遅延後に save を呼ぶ', () => {
    const save = vi.fn(async () => {})
    useWorkspaceStore.setState({
      current: { workspace_id: 'ws-1', path: 'a.md' },
      save_status: 'saved',
      content: 'x',
      save,
    })
    renderHook(() => useAutoSave(500))

    act(() => {
      useWorkspaceStore.setState({ content: 'y', save_status: 'dirty' })
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(save).toHaveBeenCalledTimes(1)
  })

  it('ファイル未選択なら save を呼ばない', () => {
    const save = vi.fn(async () => {})
    useWorkspaceStore.setState({ current: null, save_status: 'idle', content: 'x', save })
    renderHook(() => useAutoSave(500))

    act(() => {
      useWorkspaceStore.setState({ content: 'z' })
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(save).not.toHaveBeenCalled()
  })
})
