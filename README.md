# こんだて旅 (kondate-tabi)

具材から作れるレシピを提案する Tauri 2 + Svelte 5 (TypeScript) のプロトタイプです。

- 具材をカテゴリごとに選択 → 作れる／あと1〜2品で作れるレシピを表示
- 「今日の献立ガチャ」で候補をスロット風にシャッフル（履歴付き）
- モックデータ: `src/lib/data/base.json`（家庭・給食の定番15品、具材46種）
  - 分量は目安です。油・水は常備している前提で材料に含めていません。
- 調味料は既定で「家にある」前提でマッチングします（UIで切替可）。

## 開発

```sh
pnpm install
pnpm dev          # ブラウザで動作確認 (http://localhost:1420)
pnpm check        # svelte-check
pnpm tauri dev    # デスクトップアプリとして起動（Rust と Tauri の前提環境が必要）
```

初回ビルド前にアイコンを生成する場合: `pnpm tauri icon <元画像.png>`

## 構成

```
src/lib/types.ts        型定義
src/lib/data/base.json  モックデータ（Rust 側からも include_str! で共有）
src/lib/matching.ts     マッチング（純粋関数）
src/lib/components/     UI コンポーネント
src-tauri/              Tauri 2（find_matching_recipes コマンド）
```

## データパック

レシピ・具材・タグは「パック」単位で管理します（形式は `src/lib/types.ts` の `Pack`）。

- 標準パック: `src/lib/data/base.json`（軸 `facets` とタグ `tags` の辞書を含む）
- 追加パック: `src/lib/data/packs/*.json` に置くと自動で読み込まれます（例: `tohoku.json`）
- タグは軸ごとの辞書で、1つのレシピが複数のタグを持てます。絞り込みは「同じ軸はOR、軸が違えばAND」です。
- パック独自の具材・レシピの `id` は `パックid.名前`（例: `tohoku.kiritanpo`）にして、他と衝突しないようにします。
- Rust 側は現状、標準パックのみを読み込みます。
- レシピは既存の書籍やサイトの文章を写さず、自分の言葉で要点をまとめてください。

## パントリーと履歴

- **パントリー**: 家にある具材を登録します。「探す」では登録済みの具材が自動で使われます（画面で切替可）。
- **履歴**: レシピ詳細の「今日作った・食べた」で記録します。最近作ったものはガチャや同順位の並びで出にくくなり、一度も作っていないものは出やすくなります。
- 保存先は `src/lib/storage.ts`（現状は localStorage）。SQLite などに替える場合はここを差し替えます。
