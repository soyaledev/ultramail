import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import {
  getClientIp,
  checkNewsletterRateLimit,
  recordNewsletterSignup,
} from "@/lib/auth/rate-limit";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const rateLimit = await checkNewsletterRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Demasiados registros desde esta IP. Intenta de nuevo más tarde.",
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: rateLimit.retryAfter
            ? { "Retry-After": String(rateLimit.retryAfter) }
            : undefined,
        }
      );
    }
  } catch {
    // Si falla el rate limit (ej. tabla inexistente), continuar
  }

  let body: { name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Datos inválidos" },
      { status: 400 }
    );
  }

  const { name, email } = body;
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();

  if (!trimmedName) {
    return NextResponse.json(
      { error: "El nombre es requerido" },
      { status: 400 }
    );
  }

  if (!trimmedEmail) {
    return NextResponse.json(
      { error: "El email es requerido" },
      { status: 400 }
    );
  }

  if (!isValidEmail(trimmedEmail)) {
    return NextResponse.json(
      { error: "Email inválido" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "NewsletterSubscriber" WHERE email = ${trimmedEmail} LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 }
      );
    }

    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "NewsletterSubscriber" (id, name, email, "createdAt")
      VALUES (${id}, ${trimmedName}, ${trimmedEmail}, NOW())
    `;

    try {
      await recordNewsletterSignup(ip);
    } catch {
      // Ignorar si falla el registro de rate limit
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Newsletter signup error:", err);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Error al registrar: ${message}`
            : "Error al registrar",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const subscribers = await prisma.$queryRaw<
    { id: string; name: string; email: string; createdAt: Date }[]
  >`
    SELECT id, name, email, "createdAt"
    FROM "NewsletterSubscriber"
    ORDER BY "createdAt" DESC
  `;

  return NextResponse.json(
    subscribers.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    }))
  );
}
