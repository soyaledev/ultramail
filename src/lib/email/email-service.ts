import { prisma } from "@/lib/db";
import { sendSmtp } from "./smtp-transport";
import { renderTemplate } from "./template-engine";

export interface AttachmentParam {
  filename: string;
  content: string;
  contentType?: string;
}

interface SendEmailParams {
  templateId: string;
  to: string;
  variables: Record<string, string>;
  senderId?: string;
  attachments?: AttachmentParam[];
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  logId?: string;
  error?: string;
}

async function resolveSenderId(senderId?: string): Promise<string> {
  if (senderId) {
    const sender = await prisma.sender.findUnique({
      where: { id: senderId },
    });
    if (!sender) {
      throw new Error(`Sender not found: ${senderId}`);
    }
    return senderId;
  }
  const defaultSender = await prisma.sender.findFirst({
    where: { isDefault: true },
  });
  if (!defaultSender) {
    throw new Error(
      "No default sender configured. Create a sender in Settings and mark it as default."
    );
  }
  return defaultSender.id;
}

export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const { templateId, to, variables, senderId, attachments } = params;

  const template = await prisma.template.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return {
      success: false,
      error: `Template not found: "${templateId}". Usa el ID de la plantilla (ej: clxxx...), no el nombre.`,
    };
  }

  let resolvedSenderId: string;
  try {
    resolvedSenderId = await resolveSenderId(senderId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }

  const html = renderTemplate(template.html, variables);
  const subject = renderTemplate(template.subject, variables);

  try {
    const result = await sendSmtp(resolvedSenderId, {
      to,
      subject,
      html,
      attachments,
    });

    const log = await prisma.emailLog.create({
      data: {
        templateId,
        senderId: resolvedSenderId,
        to,
        subject,
        variables,
        status: "sent",
      },
    });

    return {
      success: true,
      messageId: result.messageId,
      logId: log.id,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    const log = await prisma.emailLog.create({
      data: {
        templateId,
        senderId: resolvedSenderId,
        to,
        subject,
        variables,
        status: "failed",
        error: errorMessage,
      },
    });

    return {
      success: false,
      error: errorMessage,
      logId: log.id,
    };
  }
}

export async function sendTestEmail(
  templateId: string,
  testEmail: string,
  testVariables: Record<string, string>,
  senderId?: string
): Promise<SendEmailResult> {
  return sendEmail({
    templateId,
    to: testEmail,
    variables: testVariables,
    senderId,
  });
}
