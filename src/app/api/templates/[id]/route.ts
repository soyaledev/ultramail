import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractVariables } from "@/lib/email/template-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const template = await prisma.template.findUnique({
    where: { id },
    include: { _count: { select: { logs: true } } },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let body: { name?: string; subject?: string; html?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const html = body.html ?? existing.html;
  const subject = body.subject ?? existing.subject;
  const variables = extractVariables(html + " " + subject);

  const template = await prisma.template.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      subject,
      html,
      variables,
    },
  });

  return NextResponse.json(template);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prisma.emailLog.deleteMany({ where: { templateId: id } });
  await prisma.template.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
