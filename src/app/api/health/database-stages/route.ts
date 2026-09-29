import { lookup } from "node:dns/promises";
import net from "node:net";
import { Pool } from "pg";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

type Check = { ok: boolean; errorType?: string; errorCode?: string | null };

function safeError(error: unknown): Check {
  const e = error as { name?: string; code?: string };
  return {
    ok: false,
    errorType: e?.name ?? "UnknownError",
    errorCode: e?.code ?? null,
  };
}

async function tcpCheck(hostname: string, port: number): Promise<Check> {
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host: hostname, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, errorType: "Timeout", errorCode: "TCP_TIMEOUT" });
    }, 5000);

    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ ok: true });
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      resolve(safeError(error));
    });
  });
}

export async function GET() {
  const connectionString = process.env.DATABASE_URL;
  const result: Record<string, unknown> = {
    config: { databaseUrl: Boolean(connectionString) },
  };

  if (!connectionString) return Response.json(result, { status: 500 });

  let url: URL;
  try {
    url = new URL(connectionString);
    result.config = {
      databaseUrl: true,
      validUrl: true,
      hostname: Boolean(url.hostname),
      sslrootcert: url.searchParams.has("sslrootcert"),
      sslcert: url.searchParams.has("sslcert"),
      sslkey: url.searchParams.has("sslkey"),
      sslmode: url.searchParams.has("sslmode"),
      channelBinding: url.searchParams.has("channel_binding"),
    };
  } catch (error) {
    result.config = { databaseUrl: true, validUrl: false, ...safeError(error) };
    return Response.json(result, { status: 500 });
  }

  try {
    await lookup(url.hostname);
    result.dns = { ok: true };
  } catch (error) {
    result.dns = safeError(error);
  }

  result.tcp = await tcpCheck(url.hostname, Number(url.port || 5432));

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
    max: 1,
  });
  try {
    const query = await pool.query("SELECT 1 AS ok");
    result.pg = { ok: query.rows[0]?.ok === 1 };
  } catch (error) {
    console.error("Staged health check: pg failed", error);
    result.pg = safeError(error);
  } finally {
    await pool.end().catch(() => undefined);
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    result.prismaRaw = { ok: rows[0]?.ok === 1 };
  } catch (error) {
    console.error("Staged health check: prisma raw failed", error);
    result.prismaRaw = safeError(error);
  }

  try {
    const count = await prisma.user.count();
    result.prismaModel = { ok: true, count };
  } catch (error) {
    console.error("Staged health check: prisma model failed", error);
    result.prismaModel = safeError(error);
  }

  return Response.json(result);
}
