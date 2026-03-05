import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const existing = await prisma.sender.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Sender not found" }, { status: 404 });
  }

  const updateData: {
    name?: string;
    fromEmail?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPasswordEncrypted?: string;
    isDefault?: boolean;
  } = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.fromEmail !== undefined) updateData.fromEmail = body.fromEmail;
  if (body.smtpHost !== undefined) updateData.smtpHost = body.smtpHost;
  if (body.smtpPort !== undefined) updateData.smtpPort = body.smtpPort;
  if (body.smtpUser !== undefined) updateData.smtpUser = body.smtpUser;
  if (body.smtpPassword !== undefined) {
    updateData.smtpPasswordEncrypted = encrypt(body.smtpPassword);
  }
  if (body.isDefault === true) {
    await prisma.sender.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    updateData.isDefault = true;
  }

  const sender = await prisma.sender.update({
    where: { id },
    data: updateData,
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

  return NextResponse.json(sender);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.sender.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Sender not found" }, { status: 404 });
  }
  await prisma.sender.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
