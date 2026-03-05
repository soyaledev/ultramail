import { prisma } from "@/lib/db";

export async function logApiAudit(params: {
  path: string;
  method: string;
  statusCode: number;
  errorMessage?: string;
  apiKeyId?: string;
  apiKeyName?: string;
  templateId?: string;
  to?: string;
}) {
  try {
    await prisma.apiAuditLog.create({
      data: {
        path: params.path,
        method: params.method,
        statusCode: params.statusCode,
        errorMessage: params.errorMessage ?? null,
        apiKeyId: params.apiKeyId ?? null,
        apiKeyName: params.apiKeyName ?? null,
        templateId: params.templateId ?? null,
        to: params.to ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to log:", err);
  }
}
