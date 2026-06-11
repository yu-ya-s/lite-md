# Lessons

## UI系の要望は「表示形式」を確認してから実装する（2026-06-11）

### 症状
「初回は操作方法が分からないだろうからヘルプ出したい」に対し、モーダルの一覧型ヘルプを実装したが、ユーザーの意図は「ボタンごとに順番に吹き出しで説明するチュートリアル（コーチマーク）形式」だった。

### 原因
「ヘルプを出す」には複数の表示形式（一覧モーダル / ステップ式ツアー / 空状態ガイド等）があり体験が大きく異なるのに、チェックポイント設計（選択肢の提示）をせず定番のモーダル形式を選んで進めた。

### How to apply
- UI・UX系の要望は、実装前に表示形式の選択肢（A案/B案）を提示するか、「どう見える想定か」を一文で確認する
- 特に「初心者向け」「案内」「ガイド」系の要望はツアー形式の可能性を必ず候補に入れる

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

## 仕上げセルフレビューで得た教訓（2026-06-04）

### 非同期の後処理は「stale 判定」でガードする
innerHTML を再設定→非同期で図描画する構成では、描画完了前に内容が変わると古い処理が新DOMへ書き込みうる。effect のクリーンアップで `let stale=false`→`stale=true` を立て、各ノード書き込み前に `is_stale()` で中断する。

### IndexedDB トランザクションは onerror/onabort も必ず設定
`request.onerror` だけだと、quota超過等で request を経由せず tx 全体が abort された際に Promise が未解決のままハングする。`tx.onerror` と `tx.onabort` でも reject する。

### await 後は「対象がまだ同じか」を確認してから状態更新
保存などの非同期完了後に状態を書き込む前に、対象（current ファイル等）が切り替わっていないか確認する。切り替わっていたら上書きしない。

### File System Access の writable は失敗時に abort
`writable.write()` が失敗したら `writable.close()` ではなく `writable.abort()` で書きかけを破棄してから再throwする。

### プライバシー重視アプリでは Markdown 内の外部画像に注意
`![](http...)` はプレビュー時に外部取得され「外部送信ゼロ」を破る。DOMPurify の `afterSanitizeAttributes` フックで http(s) 画像の src を退避（data-blocked-src）し、設定でオプトインにする。

### **How to apply**
- 非同期後処理つきの描画、IndexedDB、保存処理を書くときは上記4点を最初から織り込む。
- 「外部送信ゼロ」等のプライバシー方針を掲げる場合、画像・リンク・サブリソースの自動取得経路を必ず洗い出す。
