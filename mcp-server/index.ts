#!/usr/bin/env node
/**
 * Ultramail MCP Server
 * Permite que un agente de IA controle Ultramail mediante herramientas MCP.
 * Requiere: DATABASE_URL, DIRECT_URL en .env (o variables de entorno)
 */

import { config } from "dotenv";
import { resolve } from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env"), quiet: true });

const prisma = new PrismaClient();

async function getSendEmail() {
  const mod = await import("../src/lib/email/email-service");
  return mod.sendEmail;
}


async function getExtractVariables() {
  const mod = await import("../src/lib/email/template-engine");
  return mod.extractVariables;
}

const server = new McpServer({
  name: "ultramail",
  version: "1.0.0",
  description: `Ultramail es un microservicio de correo electrónico. Usa las herramientas para listar/crear/editar plantillas, enviar correos, ver logs y gestionar API keys. Las variables en plantillas usan sintaxis {{nombre}}.`,
});

server.tool(
  "ultramail_list_templates",
  "Lista todas las plantillas de correo",
  {},
  async () => {
    const templates = await prisma.template.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { logs: true } } },
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(templates, null, 2) }],
    };
  }
);

server.tool(
  "ultramail_get_template",
  "Obtiene una plantilla por ID",
  { template_id: z.string().describe("ID de la plantilla") },
  async ({ template_id }) => {
    const template = await prisma.template.findUnique({
      where: { id: template_id },
      include: { _count: { select: { logs: true } } },
    });
    if (!template) {
      return {
        content: [{ type: "text" as const, text: `Plantilla no encontrada: ${template_id}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(template, null, 2) }],
    };
  }
);

server.tool(
  "ultramail_create_template",
  "Crea una nueva plantilla",
  {
    name: z.string().describe("Nombre de la plantilla"),
    subject: z.string().describe("Asunto del correo, puede usar {{variable}}"),
    html: z.string().describe("HTML del cuerpo, puede usar {{variable}}"),
  },
  async ({ name, subject, html }) => {
    const extractVariables = await getExtractVariables();
    const variables = extractVariables(html + " " + subject);
    const template = await prisma.template.create({
      data: { name, subject, html, variables },
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(template, null, 2) }],
    };
  }
);

server.tool(
  "ultramail_update_template",
  "Actualiza una plantilla existente",
  {
    template_id: z.string().describe("ID de la plantilla"),
    name: z.string().optional().describe("Nuevo nombre"),
    subject: z.string().optional().describe("Nuevo asunto"),
    html: z.string().optional().describe("Nuevo HTML"),
  },
  async ({ template_id, name, subject, html }) => {
    const existing = await prisma.template.findUnique({ where: { id: template_id } });
    if (!existing) {
      return {
        content: [{ type: "text" as const, text: `Plantilla no encontrada: ${template_id}` }],
        isError: true,
      };
    }
    const extractVariables = await getExtractVariables();
    const newHtml = html ?? existing.html;
    const newSubject = subject ?? existing.subject;
    const variables = extractVariables(newHtml + " " + newSubject);
    const template = await prisma.template.update({
      where: { id: template_id },
      data: {
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        ...(html !== undefined && { html }),
        variables,
      },
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(template, null, 2) }],
    };
  }
);

server.tool(
  "ultramail_delete_template",
  "Elimina una plantilla y sus logs asociados",
  { template_id: z.string().describe("ID de la plantilla") },
  async ({ template_id }) => {
    const existing = await prisma.template.findUnique({ where: { id: template_id } });
    if (!existing) {
      return {
        content: [{ type: "text" as const, text: `Plantilla no encontrada: ${template_id}` }],
        isError: true,
      };
    }
    await prisma.emailLog.deleteMany({ where: { templateId: template_id } });
    await prisma.template.delete({ where: { id: template_id } });
    return {
      content: [{ type: "text" as const, text: `Plantilla ${template_id} eliminada correctamente` }],
    };
  }
);

const attachmentSchema = z.object({
  filename: z.string(),
  content: z.string().describe("Base64 o URL (https://)"),
  contentType: z.string().optional(),
});

server.tool(
  "ultramail_send_email",
  "Envía un correo usando una plantilla",
  {
    template_id: z.string().describe("ID de la plantilla"),
    to: z.string().describe("Email del destinatario"),
    variables: z.record(z.string()).optional().describe("Variables para la plantilla, ej. { nombre: 'Juan' }"),
    sender_id: z.string().optional().describe("ID del remitente SMTP (si se omite, se usa el predeterminado)"),
    attachments: z.array(attachmentSchema).optional().describe("Adjuntos: content en base64 o URL. Máx 10MB total."),
  },
  async ({ template_id, to, variables, sender_id, attachments }) => {
    const sendEmail = await getSendEmail();
    const result = await sendEmail({
      templateId: template_id,
      to,
      variables: variables ?? {},
      senderId: sender_id,
      attachments: attachments ?? [],
    });
    if (!result.success) {
      return {
        content: [{ type: "text" as const, text: `Error: ${result.error}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "ultramail_list_logs",
  "Lista el historial de envíos con filtros opcionales",
  {
    template_id: z.string().optional().describe("Filtrar por ID de plantilla"),
    status: z.string().optional().describe("Filtrar por estado: sent o failed"),
    limit: z.number().optional().describe("Límite de resultados (default 50)"),
    page: z.number().optional().describe("Página (default 1)"),
  },
  async ({ template_id, status, limit = 50, page = 1 }) => {
    const where: Record<string, unknown> = {};
    if (template_id) where.templateId = template_id;
    if (status) where.status = status;
    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { template: { select: { name: true } } },
      }),
      prisma.emailLog.count({ where }),
    ]);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ logs, total, page, totalPages: Math.ceil(total / limit) }, null, 2),
      }],
    };
  }
);

