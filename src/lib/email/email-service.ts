import { prisma } from "@/lib/db";
import { sendGmail } from "./gmail-transport";
import { renderTemplate } from "./template-engine";

interface SendEmailParams {
  templateId: string;
  to: string;
  variables: Record<string, string>;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  logId?: string;
  error?: string;
}

export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const { templateId, to, variables } = params;

  const template = await prisma.template.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return {
      success: false,
      error: `Template not found: "${templateId}". Usa el ID de la plantilla (ej: clxxx...), no el nombre.`,
    };
  }

  const html = renderTemplate(template.html, variables);
  const subject = renderTemplate(template.subject, variables);

  try {
    const result = await sendGmail({ to, subject, html });

    const log = await prisma.emailLog.create({
      data: {
        templateId,
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
  testVariables: Record<string, string>
): Promise<SendEmailResult> {
  return sendEmail({
    templateId,
    to: testEmail,
    variables: testVariables,
  });
}
