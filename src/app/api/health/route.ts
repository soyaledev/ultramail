import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const result: {
    status: "ok" | "degraded";
    database: boolean;
    sendersConfigured: boolean;
    defaultSenderExists: boolean;
  } = {
    status: "ok",
    database: false,
    sendersConfigured: false,
    defaultSenderExists: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    result.database = true;
  } catch {
    result.status = "degraded";
  }

  try {
    const senderCount = await prisma.sender.count();
    result.sendersConfigured = senderCount > 0;

    const defaultSender = await prisma.sender.findFirst({
      where: { isDefault: true },
    });
    result.defaultSenderExists = !!defaultSender;
  } catch {
    result.status = "degraded";
  }

  const statusCode = result.status === "ok" ? 200 : 503;
  return NextResponse.json(result, { status: statusCode });
}
