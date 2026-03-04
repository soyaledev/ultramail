import { NextResponse } from "next/server";
import { verifyConnection } from "@/lib/email/gmail-transport";

export async function GET() {
  const connected = await verifyConnection();
  return NextResponse.json({ connected });
}
