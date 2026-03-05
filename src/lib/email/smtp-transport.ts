import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encrypt";

export async function sendSmtp(
  senderId: string,
  options: { to: string; subject: string; html: string }
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

  const info = await transporter.sendMail({
    from: sender.fromEmail,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  return { messageId: info.messageId ?? "" };
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
