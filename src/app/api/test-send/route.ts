import { NextRequest, NextResponse } from "next/server";
import { sendTestEmail } from "@/lib/email/email-service";

export async function POST(request: NextRequest) {
  let body: {
    template_id?: string;
    to?: string;
    variables?: Record<string, string>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { template_id, to, variables } = body;

  if (!template_id || !to) {
    return NextResponse.json(
      { error: "template_id and to are required" },
      { status: 400 }
    );
  }

  const result = await sendTestEmail(template_id, to, variables ?? {});

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
