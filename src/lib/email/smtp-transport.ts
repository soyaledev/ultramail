import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encrypt";

const RETRY_DELAYS_MS = [1000, 2000, 4000];
const MAX_RETRIES = 3;

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
  const responseCode = err && typeof err === "object" && "responseCode" in err ? (err as { responseCode?: number }).responseCode : undefined;

  if (code === "ETIMEDOUT" || code === "ECONNRESET" || code === "ECONNREFUSED") return true;
  if (responseCode === 421 || responseCode === 450 || responseCode === 452) return true;
  if (/timeout|temporarily|try again|rate limit/i.test(msg)) return true;

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface SmtpAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface SmtpSendOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: SmtpAttachment[];
}

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB total

async function resolveAttachmentContent(
  content: string,
  filename: string
): Promise<Buffer> {
  const trimmed = content.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    const res = await fetch(trimmed, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      throw new Error(`No se pudo descargar adjunto ${filename}: ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_ATTACHMENT_SIZE) {
      throw new Error(`Adjunto ${filename} excede el tamaño máximo (10MB)`);
    }
    return buf;
  }
  const buf = Buffer.from(trimmed, "base64");
  if (buf.length > MAX_ATTACHMENT_SIZE) {
    throw new Error(`Adjunto ${filename} excede el tamaño máximo (10MB)`);
  }
  return buf;
}

async function processAttachments(
  attachments: Array<{ filename: string; content: string; contentType?: string }>
): Promise<SmtpAttachment[]> {
  const result: SmtpAttachment[] = [];
  let totalSize = 0;
  for (const a of attachments) {
    const buf = await resolveAttachmentContent(a.content, a.filename);
    totalSize += buf.length;
    if (totalSize > MAX_ATTACHMENT_SIZE) {
      throw new Error("Tamaño total de adjuntos excede 10MB");
    }
    result.push({
      filename: a.filename,
      content: buf,
      contentType: a.contentType,
    });
  }
  return result;
}

async function doSendMail(
  senderId: string,
  options: SmtpSendOptions
): Promise<{ messageId: string }> {
  const sender = await prisma.sender.findUnique({
    where: { id: senderId },
  });

  if (!sender) {
    throw new Error(`Sender not found: ${senderId}`);
  }

  const password = decrypt(sender.smtpPasswordEncrypted);
  const transporter = nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: sender.smtpPort === 465,
    auth: {
      user: sender.smtpUser,
      pass: password,
    },
  });

  const mailOptions: nodemailer.SendMailOptions = {
    from: sender.fromEmail,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  if (options.attachments && options.attachments.length > 0) {
    mailOptions.attachments = options.attachments.map((a) => ({
      filename: a.filename,
      content: typeof a.content === "string" ? a.content : a.content,
      contentType: a.contentType,
    }));
  }

  const info = await transporter.sendMail(mailOptions);
  return { messageId: info.messageId ?? "" };
}

export async function sendSmtp(
  senderId: string,
  options: Omit<SmtpSendOptions, "attachments"> & {
    attachments?: Array<{ filename: string; content: string; contentType?: string }>;
  }
): Promise<{ messageId: string }> {
  let sendOptions: SmtpSendOptions = {
    to: options.to,
    subject: options.subject,
    html: options.html,
  };
  if (options.attachments && options.attachments.length > 0) {
    sendOptions.attachments = await processAttachments(options.attachments);
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await doSendMail(senderId, sendOptions);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1 && isRetryableError(err)) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

export async function verifySender(senderId: string): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    const sender = await prisma.sender.findUnique({
      where: { id: senderId },
    });

    if (!sender) {
      return { connected: false, error: `Sender not found: ${senderId}` };
    }

    const password = decrypt(sender.smtpPasswordEncrypted);
    const transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpPort === 465,
      auth: {
        user: sender.smtpUser,
        pass: password,
      },
    });

    await transporter.verify();
    return { connected: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { connected: false, error: message };
  }
}
