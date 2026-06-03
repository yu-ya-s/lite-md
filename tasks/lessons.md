# Lessons

## React の dangerouslySetInnerHTML と手動DOM書き換えの衝突（2026-06-03）

### 症状
Markdownプレビューで Mermaid / PlantUML の図が一瞬描画された後、生ソース文字列に戻ってしまう。

### 原因
プレビューを `dangerouslySetInnerHTML` で React に描画させつつ、図の描画は effect 内で同じDOMの innerHTML を手動で書き換えていた。React が（再レンダリングで）innerHTML を再適用したタイミングで、手動描画した図が上書きされて消える。React管理下のDOMを手動で書き換える典型的な競合。

### 対策
プレビュー内部を React の管理外に置く。`dangerouslySetInnerHTML` をやめ、effect 内で
`container.innerHTML = render_markdown(...)` → `render_diagrams(...)` の順に手動で行う。
React はプレビューの中身（children）を一切持たないため再適用が起きず、描画順序を完全に制御できる。

### How to apply
- 「HTMLを描画した後に、その中のDOMを非Reactコードで書き換える」場合は、その領域を ref + 手動 innerHTML にして React の管理外にする。`dangerouslySetInnerHTML` と手動DOM書き換えを併用しない。
- 非同期描画（遅延ロード等）の前段は生データを露出させず「描画中」表示にして、ちらつきと情報の見栄え崩れを防ぐ。
