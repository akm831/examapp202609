#!/bin/zsh
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js が見つかりません。Node.js 20以降をインストールしてください。"
  exit 1
fi
export DATABASE_URL="postgresql://examapp:examapp@127.0.0.1:55432/examapp?schema=public"
mkdir -p .local
exec > >(tee .local/start.log) 2>&1
node scripts/local-db.mjs &
DB_PID=$!
trap 'kill $DB_PID 2>/dev/null || true' EXIT
for i in {1..30}; do
  if node -e 'require("net").connect(55432,"127.0.0.1").once("connect",()=>process.exit(0)).once("error",()=>process.exit(1))'; then break; fi
  sleep 1
done
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/tsx prisma/seed.ts
./node_modules/.bin/tsx scripts/verify-db.ts
./node_modules/.bin/next dev
