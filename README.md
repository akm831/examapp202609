# examapp202609

593問の固定マスターを使う、○×1問1答の復習PWAです。回答・進捗・セッションはPostgreSQLに保存され、同じアカウントで端末間同期されます。

## 起動

1. `.env.example` を `.env` にコピーし、`AUTH_SECRET` を変更します。
2. `docker compose up -d` でPostgreSQLを起動します。
3. `npm ci && npm run db:generate && npm run db:deploy` を実行します。
4. `npm run dev` を実行し、`http://localhost:3000` を開きます。

検証は `npm test`、`npm run typecheck`、`npm run build`、DB接続済みなら `npm run test:e2e` です。

## デプロイと教材更新

通常デプロイのビルドコマンドは `npm run build` を指定します。`npm ci` の後、ビルド時に Prisma Client を1回生成して Next.js をビルドします。通常デプロイではDBへの接続、migrate、seed、verify は行いません。ロリポップ！側に `npm run db:gate && npm run build` が残っている場合も、`db:gate` は互換のための案内表示のみになりました。ホスティング設定は `npm run build` 単独に変更してください。

初回セットアップ、スキーマまたは教材データを変更した時だけ、DBに接続できる環境で `npm run db:deploy`（migrate deploy → seed → verify）を**一度**実行し、完了後に通常デプロイします。複数のデプロイで `migrate deploy` を同時実行すると advisory lock の競合により P1002 になり得るため、DB更新ジョブを並行実行しないでください。通常ビルドにDB更新を組み込まない構成です。依存関係の管理には npm と `package-lock.json` を使います。

回答はブラウザの localStorage に即時保存され、5件または終了時に同期されます。通信に失敗した分はホーム画面や演習画面で再送します。ブラウザのサイトデータを削除する前に未同期件数が0件になったことを確認してください。JSON 出力には科目・問題別の弱点スコア、直近成績、改善幅、日別履歴が入ります。スコアは0〜100の復習優先度で、未回答は算出対象外です。
