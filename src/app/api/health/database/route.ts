import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [databaseResult, userCount] = await Promise.all([
      prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`,
      prisma.user.count(),
    ]);
    return Response.json({ ok: databaseResult[0]?.ok === 1, database: "OK", users: "OK", userCount });
  } catch (error) {
    console.error("Database health check failed", error);
    const e = error as { name?: string; code?: string; message?: string };
    const message = e?.message ?? "";
    const safeHint =
      message.includes("libssl") || message.includes("OpenSSL") ? "OPENSSL" :
      message.includes("Query engine library") ? "QUERY_ENGINE" :
      message.includes("DATABASE_URL") ? "DATABASE_URL" :
      message.includes("Can't reach database server") ? "DB_UNREACHABLE" :
      (e?.code === "ENOENT" && message.toLowerCase().includes("certificate")) ? "TLS_CERT_FILE" :
      (e?.code === "ENOENT" && message.toLowerCase().includes("ssl")) ? "TLS_FILE" :
      e?.code === "ENOENT" ? "ENOENT_OTHER" :
      "OTHER";
    return Response.json({
      ok: false,
      database: "ERROR",
      errorType: e?.name ?? "UnknownError",
      errorCode: e?.code ?? null,
      hint: safeHint,
    }, { status: 500 });
  }
}
