import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-key";
import { sendEmail } from "@/lib/email/email-service";
import { logApiAudit } from "@/lib/audit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);

  if (!auth.valid) {
    await logApiAudit({
      path: "/api/send",
      method: "POST",
      statusCode: 401,
      errorMessage: auth.error,
      templateId: undefined,
      to: undefined,
    });
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  let body: { template_id?: string; to?: string; variables?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    await logApiAudit({
      path: "/api/send",
      method: "POST",
      statusCode: 400,
      errorMessage: "Invalid JSON body",
      apiKeyId: auth.keyId,
      apiKeyName: auth.keyName,
      templateId: undefined,
      to: undefined,
    });
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { template_id, to, variables } = body;

  if (!template_id || !to) {
    await logApiAudit({
      path: "/api/send",
      method: "POST",
      statusCode: 400,
      errorMessage: "template_id and to are required",
      apiKeyId: auth.keyId,
      apiKeyName: auth.keyName,
      templateId: template_id ?? undefined,
      to: to ?? undefined,
    });
    return NextResponse.json(
      { success: false, error: "template_id and to are required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const result = await sendEmail({
    templateId: template_id,
    to,
    variables: variables ?? {},
  });

  if (!result.success) {
    await logApiAudit({
      path: "/api/send",
      method: "POST",
      statusCode: 500,
      errorMessage: result.error,
      apiKeyId: auth.keyId,
      apiKeyName: auth.keyName,
      templateId: template_id,
      to,
    });
    return NextResponse.json(result, { status: 500, headers: CORS_HEADERS });
  }

  await logApiAudit({
    path: "/api/send",
    method: "POST",
    statusCode: 200,
    apiKeyId: auth.keyId,
    apiKeyName: auth.keyName,
    templateId: template_id,
    to,
  });
  return NextResponse.json(result, { headers: CORS_HEADERS });
}
