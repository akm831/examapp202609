import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [databaseResult, userCount] = await Promise.all([
      prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`,
      prisma.user.count(),
    ]);

    return Response.json(
      {
        ok: databaseResult[0]?.ok === 1,
        database: "OK",
        users: "OK",
        userCount,
        runtime: process.env.NEXT_RUNTIME ?? "nodejs",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Database health check failed", error);
    const e = error as { name?: string; code?: string };
    return Response.json(
      {
        ok: false,
        database: "ERROR",
        errorType: e?.name ?? "UnknownError",
        errorCode: e?.code ?? null,
      },
      { status: 500 },
    );
  }
}
