import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";

export async function GET() {
  const senders = await prisma.sender.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      fromEmail: true,
      smtpHost: true,
      smtpPort: true,
      smtpUser: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json(senders);
}

export async function POST(request: NextRequest) {
  let body: {
    name?: string;
    fromEmail?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    isDefault?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { name, fromEmail, smtpHost, smtpPort, smtpUser, smtpPassword, isDefault } = body;

  if (!name || !fromEmail || !smtpUser || !smtpPassword) {
    return NextResponse.json(
      { error: "name, fromEmail, smtpUser, and smtpPassword are required" },
      { status: 400 }
    );
  }

  if (isDefault) {
    await prisma.sender.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const sender = await prisma.sender.create({
    data: {
      name,
      fromEmail,
      smtpHost: smtpHost ?? "smtp.gmail.com",
      smtpPort: smtpPort ?? 587,
      smtpUser,
      smtpPasswordEncrypted: encrypt(smtpPassword),
      isDefault: isDefault ?? false,
    },
    select: {
      id: true,
      name: true,
      fromEmail: true,
      smtpHost: true,
      smtpPort: true,
      smtpUser: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(sender, { status: 201 });
}
