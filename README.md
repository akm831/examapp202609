# examapp202609

593問の固定マスターを使う、○×1問1答の復習PWAです。回答・進捗・セッションはPostgreSQLに保存され、同じアカウントで端末間同期されます。

## 起動

1. `.env.example` を `.env` にコピーし、`AUTH_SECRET` を変更します。
2. `docker compose up -d` でPostgreSQLを起動します。
3. `pnpm install && pnpm db:gate` を実行します。
4. `pnpm dev` を実行し、`http://localhost:3000` を開きます。

検証は `pnpm test`、`pnpm typecheck`、`pnpm build`、DB接続済みなら `pnpm test:e2e` です。
