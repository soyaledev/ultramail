import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getClientIp,
  secureCompare,
  checkLoginBlocked,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/auth/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const blocked = await checkLoginBlocked(ip);
  if (blocked.blocked) {
    return NextResponse.json(
      {
        error: "Demasiados intentos fallidos. Espera antes de intentar de nuevo.",
        retryAfter: blocked.retryAfter,
      },
      {
        status: 429,
        headers: blocked.retryAfter
          ? { "Retry-After": String(blocked.retryAfter) }
          : undefined,
      }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { password } = body;
  const expectedPassword = process.env.PANEL_PASSWORD ?? "";

  if (!password || !secureCompare(password, expectedPassword)) {
    const result = await recordFailedLogin(ip);
    if (result.blocked) {
      return NextResponse.json(
        {
          error:
            "Demasiados intentos fallidos. La cuenta queda bloqueada por 15 minutos.",
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: result.retryAfter
            ? { "Retry-After": String(result.retryAfter) }
            : undefined,
        }
      );
    }
    return NextResponse.json(
      {
        error: "Contraseña incorrecta",
        attemptsLeft: result.attemptsLeft,
      },
      { status: 401 }
    );
  }

  await clearLoginAttempts(ip);

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ success: true });
}