server.tool(
  "ultramail_list_api_keys",
  "Lista las API keys (key enmascarada)",
  {},
  async () => {
    const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } });
    const masked = keys.map((k) => ({
      ...k,
      key: k.key.slice(0, 8) + "..." + k.key.slice(-4),
    }));
    return {
      content: [{ type: "text" as const, text: JSON.stringify(masked, null, 2) }],
    };
  }
);

server.tool(
  "ultramail_create_api_key",
  "Crea una nueva API key. La key completa solo se devuelve aquí.",
  { name: z.string().describe("Nombre descriptivo de la key") },
  async ({ name }) => {
    const { randomBytes } = await import("crypto");
    const key = "um_" + randomBytes(32).toString("hex");
    const apiKey = await prisma.apiKey.create({ data: { name, key } });
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(apiKey, null, 2) + "\n\nIMPORTANTE: Guarda la key completa ahora. No se volverá a mostrar.",
      }],
    };
  }
);

server.tool(
  "ultramail_list_senders",
  "Lista los remitentes SMTP configurados",
  {},
  async () => {
    const senders = await prisma.sender.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, fromEmail: true, isDefault: true },
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(senders, null, 2) }],
    };
  }
);

server.tool(
  "ultramail_senders_status",
  "Verifica el estado de conexión SMTP de cada remitente",
  {},
  async () => {
    const { verifySender } = await import("../src/lib/email/smtp-transport");
    const senders = await prisma.sender.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, fromEmail: true, isDefault: true },
    });
    const statuses = await Promise.all(
      senders.map(async (s) => {
        const result = await verifySender(s.id);
        return {
          id: s.id,
          name: s.name,
          fromEmail: s.fromEmail,
          isDefault: s.isDefault,
          connected: result.connected,
          error: result.error,
        };
      })
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(statuses, null, 2) }],
    };
  }
);

