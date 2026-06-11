import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { useWorkspaceStore } from './store/workspaceStore'

// jsdom では offsetParent が常に null / getBoundingClientRect が全0のため、
// ツアー dialog 表示を検証するテストにのみ個別に可視化モックを適用するヘルパ

// 復元用に jsdom 本来の offsetParent ディスクリプタを保持する
const offset_parent_descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')

function enable_tour_visibility(): void {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return document.body
    },
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    top: 100,
    right: 200,
    bottom: 140,
    width: 100,
    height: 40,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  } as DOMRect)
}

function restore_tour_visibility(): void {
  vi.restoreAllMocks()
  if (offset_parent_descriptor) {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', offset_parent_descriptor)
  } else {
    delete (HTMLElement.prototype as unknown as { offsetParent?: unknown }).offsetParent
  }
}

// App は内部で CodeMirror を描画するため、jsdom で安定動作する textarea に差し替える
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) => (
    <textarea
      data-testid="cm-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

import App from './App'

describe('App', () => {
  beforeEach(() => {
    // ヘルプ自動表示を既定で抑止し、既存テストの挙動を不変に保つ
    localStorage.clear()
    localStorage.setItem('lite-md:help-seen', '1')

    // ストアを既知の状態へ。init はテストでは副作用を起こさないよう no-op にする
    useWorkspaceStore.setState({
      content: '',
      current: null,
      save_status: 'idle',
      is_supported: false,
      workspaces: [],
      can_restore: false,
      external_changed: false,
      init: async () => {},
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('ツールバーにアプリタイトルを表示する', () => {
    render(<App />)
    const toolbar = screen.getByRole('banner')
    expect(within(toolbar).getByRole('heading', { name: 'lite-md' })).toBeInTheDocument()
  })

  it('エディタとプレビューの領域を表示する', () => {
    render(<App />)
    expect(screen.getByLabelText('エディタ')).toBeInTheDocument()
    expect(screen.getByLabelText('プレビュー')).toBeInTheDocument()
  })

  it('テーマ切替ボタンでテーマが切り替わる', () => {
    render(<App />)
    const before = document.documentElement.getAttribute('data-theme')
    fireEvent.click(screen.getByRole('button', { name: /モードに切替/ }))
    const after = document.documentElement.getAttribute('data-theme')
    expect(after).toBeTruthy()
    expect(after).not.toBe(before)
  })

  it('入力するとプレビューに反映される', async () => {
    render(<App />)
    fireEvent.change(screen.getByTestId('cm-editor'), {
      target: { value: '# 反映テスト' },
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '反映テスト' })).toBeInTheDocument()
    })
  })

  it('サイドバー切替ボタンでサイドバーを折りたためる', () => {
    render(<App />)
    const aside = screen.getByLabelText('ファイル一覧')
    expect(aside.className).not.toContain('app__sidebar--collapsed')
    fireEvent.click(screen.getByRole('button', { name: 'サイドバーの表示切替' }))
    expect(aside.className).toContain('app__sidebar--collapsed')
  })

  it('エディタとプレビューの間に区切り（separator）がある', () => {
    render(<App />)
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('ファイルを開いていると保存ボタンが表示されクリックで保存する', () => {
    const save = vi.fn(async () => {})
    useWorkspaceStore.setState({ current: { workspace_id: 'ws-1', path: 'a.md' }, save })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(save).toHaveBeenCalled()
  })

  it('Ctrl+S で保存を実行する', () => {
    const save = vi.fn(async () => {})
    useWorkspaceStore.setState({ current: { workspace_id: 'ws-1', path: 'a.md' }, save })
    render(<App />)
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(save).toHaveBeenCalled()
  })

  it('処理済みボタンで toggle_done を呼ぶ', () => {
    const toggle_done = vi.fn(async () => {})
    useWorkspaceStore.setState({ current: { workspace_id: 'ws-1', path: 'a.md' }, toggle_done })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '処理済みにする' }))
    expect(toggle_done).toHaveBeenCalled()
  })

  it('【済】付きファイルでは解除ラベルになる', () => {
    useWorkspaceStore.setState({ current: { workspace_id: 'ws-1', path: '【済】a.md' } })
    render(<App />)
    expect(screen.getByRole('button', { name: '処理済みを解除' })).toBeInTheDocument()
  })

  it('外部変更フラグが立つとバナーを表示し、再読み込みできる', () => {
    const reload_current = vi.fn(async () => {})
    useWorkspaceStore.setState({
      current: { workspace_id: 'ws-1', path: 'a.md' },
      external_changed: true,
      reload_current,
    })
    render(<App />)
    expect(screen.getByText(/外部で変更されました/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }))
    expect(reload_current).toHaveBeenCalled()
  })

  it('表示モードを「プレビューのみ」に切り替えられる', () => {
    render(<App />)
    const main = screen.getByLabelText('プレビュー').closest('.app__main') as HTMLElement
    expect(main.className).not.toContain('app__main--preview')

    fireEvent.click(screen.getByRole('button', { name: 'プレビューのみ表示' }))
    expect(main.className).toContain('app__main--preview')
    expect(screen.getByRole('button', { name: 'エディタを表示' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'エディタを表示' }))
    expect(main.className).not.toContain('app__main--preview')
  })

  it('区切りのドラッグでエディタ幅の比率が変わる', () => {
    render(<App />)
    const separator = screen.getByRole('separator')
    const main = separator.closest('.app__main') as HTMLElement
    main.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 1000,
        height: 0,
        right: 1000,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect

    fireEvent.pointerDown(separator)
    fireEvent.pointerMove(window, { clientX: 300 })
    expect(main.style.getPropertyValue('--editor-fr')).toBe('0.3fr')
    fireEvent.pointerUp(window)
  })

  it('区切りを矢印キーで操作してエディタ幅を変えられる', () => {
    render(<App />)
    const separator = screen.getByRole('separator')
    const main = separator.closest('.app__main') as HTMLElement
    const before = parseFloat(main.style.getPropertyValue('--editor-fr'))
    fireEvent.keyDown(separator, { key: 'ArrowLeft' })
    const after = parseFloat(main.style.getPropertyValue('--editor-fr'))
    expect(after).toBeLessThan(before)
  })

  // テスト 12: 初回アクセスでツアーが自動表示される
  it('初回アクセス（フラグなし）でツアーを自動表示する', async () => {
    localStorage.removeItem('lite-md:help-seen')
    enable_tour_visibility()
    render(<App />)
    const dialog = await screen.findByRole('dialog', { name: 'チュートリアル' })
    expect(dialog).toBeInTheDocument()
    // is_supported=false で js-tour-open-folder は DOM にないためステップ1スキップ
    // → 先頭の可視ステップは書式ツールバー
    expect(screen.getByText('書式ツールバー')).toBeInTheDocument()
    restore_tour_visibility()
  })

  // テスト 13: 自動表示後に localStorage フラグが '1' になる
  it('自動表示後に localStorage フラグが "1" になる', () => {
    localStorage.removeItem('lite-md:help-seen')
    // フラグの立ち上がりはツアー描画と独立しているため可視化不要
    render(<App />)
    expect(localStorage.getItem('lite-md:help-seen')).toBe('1')
  })

  // テスト 14: フラグありでツアーは自動表示されない。? ボタンは存在する
  it('フラグありでツアーは自動表示されない。? ボタンは存在する', () => {
    // beforeEach でフラグが立っているので追加設定不要
    render(<App />)
    expect(screen.queryByRole('dialog', { name: 'チュートリアル' })).toBeNull()
    expect(screen.getByRole('button', { name: 'ヘルプ' })).toBeInTheDocument()
  })

  // テスト 15: ? ボタンクリックでツアーが開く
  it('? ボタンクリックでツアーが開く', async () => {
    enable_tour_visibility()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'ヘルプ' }))
    const dialog = await screen.findByRole('dialog', { name: 'チュートリアル' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('書式ツールバー')).toBeInTheDocument()
    restore_tour_visibility()
  })

  // テスト 16: current が null でも ? ボタンは常時表示される
  it('current が null でも ? ボタンは常時表示される', () => {
    useWorkspaceStore.setState({ current: null })
    render(<App />)
    expect(screen.getByRole('button', { name: 'ヘルプ' })).toBeInTheDocument()
  })

  // テスト 17: ツアーを開いて閉じるボタンで閉じると dialog が消える
  it('ツアーを開いて閉じるボタンで閉じると dialog が消える', async () => {
    enable_tour_visibility()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'ヘルプ' }))
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    fireEvent.click(screen.getByRole('button', { name: 'チュートリアルを閉じる' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'チュートリアル' })).toBeNull()
    })
    restore_tour_visibility()
  })

  // テスト 18: 手動で開閉してもフラグは変化しない
  it('手動表示はフラグを変えない', async () => {
    enable_tour_visibility()
    // フラグが '1' の状態で手動表示
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'ヘルプ' }))
    await screen.findByRole('dialog', { name: 'チュートリアル' })
    fireEvent.click(screen.getByRole('button', { name: 'チュートリアルを閉じる' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'チュートリアル' })).toBeNull()
    })
    expect(localStorage.getItem('lite-md:help-seen')).toBe('1')
    restore_tour_visibility()
  })

  // テスト 19: localStorage 値が '0' のとき自動表示され、その後 '1' に上書きされる
  it('localStorage 値が "0" のとき自動表示されフラグが "1" に上書きされる', async () => {
    localStorage.setItem('lite-md:help-seen', '0')
    enable_tour_visibility()
    render(<App />)
    // '0' === '1' は false なので自動表示される
    const dialog = await screen.findByRole('dialog', { name: 'チュートリアル' })
    expect(dialog).toBeInTheDocument()
    expect(localStorage.getItem('lite-md:help-seen')).toBe('1')
    restore_tour_visibility()
  })
})
