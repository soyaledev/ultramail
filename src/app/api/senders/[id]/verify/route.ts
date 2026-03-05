import { NextRequest, NextResponse } from "next/server";
import { verifySender } from "@/lib/email/smtp-transport";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await verifySender(id);
  return NextResponse.json(result);
}
