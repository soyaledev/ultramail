import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = 14;
  const now = new Date();
  const startDate = new Date(now);
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);
  startDate.setUTCHours(0, 0, 0, 0);

  const logs = await prisma.emailLog.findMany({
    where: { sentAt: { gte: startDate } },
    select: { status: true, sentAt: true },
  });

  const dayMap = new Map<string, { sent: number; failed: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime());
    d.setUTCDate(startDate.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { sent: 0, failed: 0 });
  }

  for (const log of logs) {
    const key = new Date(log.sentAt).toISOString().slice(0, 10);
    const entry = dayMap.get(key);
    if (entry) {
      if (log.status === "sent") entry.sent++;
      else entry.failed++;
    }
  }

  const emailsPerDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      sent: data.sent,
      failed: data.failed,
      total: data.sent + data.failed,
    }));

  const totalSent = logs.filter((l) => l.status === "sent").length;
  const totalFailed = logs.filter((l) => l.status === "failed").length;
  const successRate =
    totalSent + totalFailed > 0 ? totalSent / (totalSent + totalFailed) : 1;

  const senderAlerts = await prisma.sender.findMany({
    where: { verifyFailureCount: { gte: 3 } },
    select: {
      id: true,
      name: true,
      fromEmail: true,
      lastVerifyFailedAt: true,
      verifyFailureCount: true,
    },
  });

  return NextResponse.json({
    emailsPerDay,
    successRate: Math.round(successRate * 100) / 100,
    totalLast14Days: { sent: totalSent, failed: totalFailed },
    senderAlerts: senderAlerts.map((s) => ({
      id: s.id,
      name: s.name,
      fromEmail: s.fromEmail,
      lastFailureAt: s.lastVerifyFailedAt?.toISOString() ?? null,
      failureCount: s.verifyFailureCount,
    })),
  });
}
