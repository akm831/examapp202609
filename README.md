# examapp202609

593問の固定マスターを使う、○×1問1答の復習PWAです。回答・進捗・セッションはPostgreSQLに保存され、同じアカウントで端末間同期されます。

## 起動

1. `.env.example` を `.env` にコピーし、`AUTH_SECRET` を変更します。
2. `docker compose up -d` でPostgreSQLを起動します。
3. `pnpm install && pnpm db:gate` を実行します。
4. `pnpm dev` を実行し、`http://localhost:3000` を開きます。

検証は `pnpm test`、`pnpm typecheck`、`pnpm build`、DB接続済みなら `pnpm test:e2e` です。

## デプロイと教材更新

通常デプロイのビルドコマンドは `npm run build` を指定します。これは Prisma Client の生成と Next.js ビルドのみを行い、DBへの接続・マイグレーション・seed を実行しません。ロリポップ！側に `npm run db:gate && npm run build` のような独自ビルドコマンドを設定している場合は、`npm run build` に変更してください。

初回セットアップ、スキーマまたは教材データを変更した時だけ、DBに接続できる環境で `npm run db:deploy`（migrate deploy → seed → verify）を**一度**実行します。その完了後に通常デプロイを行います。`db:gate` はローカルの初期構築用として残しています。複数のデプロイで `migrate deploy` を同時実行すると advisory lock の競合により P1002 になり得るため、DB更新ジョブを並行実行しないでください。今回の変更には Prisma schema と教材データの変更はありません。

回答はブラウザの localStorage に即時保存され、5件または終了時に同期されます。通信に失敗した分はホーム画面や演習画面で再送します。ブラウザのサイトデータを削除する前に未同期件数が0件になったことを確認してください。JSON 出力には科目・問題別の弱点スコア、直近成績、改善幅、日別履歴が入ります。スコアは0〜100の復習優先度で、未回答は算出対象外です。
