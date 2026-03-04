import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function validateApiKey(
  request: NextRequest
): Promise<{ valid: boolean; keyId?: string; error?: string }> {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return { valid: false, error: "Missing X-API-Key header" };
  }

  const key = await prisma.apiKey.findUnique({
    where: { key: apiKey },
  });

  if (!key) {
    return { valid: false, error: "Invalid API key" };
  }

  if (!key.active) {
    return { valid: false, error: "API key is disabled" };
  }

  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return { valid: true, keyId: key.id };
}
