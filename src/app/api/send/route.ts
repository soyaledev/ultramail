import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-key";
import { sendEmail } from "@/lib/email/email-service";

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: 401 }
    );
  }

  let body: { template_id?: string; to?: string; variables?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { template_id, to, variables } = body;

  if (!template_id || !to) {
    return NextResponse.json(
      { success: false, error: "template_id and to are required" },
      { status: 400 }
    );
  }

  const result = await sendEmail({
    templateId: template_id,
    to,
    variables: variables ?? {},
  });

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
