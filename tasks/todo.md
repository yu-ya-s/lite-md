# lite-md 実装計画

軽量で「文書・ローカルファイルは外部送信ゼロ」のWeb Markdownエディタ。

## 確定した技術選定

- フレームワーク: Vite + React + TypeScript（軽量重視。SSR不要のためNextは不採用）
- エディタ: CodeMirror 6（@uiw/react-codemirror）
- Markdown: markdown-it + DOMPurify（サニタイズ）
- ハイライト: highlight.js
- 図: Mermaid（ブラウザ内描画・遅延ロード）/ PlantUML（レンダリングサーバー設定式・esa同様の方式）
- ファイルI/O: File System Access API（Chromium系）+ IndexedDBでハンドル永続化
- スタイル: CSS変数による軽量自作スタイル（ライト/ダーク）
- 状態管理: zustand（極小）
- 配信: Vercel（無料・自動ドメイン・push deploy）
- 将来: ストレージ層を抽象化し、ログイン+クラウド同期（Supabase想定）を後付け可能に

## フェーズ

### Phase 1: プロジェクト基盤 ✅
- [x] Vite + React + TS 雛形、ESLint/Prettier、Vitest
- [x] 基本レイアウト（ツールバー / サイドバー / 分割ペイン）+ CSS変数テーマ + ダーク/ライト切替
- [x] スモークテスト、`npm test` / `npm run build` が通る
- [x] 初期コミット 🎉（a48dd68）

### Phase 2: エディタ + ライブプレビュー（コア）✅
- [x] CodeMirrorエディタ、markdown-itパイプライン、DOMPurifyサニタイズ
- [x] 分割ペイン、デバウンス付きリアルタイム反映（200ms）
- [x] テスト（24件・分岐92.8%）→ コミット 👍
- メモ: バンドル325KB gzip（CodeMirror分）。Mermaid導入時に遅延ロード/コード分割で軽量化する

### Phase 3: ローカルフォルダ連携（File System Access API）✅
- [x] フォルダを開く / ファイルツリー / 読込 / 保存 / 自動保存（800msデバウンス）
- [x] IndexedDBハンドル永続化・権限再要求（前回のフォルダを開く）、非対応ブラウザのフォールバック（単一ファイル読込）
- [x] ストレージ層を WorkspaceStorage インターフェースで抽象化（将来のクラウド同期に備える）
- [x] テスト（合計65件・分岐92.4%）→ コミット 👍
- メモ: showDirectoryPicker / queryPermission 等の型を src/types/fsa.d.ts で補完。テストは fake-indexeddb とFSハンドルモックで実施

### Phase 4: 図とシンタックスハイライト ✅
- [x] highlight.js（描画後に遅延ロードして適用・初期バンドルから除外）、Mermaidフェンス描画（遅延ロード・テーマ追従・キャッシュ）
- [x] PlantUMLフェンス描画（```plantuml / ```uml、plantuml-encoder、サーバーURL設定、img方式・esa同様）
- [x] 設定ダイアログ（PlantUML有効/無効・サーバーURL、送信に関する注意書き）
- [x] テスト（合計81件・分岐82.1%）→ コミット 👍
- メモ: 既定はPlantUML有効＋公式サーバー（すぐ使える）。設定で自前サーバー(localhost:8080)へ切替・無効化可。図ソースの保持は data-source に encodeURIComponent で格納（DOMPurifyの属性除去を回避）。Mermaidは遅延チャンク分割済み。メインバンドル gzip 約331KB

### Phase 5: ツールバー・ショートカット ✅
- [x] 書式ツールバー（見出し/太字/斜体/引用/箇条書き/コード/リンク）
- [x] ショートカット（Ctrl+B/Ctrl+I/Ctrl+K）をCodeMirrorに組み込み
- [x] 書式コマンドは EditorState ベースの純関数として実装・テスト（合計91件）→ コミット 🚸