server.tool(
  "ultramail_health",
  "Verifica el estado del sistema: BD y remitentes configurados",
  {},
  async () => {
    const result: { status: string; database: boolean; sendersConfigured: boolean; defaultSenderExists: boolean } = {
      status: "ok",
      database: false,
      sendersConfigured: false,
      defaultSenderExists: false,
    };
    try {
      await prisma.$queryRaw`SELECT 1`;
      result.database = true;
    } catch {
      result.status = "degraded";
    }
    try {
      result.sendersConfigured = (await prisma.sender.count()) > 0;
      const defaultSender = await prisma.sender.findFirst({ where: { isDefault: true } });
      result.defaultSenderExists = !!defaultSender;
    } catch {
      result.status = "degraded";
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "ultramail_metrics",
  "Obtiene métricas: emails por día, tasa de éxito, alertas de remitentes (últimos 14 días)",
  {},
  async () => {
    const days = 14;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const logs = await prisma.emailLog.findMany({
      where: { sentAt: { gte: startDate } },
      select: { status: true, sentAt: true },
    });

    const dayMap = new Map<string, { sent: number; failed: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { sent: 0, failed: 0 });
    }

    for (const log of logs) {
      const key = new Date(log.sentAt).toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      if (entry) {
        if (log.status === "sent") entry.sent++;
        else entry.failed++;
      }
    }

    const emailsPerDay = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        sent: data.sent,
        failed: data.failed,
        total: data.sent + data.failed,
      }));

    const totalSent = logs.filter((l) => l.status === "sent").length;
    const totalFailed = logs.filter((l) => l.status === "failed").length;
    const successRate =
      totalSent + totalFailed > 0 ? totalSent / (totalSent + totalFailed) : 1;

    const senderAlerts = await prisma.sender.findMany({
      where: { verifyFailureCount: { gte: 3 } },
      select: {
        id: true,
        name: true,
        fromEmail: true,
        lastVerifyFailedAt: true,
        verifyFailureCount: true,
      },
    });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          emailsPerDay,
          successRate: Math.round(successRate * 100) / 100,
          totalLast14Days: { sent: totalSent, failed: totalFailed },
          senderAlerts: senderAlerts.map((s) => ({
            id: s.id,
            name: s.name,
            fromEmail: s.fromEmail,
            lastFailureAt: s.lastVerifyFailedAt?.toISOString() ?? null,
            failureCount: s.verifyFailureCount,
          })),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "ultramail_create_sender",
  "Crea un remitente SMTP. Para Gmail usa contraseña de aplicación.",
  {
    name: z.string(),
    fromEmail: z.string(),
    smtpHost: z.string().optional().default("smtp.gmail.com"),
    smtpPort: z.number().optional().default(587),
    smtpUser: z.string(),
    smtpPassword: z.string(),
    isDefault: z.boolean().optional().default(false),
  },
  async (params) => {
    const { encrypt } = await import("../src/lib/encrypt");
    if (params.isDefault) {
      await prisma.sender.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    const sender = await prisma.sender.create({
      data: {
        name: params.name,
        fromEmail: params.fromEmail,
        smtpHost: params.smtpHost ?? "smtp.gmail.com",
        smtpPort: params.smtpPort ?? 587,
        smtpUser: params.smtpUser,
        smtpPasswordEncrypted: encrypt(params.smtpPassword),
        isDefault: params.isDefault ?? false,
      },
      select: {
        id: true,
        name: true,
        fromEmail: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(sender, null, 2) }],
    };
  }
);

server.tool(
  "ultramail_update_sender",
  "Actualiza un remitente. Incluye smtpPassword solo si quieres cambiarla.",
  {
    sender_id: z.string(),
    name: z.string().optional(),
    fromEmail: z.string().optional(),
    smtpHost: z.string().optional(),
    smtpPort: z.number().optional(),
    smtpUser: z.string().optional(),
    smtpPassword: z.string().optional(),
    isDefault: z.boolean().optional(),
  },
  async (params) => {
    const { encrypt } = await import("../src/lib/encrypt");
    const existing = await prisma.sender.findUnique({ where: { id: params.sender_id } });
    if (!existing) {
      return {
        content: [{ type: "text" as const, text: `Remitente no encontrado: ${params.sender_id}` }],
        isError: true,
      };
    }
    const updateData: Record<string, unknown> = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.fromEmail !== undefined) updateData.fromEmail = params.fromEmail;
    if (params.smtpHost !== undefined) updateData.smtpHost = params.smtpHost;
    if (params.smtpPort !== undefined) updateData.smtpPort = params.smtpPort;
    if (params.smtpUser !== undefined) updateData.smtpUser = params.smtpUser;
    if (params.smtpPassword !== undefined) {
      updateData.smtpPasswordEncrypted = encrypt(params.smtpPassword);
    }
    if (params.isDefault === true) {
      await prisma.sender.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      updateData.isDefault = true;
    }
    const sender = await prisma.sender.update({
      where: { id: params.sender_id },
      data: updateData,
      select: {
        id: true,
        name: true,
        fromEmail: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(sender, null, 2) }],
    };
  }
);

