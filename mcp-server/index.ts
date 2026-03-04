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

async function getVerifyConnection() {
  const mod = await import("../src/lib/email/gmail-transport");
  return mod.verifyConnection;
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

server.tool(
  "ultramail_send_email",
  "Envía un correo usando una plantilla",
  {
    template_id: z.string().describe("ID de la plantilla"),
    to: z.string().describe("Email del destinatario"),
    variables: z.record(z.string()).optional().describe("Variables para la plantilla, ej. { nombre: 'Juan' }"),
  },
  async ({ template_id, to, variables }) => {
    const sendEmail = await getSendEmail();
    const result = await sendEmail({
      templateId: template_id,
      to,
      variables: variables ?? {},
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
  "ultramail_gmail_status",
  "Verifica el estado de conexión con Gmail",
  {},
  async () => {
    const verifyConnection = await getVerifyConnection();
    const result = await verifyConnection();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
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
