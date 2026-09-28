import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const databaseDir = resolve(".local/postgres");
const postgres = new EmbeddedPostgres({
  databaseDir,
  port: 55432,
  user: "examapp",
  password: "examapp",
  persistent: true,
  onLog: (message) => console.log(message),
});

if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await postgres.initialise();
await postgres.start();
const client = postgres.getPgClient("postgres", "127.0.0.1");
await client.connect();
const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", ["examapp"]);
if (existing.rowCount === 0) await client.query('CREATE DATABASE "examapp"');
await client.end();
console.log("LOCAL_DB_READY postgresql://examapp:examapp@127.0.0.1:55432/examapp");
await new Promise(() => {});
