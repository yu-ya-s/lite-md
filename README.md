# lite-md

軽量で「文書・ローカルファイルは外部送信しない」ことを重視した Web Markdown エディタ。

ローカルフォルダをブラウザ内で直接読み書きし、編集内容はサーバーに送らずに完結します。

## 特徴

- 分割ビュー（エディタ＋プレビュー）のリアルタイムプレビュー
- 表示モード切替: エディタ＋プレビュー / プレビューのみ（中央寄せ・読みやすい幅）
- ローカルフォルダをブラウザ内で直接読み書き（File System Access API）
- 複数フォルダを同時に開ける。フォルダごとに表示名（ラベル）を付けて区別可能
- 保存モードを選択可能（既定: 手動保存 / 自動保存）。手動は Ctrl+S または 💾 ボタン
- 変更行ハイライト（保存時点からの差分をエディタ上に表示、保存で解消）
- 連動スクロール、サイドバー最小化、中央ドラッグでの幅調整（矢印キーでも調整可）
- シンタックスハイライト（描画時に遅延ロード）
- 図: Mermaid（ブラウザ内描画）/ PlantUML（レンダリングサーバー方式・URL設定可）
- ライト / ダークテーマ、フォントは Noto Sans JP を同梱（外部CDN不使用）
- 初回起動時にヘルプを自動表示。ツールバーの ? でいつでも再表示

## プライバシー（外部送信について）

- 文書本文・ローカルファイルは外部に送信しません。読み書きはすべてブラウザ内（File System Access API）で完結します。
- Markdown 内の外部画像（`http(s)`）は既定で読み込みません（トラッキング画像等を防止）。設定でオプトイン可能です。
- PlantUML を有効化した場合のみ、図ブロックのソースが設定したレンダリングサーバーに送信されます（Mermaid・文書本文は送信されません）。プライバシー重視なら自前サーバーを利用できます（下記）。
- 保存される設定（localStorage）は UI 設定とサーバーURLのみで、文書内容は含みません。フォルダのアクセス権は IndexedDB に保持します。

## ブラウザ対応

- フォルダ参照: Chrome / Edge など Chromium 系（File System Access API 対応ブラウザ）
- 非対応ブラウザ（Firefox / Safari）: 単一ファイルの読み込みのみ（フォールバック）

## 開発

```bash
npm install
npm run dev            # 開発サーバー（http://localhost:5173）
npm test               # テスト実行
npm run test:coverage  # カバレッジ計測（80%閾値）
npm run build          # 型チェック + 本番ビルド（dist/）
npm run lint           # Lint
npm run format         # 整形
```

Node は 22 を使用します（Volta でプロジェクトに固定済み。`volta` 未使用の場合は Node 20.19+ / 22 を利用してください）。

## PlantUML を自前サーバーで使う（任意）

公式サーバー（既定）に図ソースを送りたくない場合は、ローカルでサーバーを起動して設定で切り替えます。

```bash
docker run -d -p 8080:8080 plantuml/plantuml-server
```

設定（⚙）→ PlantUML → レンダリングサーバーに `http://localhost:8080` を指定。

## デプロイ（Vercel）

静的サイトとしてデプロイできます。`vercel.json` にビルド設定とセキュリティヘッダ（CSP 等）を定義済みです。

- GitHub 連携: リポジトリを Vercel にインポートすると、`npm run build` →  `dist/` が自動配信されます（プッシュごとに自動デプロイ・`*.vercel.app` ドメイン付与）。
- CLI:

```bash
npm i -g vercel
vercel        # プレビュー環境
vercel --prod # 本番
```

セキュリティヘッダ（CSP / Referrer-Policy / X-Content-Type-Options 等）は `vercel.json` で付与されます。Cloudflare Pages 等の他ホストを使う場合は、同等のヘッダを各ホストの設定で付与してください。

## 技術スタック

- Vite + React 19 + TypeScript
- 状態管理: zustand
- エディタ: CodeMirror 6（@uiw/react-codemirror）
- Markdown: markdown-it + DOMPurify（サニタイズ）
- 図: mermaid / plantuml-encoder、ハイライト: highlight.js
- テスト: Vitest + Testing Library
