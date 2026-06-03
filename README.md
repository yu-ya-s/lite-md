# lite-md

軽量で「文書・ローカルファイルは外部送信ゼロ」を目指す Web Markdown エディタ。

## 特徴（計画）

- 分割ビューのリアルタイムプレビュー
- ローカルフォルダをブラウザ内で直接読み書き（File System Access API / Chromium系）
- 文書・ローカルファイルはサーバーに送信しない
- Mermaid（ブラウザ内描画）/ PlantUML（レンダリングサーバー設定式）
- シンタックスハイライト
- `.md` / 自己完結HTML エクスポート

## 技術スタック

- Vite + React + TypeScript
- Vitest + Testing Library（テスト）

## 開発コマンド

```bash
npm install
npm run dev            # 開発サーバー
npm test               # テスト実行
npm run test:coverage  # カバレッジ計測
npm run build          # 型チェック + 本番ビルド
npm run lint           # Lint
npm run format         # 整形
```

## ブラウザ対応

フォルダ参照は Chrome / Edge（Chromium系）。非対応ブラウザ（Firefox / Safari）では単一ファイルのフォールバックを提供予定。
