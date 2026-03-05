import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusCode = searchParams.get("statusCode");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  const where: { statusCode?: number } = {};
  if (statusCode) {
    const code = parseInt(statusCode, 10);
    if (!isNaN(code)) where.statusCode = code;
  }

  const [logs, total] = await Promise.all([
    prisma.apiAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.apiAuditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