server.tool(
  "ultramail_verify_sender",
  "Verifica la conexión SMTP de un remitente específico",
  { sender_id: z.string() },
  async ({ sender_id }) => {
    const { verifySender } = await import("../src/lib/email/smtp-transport");
    const result = await verifySender(sender_id);
    const sender = await prisma.sender.findUnique({ where: { id: sender_id } });
    if (sender) {
      const update = result.connected
        ? { verifyFailureCount: 0 }
        : {
            lastVerifyFailedAt: new Date(),
            verifyFailureCount: { increment: 1 },
          };
      await prisma.sender.update({ where: { id: sender_id }, data: update });
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "ultramail_delete_sender",
  "Elimina un remitente",
  { sender_id: z.string() },
  async ({ sender_id }) => {
    const existing = await prisma.sender.findUnique({ where: { id: sender_id } });
    if (!existing) {
      return {
        content: [{ type: "text" as const, text: `Remitente no encontrado: ${sender_id}` }],
        isError: true,
      };
    }
    await prisma.sender.delete({ where: { id: sender_id } });
    return {
      content: [{ type: "text" as const, text: `Remitente ${sender_id} eliminado correctamente` }],
    };
  }
);

server.tool(
  "ultramail_update_api_key",
  "Activa/desactiva o renombra una API key",
  {
    api_key_id: z.string(),
    active: z.boolean().optional(),
    name: z.string().optional(),
  },
  async ({ api_key_id, active, name }) => {
    const existing = await prisma.apiKey.findUnique({ where: { id: api_key_id } });
    if (!existing) {
      return {
        content: [{ type: "text" as const, text: `API key no encontrada: ${api_key_id}` }],
        isError: true,
      };
    }
    const updated = await prisma.apiKey.update({
      where: { id: api_key_id },
      data: {
        ...(active !== undefined && { active }),
        ...(name !== undefined && { name }),
      },
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(updated, null, 2) }],
    };
  }
);

server.tool(
  "ultramail_delete_api_key",
  "Elimina una API key",
  { api_key_id: z.string() },
  async ({ api_key_id }) => {
    const existing = await prisma.apiKey.findUnique({ where: { id: api_key_id } });
    if (!existing) {
      return {
        content: [{ type: "text" as const, text: `API key no encontrada: ${api_key_id}` }],
        isError: true,
      };
    }
    await prisma.apiKey.delete({ where: { id: api_key_id } });
    return {
      content: [{ type: "text" as const, text: `API key ${api_key_id} eliminada correctamente` }],
    };
  }
);

server.tool(
  "ultramail_list_audit",
  "Lista el historial de llamadas a la API (audit log)",
  {
    statusCode: z.number().optional().describe("Filtrar por código HTTP: 200, 400, 401, 500"),
    limit: z.number().optional().default(50),
    page: z.number().optional().default(1),
  },
  async ({ statusCode, limit, page }) => {
    const where: Record<string, unknown> = {};
    if (statusCode !== undefined) where.statusCode = statusCode;
    const take = Math.min(limit ?? 50, 100);
    const skip = ((page ?? 1) - 1) * take;
    const [logs, total] = await Promise.all([
      prisma.apiAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.apiAuditLog.count({ where }),
    ]);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ logs, total, page: page ?? 1, totalPages: Math.ceil(total / take) }, null, 2),
      }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
