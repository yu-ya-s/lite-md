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

### Phase 1: プロジェクト基盤
- [ ] Vite + React + TS 雛形、ESLint/Prettier、Vitest
- [ ] 基本レイアウト（ツールバー / サイドバー / 分割ペイン）+ CSS変数テーマ + ダーク/ライト切替
- [ ] スモークテスト、`npm test` / `npm run build` が通る
- [ ] 初期コミット 🎉

### Phase 2: エディタ + ライブプレビュー（コア）
- [ ] CodeMirrorエディタ、markdown-itパイプライン、DOMPurifyサニタイズ
- [ ] 分割ペイン、デバウンス付きリアルタイム反映
- [ ] テスト → コミット 👍

### Phase 3: ローカルフォルダ連携（File System Access API）
- [ ] フォルダを開く / ファイルツリー / 読込 / 保存 / 自動保存（デバウンス）
- [ ] IndexedDBハンドル永続化・権限再要求、非対応ブラウザのフォールバック
- [ ] ストレージ層をインターフェース化（将来のクラウド同期に備える）
- [ ] テスト → コミット 👍

### Phase 4: 図とシンタックスハイライト
- [ ] highlight.js、Mermaidフェンス描画（遅延ロード）
- [ ] PlantUMLフェンス描画（```plantuml / ```uml、エンコード、サーバーURL設定、非同期）
- [ ] 設定ダイアログ（PlantUMLサーバーURL・テーマ）、初回送信同意表示
- [ ] テスト → コミット 👍

### Phase 5: ツールバー・ショートカット
- [ ] 太字/見出し/リスト/リンク/コード等の挿入、Ctrl+B等ショートカット
- [ ] テスト → コミット 🚸

### Phase 6: エクスポート
- [ ] `.md` ダウンロード、自己完結HTML（CSS・ハイライトテーマ・描画済みSVG埋め込み）
- [ ] テスト → コミット 👍

### Phase 7: 仕上げ・検証
- [ ] レスポンシブ、空状態、エラーハンドリング、アクセシビリティ
- [ ] カバレッジ80%以上、クリティカルフローのE2E（Playwright）
- [ ] README整備、code-reviewer / security-reviewer レビュー → コミット ✅📝

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
