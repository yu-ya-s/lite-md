import { renderHook } from '@testing-library/react'
import { useExternalChangeWatcher } from './useExternalChangeWatcher'
import { useWorkspaceStore } from '../store/workspaceStore'

const initial_state = useWorkspaceStore.getState()

describe('useExternalChangeWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useWorkspaceStore.setState(initial_state, true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('一定間隔で check_external_change を呼ぶ', () => {
    const check_external_change = vi.fn(async () => {})
    useWorkspaceStore.setState({ check_external_change })
    renderHook(() => useExternalChangeWatcher(1000))

    vi.advanceTimersByTime(3000)
    expect(check_external_change.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('アンマウントで停止する', () => {
    const check_external_change = vi.fn(async () => {})
    useWorkspaceStore.setState({ check_external_change })
    const { unmount } = renderHook(() => useExternalChangeWatcher(1000))
    unmount()
    vi.advanceTimersByTime(3000)
    expect(check_external_change).not.toHaveBeenCalled()
  })
})
