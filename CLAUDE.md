# admob-tauri

`@capacitor-community/admob` 8.3.0 を Tauri 2 のモバイルプラグイン（iOS・Android）に移植する公開リポジトリ。API は上流と同じ名前・引数・結果・イベント。README・コードのコメント・PR は英語（Tauri コミュニティ向け）。手本は `org-408/purchases-tauri`。

- 作業の流れは [docs/WORKFLOW.md](docs/WORKFLOW.md) に従う

## 今の位置づけ
- v0.1.1 まで tag 済み（Issue #1）。**いずれ crates.io・npm に `admob-tauri` で公開する計画**（[docs/ROADMAP.md](docs/ROADMAP.md)）。公開の実行はユーザーの確認を取ってから

## 決まり
- 統合点は `develop`。ブランチは `feature/T<Issue番号>-<説明>`。tag は `v<版>`
- 上流のネイティブコードは、橋渡し（Capacitor の呼び出し・通知）以外を変えない。`__tests__/apiParity.test.ts` が上流との抜けを見張る
- テスト広告 ID は Google 公開のものだけ。本番の広告 ID・アカウント情報は入れない

<!-- workflow-kit:common:begin（この印の間は /kickoff が書き換える。直すときは org-408/workflow-kit の profiles/common/claude-md.md） -->

## 進め方（workflow-kit）

- 作業の流れは `docs/WORKFLOW.md`（無い PJ では、この CLAUDE.md とこれまでの PR の形に合わせる）。重い変更は `.github/ISSUE_TEMPLATE/decision.md` の決める紙を先に（`/decide`）
- この CLAUDE.md は 200 行未満に保つ。話題ごとの記録は `.claude/rules/`（`paths:` つき）や `docs/` に置く

<!-- workflow-kit:common:end -->
