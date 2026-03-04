import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

export async function GET() {
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
  });

  const masked = keys.map((k) => ({
    ...k,
    key: k.key.slice(0, 8) + "..." + k.key.slice(-4),
  }));

  return NextResponse.json(masked);
}

export async function POST(request: NextRequest) {
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const key = "um_" + randomBytes(32).toString("hex");

  const apiKey = await prisma.apiKey.create({
    data: { name: body.name, key },
  });

  return NextResponse.json(apiKey, { status: 201 });
}
