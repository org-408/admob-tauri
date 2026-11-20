# 作業の流れ（ブランチ・PR・Issue）

> workflow-kit の型 common のひな形から作った。この PJ に合わせて直してよい（このファイルは PJ のもの）。
> 対象: この repo で作業するすべての Claude セッションと人。

## 1. ブランチ
- 作業の前に `git fetch origin` し、統合点（`develop`）から切る
- 1 つのまとまり = 1 ブランチ = 1 PR。名前は `feature/T<Issue 番号>-<説明>`・`fix/<説明>`・`docs/<説明>`
- Claude Code の worktree（`.claude/worktrees/<名前>`）はそのまま使ってよい
- マージしたらブランチを消す

## 2. コミット
- Issue に結び付く変更は番号を書く: 終わらせるなら `Closes #n`、途中なら `Refs #n`
- タスク番号は Issue 番号を使う（連番を手で振ると、並行のセッションとぶつかる）

## 3. PR
- 本文は英語。Summary・Changes・Issue・Test plan の型で書く。マージは merge commit（`gh pr merge <n> --merge`）
- CI が緑なら、Claude のセッションがマージまで進める
- 次のときは本文の頭に `**REVIEW NEEDED**: <何を見てほしいか>` と書き、人に任せる（workflow-kit の release-gate が、マージの前に聞く）
  - 認証・課金・データの形・外部サービスとのつなぎ方を変える
  - 後から変えにくいもの（保存の形・公開の名前・ID）

## 4. 重い変更は、決める紙を先に
- 認証・課金・データの形・外部サービス連携・方向性が変わるもの、PR が 3 本以上になりそうなものは、Issue を立て、決定をもらってから作る（`/decide`）
- 段階が 3 つ以上なら、段階ごとに子 Issue（sub-issue）を立て、PR の本文に `Closes #<子 Issue>` を書く。進捗の状態は Issue・PR の 1 か所にだけ持ち、表・図・ROADMAP に「済」と手で書かない。GitHub Projects を使うなら Board・Roadmap に載せる（「PR をマージしたら Done」の自動化は既定でオン）

## 5. 本番・配布
- 版は `v0.x.y`。`Cargo.toml`・`package.json`・Swift と Kotlin の版を同じにする（`apiParity` が見る）。マージ後、そのコミットに annotated tag `v<版>` を付ける
- crates.io・npm への公開は、ユーザーの確認を取ってから
