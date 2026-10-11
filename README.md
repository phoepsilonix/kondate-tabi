# こんだて旅 (kondate-tabi)

具材から作れるレシピを提案する Tauri 2 + Svelte 5 (TypeScript) のプロトタイプです。

- 具材をカテゴリごとに選択 → 作れる／あと1〜2品で作れるレシピを表示
- 「今日の献立ガチャ」で候補をスロット風にシャッフル（履歴付き）
- モックデータ: `src/lib/data/base.json`（家庭・給食の定番15品、具材46種）
  - 分量は目安です。油・水は常備している前提で材料に含めていません。
- 調味料は既定で「家にある」前提でマッチングします（UIで切替可）。

## 開発

```sh
npm install
npm run dev          # ブラウザで動作確認 (http://localhost:1420)
npm run check        # svelte-check
npm run tauri dev    # デスクトップアプリとして起動（Rust と Tauri の前提環境が必要）
```

初回ビルド前にアイコンを生成する場合: `npm run tauri icon <元画像.png>`

## 構成

```
src/lib/types.ts        型定義
src/lib/data/base.json  モックデータ（Rust 側からも include_str! で共有）
src/lib/matching.ts     マッチング（純粋関数）
src/lib/components/     UI コンポーネント
src-tauri/              Tauri 2（find_matching_recipes コマンド）
```
