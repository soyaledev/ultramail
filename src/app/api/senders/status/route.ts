import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySender } from "@/lib/email/smtp-transport";

export async function GET() {
  const senders = await prisma.sender.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, fromEmail: true, isDefault: true },
  });

  const statuses = await Promise.all(
    senders.map(async (s) => {
      const result = await verifySender(s.id);
      return {
        id: s.id,
        name: s.name,
        fromEmail: s.fromEmail,
        isDefault: s.isDefault,
        connected: result.connected,
        error: result.error,
      };
    })
  );

  return NextResponse.json(statuses);
}
