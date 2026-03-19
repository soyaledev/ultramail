import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createHash, timingSafeEqual } from "crypto";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_MINUTES = 15;
const MAX_NEWSLETTER_PER_HOUR = 5;
const NEWSLETTER_WINDOW_MS = 60 * 60 * 1000;

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function secureCompare(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  if (hashA.length !== hashB.length) return false;
  return timingSafeEqual(hashA, hashB);
}

export async function checkLoginBlocked(ip: string): Promise<{
  blocked: boolean;
  retryAfter?: number;
}> {
  const rows = await prisma.$queryRaw<
    { blockedUntil: Date | null }[]
  >`SELECT "blockedUntil" FROM "LoginAttempt" WHERE ip = ${ip} LIMIT 1`;

  const record = rows[0];
  if (!record?.blockedUntil) return { blocked: false };

  const now = new Date();
  const blockedUntil = record.blockedUntil instanceof Date ? record.blockedUntil : new Date(record.blockedUntil);
  if (blockedUntil <= now) {
    await prisma.$executeRaw`
      UPDATE "LoginAttempt" SET "failedCount" = 0, "blockedUntil" = NULL, "updatedAt" = NOW() WHERE ip = ${ip}
    `;
    return { blocked: false };
  }

  const retryAfter = Math.ceil(
    (blockedUntil.getTime() - now.getTime()) / 1000
  );
  return { blocked: true, retryAfter };
}

export async function recordFailedLogin(ip: string): Promise<{
  blocked: boolean;
  retryAfter?: number;
  attemptsLeft?: number;
}> {
  const now = new Date();
  const blockUntil = new Date(now.getTime() + LOGIN_BLOCK_MINUTES * 60 * 1000);

  await prisma.$executeRaw`
    INSERT INTO "LoginAttempt" (id, ip, "failedCount", "blockedUntil", "updatedAt")
    VALUES (gen_random_uuid()::text, ${ip}, 1, NULL, NOW())
    ON CONFLICT (ip) DO UPDATE SET
      "failedCount" = "LoginAttempt"."failedCount" + 1,
      "updatedAt" = NOW()
  `;

  const rows = await prisma.$queryRaw<{ failedCount: number }[]>`
    SELECT "failedCount" FROM "LoginAttempt" WHERE ip = ${ip} LIMIT 1
  `;
  const newCount = rows[0]?.failedCount ?? 1;
  const attemptsLeft = Math.max(0, MAX_LOGIN_ATTEMPTS - newCount);

  if (newCount >= MAX_LOGIN_ATTEMPTS) {
    await prisma.$executeRaw`
      UPDATE "LoginAttempt" SET "blockedUntil" = ${blockUntil}, "updatedAt" = NOW() WHERE ip = ${ip}
    `;
    return {
      blocked: true,
      retryAfter: LOGIN_BLOCK_MINUTES * 60,
      attemptsLeft: 0,
    };
  }

  return { blocked: false, attemptsLeft };
}

export async function clearLoginAttempts(ip: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM "LoginAttempt" WHERE ip = ${ip}`;
}

export async function checkNewsletterRateLimit(ip: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
}> {
  const key = `newsletter:${ip}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - NEWSLETTER_WINDOW_MS);

  const rows = await prisma.$queryRaw<
    { count: number; windowStart: Date }[]
  >`SELECT "count", "windowStart" FROM "RateLimit" WHERE key = ${key} LIMIT 1`;

  const record = rows[0];
  if (!record) return { allowed: true };

  const ws = record.windowStart instanceof Date ? record.windowStart : new Date(record.windowStart);
  if (ws < windowStart) {
    await prisma.$executeRaw`
      UPDATE "RateLimit" SET "count" = 0, "windowStart" = ${now}, "updatedAt" = NOW() WHERE key = ${key}
    `;
    return { allowed: true };
  }

  if (record.count >= MAX_NEWSLETTER_PER_HOUR) {
    const retryAfter = Math.ceil(
      (ws.getTime() + NEWSLETTER_WINDOW_MS - now.getTime()) / 1000
    );
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

export async function recordNewsletterSignup(ip: string): Promise<void> {
  const key = `newsletter:${ip}`;
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO "RateLimit" (id, key, "count", "windowStart", "updatedAt")
    VALUES (gen_random_uuid()::text, ${key}, 1, ${now}, NOW())
    ON CONFLICT (key) DO UPDATE SET
      "count" = "RateLimit"."count" + 1,
      "updatedAt" = NOW()
  `;
}