### 追加要望（2026-06-03）
- [x] ダークモードのエディタ文字色修正 + フォントをNoto Sans JPに（自己ホスト）💄
- [x] サイドバー最小化（☰トグル・localStorage保持）🚸
- [x] 中央ドラッグでエディタ/プレビュー幅変更（localStorage保持）🚸
- [x] フォルダ複数同時オープン（WorkspaceStorage配列化・ハンドル複数永続化）👍
- [x] 表示モード切替（エディタ+プレビュー / プレビューのみ・localStorage保持）🚸
- [x] サイドバーのファイル名ホバー表示（title）🚸
- [x] プレビューのみモードの中央寄せ・最大幅1100px 💄
- [x] ファビコン（青地に白の#）💄
- [x] 保存モード設定（手動=既定 / 自動）＋ Ctrl+S・💾保存ボタン 👍
- [x] フォルダに表示名（ラベル）を付けて区別（✎で編集・永続化）👍
  - 注: ブラウザAPIは絶対パスを返さないため、ユーザー指定ラベルで識別する方式
- [x] 変更行ハイライト（保存時点からの差分をエディタの行に表示・保存で解消）👍
  - LCSの行差分を自前実装（依存追加なし）、2000行超は省略

### 追加機能: エディタ↔プレビューの連動スクロール ✅
- [x] スクロール位置を比例同期（useScrollSync、フィードバックループ抑止つき）
- [x] プレビューdiv自体をスクロール対象化、CodeMirrorのscrollDOMと同期
- [x] テスト（合計93件）→ コミット 🚸

### Phase 6: エクスポート（スキップ）
- ユーザー判断により不要のためスキップ（2026-06-03）
- 必要になったら再開: `.md` ダウンロード、自己完結HTML（CSS・描画済みSVG埋め込み）

### Phase 7: 仕上げ・検証（進行中）
- [x] セルフコードレビュー（code-reviewer + security-reviewer 並列）→ 指摘修正
  - 堅牢性: write_file の abort、IndexedDB tx の onerror/onabort、save中のファイル切替ガード、図描画の stale ガード
  - セキュリティ/プライバシー: 外部画像を既定ブロック＋設定でオプトイン、PlantUMLサーバーURLのhttp/https検証、Mermaid SVGサニタイズ、mermaidキャッシュ上限
  - レビュー結果は Windows 側の レビュー結果フォルダにも保存
- [x] アクセシビリティ点検: 設定ダイアログ Esc/フォーカス、splitter キーボード操作（矢印キー・ARIA値）、コントラスト改善、エラー色の変数化
- [x] カバレッジ80%以上維持（128件・分岐81.9%）
- [x] README整備（特徴・プライバシー方針・開発/デプロイ手順・PlantUML自前サーバー手順）
- [x] Vercel配信設定（vercel.json: ビルド設定 + CSP/セキュリティヘッダ。modulepre%ポリフィル無効化でscript-src 'self'運用）
- [ ] （任意・未着手）クリティカルフローのE2E（Playwright）

### Phase 8: 配信設定 ✅（Phase 7と統合）
- [x] 静的ビルド + Vercel デプロイ設定（vercel.json）、README にデプロイ手順

### Phase 8: 配信設定
- [ ] 静的ビルド、Vercelデプロイ設定、READMEにデプロイ手順 → コミット 🔧

## リスク

- 高: File System Access API はChromium系のみ → フォールバックとE2Eの工夫が必要
- 中: PlantUMLは外部/自前サーバー依存 → 設定と初回同意表示で対応（文書全体は送らない）
- 中: 悪意ある.md/生HTMLによるXSS → DOMPurifyで緩和・テスト必須
- 中: Mermaidが大きい → 遅延ロードで初期バンドルを軽量に保つ

## 命名規約メモ

グローバル規約に従い、素のローカル変数・state・自作関数はスネークケース。
Reactが要求する箇所のみ慣例に従う（コンポーネント名はPascalCase、フックは `useXxx`）。

## レビュー

（各フェーズ完了時に追記）
