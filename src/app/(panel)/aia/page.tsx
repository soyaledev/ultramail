"use client";

import { useEffect, useState } from "react";
import styles from "./aia.module.css";

const DOCUMENTATION = `# Ultramail - Documentación para Agentes IA

Este documento contiene toda la información que un agente de IA necesita para entender y controlar el sistema Ultramail.

---

## 1. Descripción del Sistema

Ultramail es un microservicio de correo electrónico privado que:
- Envía correos automáticamente mediante plantillas HTML
- Envía correos vía SMTP (soporta múltiples remitentes, ej. Gmail con App Password)
- Ofrece un panel web de administración
- Expone una API REST para integración con otros sistemas
- Utiliza Prisma + PostgreSQL (Neon) como base de datos

El sistema está diseñado para integración: otros sistemas lo invocan cuando necesitan enviar un correo (ej: confirmar pago, notificar usuario).

---

## 2. Arquitectura

### Stack técnico
- Next.js 16 (App Router)
- Prisma 6 + PostgreSQL (Neon)
- Nodemailer + SMTP (soporta Gmail y otros proveedores)
- iron-session para autenticación del panel
- API Key para autenticación de sistemas externos

### Estructura de carpetas relevante
\`\`\`
src/
  app/
    api/           # Endpoints de la API
    (panel)/       # Rutas del panel (protegidas)
    (auth)/login   # Login del panel
  lib/
    db.ts          # Cliente Prisma
    auth/          # Session, API key
    email/         # SMTP transport, template engine, email service
  components/
  middleware.ts    # Protege rutas del panel
prisma/
  schema.prisma    # Modelos de datos
\`\`\`

---

## 3. Modelos de Datos (Prisma)

### Template
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | Identificador único |
| name | String | Nombre de la plantilla |
| subject | String | Asunto del correo (soporta {{variables}}) |
| html | String (Text) | Cuerpo HTML (soporta {{variables}}) |
| variables | String[] | Array de nombres de variables extraídas del HTML y subject |
| createdAt, updatedAt | DateTime | Metadatos |

### EmailLog
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | Identificador |
| templateId | String | FK a Template |
| to | String | Destinatario |
| subject | String | Asunto enviado |
| variables | Json | Variables usadas |
| status | String | "sent" o "failed" |
| error | String? | Mensaje de error si falló |
| senderId | String? | FK a Sender (remitente usado) |
| sentAt | DateTime | Fecha de envío |

### Sender (remitentes SMTP)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | Identificador único |
| name | String | Nombre descriptivo |
| fromEmail | String | Dirección From del correo |
| smtpHost | String | Host SMTP (default smtp.gmail.com) |
| smtpPort | Int | Puerto (default 587) |
| smtpUser | String | Usuario SMTP |
| smtpPasswordEncrypted | String | Contraseña encriptada |
| isDefault | Boolean | Solo uno puede ser predeterminado |
| createdAt, updatedAt | DateTime | Metadatos |

### ApiKey
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | Identificador |
| name | String | Nombre descriptivo |
| key | String (unique) | Valor de la clave (prefijo um_) |
| active | Boolean | Si está habilitada |
| createdAt, lastUsedAt | DateTime | Metadatos |

---

## 4. Variables en Plantillas

Sintaxis: \`{{nombre_variable}}\` (solo letras, números, guión bajo).

Ejemplo: \`Hola {{nombre}}, tu pedido {{pedido_id}} fue confirmado.\`

Las variables se extraen automáticamente del HTML y del subject al guardar la plantilla. Al enviar, se reemplazan con los valores del objeto \`variables\` en la petición. Si falta una variable, se deja el placeholder sin reemplazar.

---

## 5. API REST - Endpoints

Base URL: \`NEXT_PUBLIC_APP_URL\` (ej: https://ultramail.vercel.app o http://localhost:3000)

### POST /api/send (enviar correo - sistemas externos)
**Autenticación:** Header \`X-API-Key\` con una API Key activa.

**Body JSON:**
\`\`\`json
{
  "template_id": "string (ID de plantilla)",
  "to": "email@ejemplo.com",
  "variables": { "nombre": "valor" },
  "sender_id": "string (opcional)",
  "attachments": [
    { "filename": "factura.pdf", "content": "base64...", "contentType": "application/pdf" },
    { "filename": "doc.pdf", "content": "https://ejemplo.com/doc.pdf" }
  ]
}
\`\`\`

**Requerido:** template_id, to. variables, sender_id y attachments son opcionales. **Adjuntos:** content puede ser string base64 o URL (https://). Máximo 10MB total.

**Respuesta 200:**
\`\`\`json
{ "success": true, "messageId": "...", "logId": "..." }
\`\`\`

**Errores:** 401 (API key inválida/faltante), 400 (JSON inválido o faltan campos), 404 (plantilla no existe), 500 (error de envío).

---

### Plantillas (requieren sesión del panel - cookie ultramail-session)

#### GET /api/templates
Lista todas las plantillas con conteo de logs.
**Respuesta:** Array de Template con _count.logs.

#### POST /api/templates
Crea plantilla.
**Body:** { "name": string, "subject": string, "html": string }
**Respuesta 201:** Template creado.

#### GET /api/templates/[id]
Obtiene una plantilla por ID.
**Respuesta:** Template o 404.

#### PUT /api/templates/[id]
Actualiza plantilla. Campos parciales permitidos.
**Body:** { "name"?, "subject"?, "html"? }
**Respuesta:** Template actualizado o 404.

#### DELETE /api/templates/[id]
Elimina plantilla (y sus logs asociados).
**Respuesta:** { "success": true } o 404.

---

### API Keys (requieren sesión del panel)

#### GET /api/keys
Lista API keys (key enmascarada: primeros 8 + ... + últimos 4).

#### POST /api/keys
Crea nueva API key.
**Body:** { "name": string }
**Respuesta 201:** { id, name, key, active, createdAt }. La key completa solo se devuelve aquí.

#### PATCH /api/keys/[id]
Actualiza key (activar/desactivar, renombrar).
**Body:** { "active"?: boolean, "name"?: string }

#### DELETE /api/keys/[id]
Elimina API key.

---

### Logs (requieren sesión del panel)

#### GET /api/logs
Query params: templateId, status, from (fecha ISO), to (fecha ISO), page (default 1), limit (default 50).
**Respuesta:** { logs: EmailLog[], total, page, totalPages }

---

### Otros

#### POST /api/auth/login
Login del panel.
**Body:** { "password": string }
**Respuesta 200:** { "success": true }. Establece cookie de sesión.

#### DELETE /api/auth/login
Logout. Destruye sesión.

#### GET /api/senders
Lista remitentes SMTP (sin contraseñas).

#### POST /api/senders
Crea remitente.
**Body:** { "name", "fromEmail", "smtpHost"?, "smtpPort"?, "smtpUser", "smtpPassword", "isDefault"? }

#### PATCH /api/senders/[id]
Actualiza remitente (incl. marcar isDefault).

#### DELETE /api/senders/[id]
Elimina remitente.

#### GET /api/senders/[id]/verify
Verifica conexión SMTP del remitente.

#### GET /api/senders/status
Estado de conexión de todos los remitentes.

#### GET /api/health (público)
Estado del sistema: BD conectada, remitentes configurados, remitente predeterminado.
**Respuesta:** { status: "ok"|"degraded", database, sendersConfigured, defaultSenderExists }

#### GET /api/metrics (requiere sesión)
Métricas: emails por día (14 días), tasa de éxito, alertas de remitentes.

#### POST /api/test-send
Envía correo de prueba (requiere sesión).
**Body:** { "template_id": string, "to": string, "variables"?: object, "sender_id"?: string }
**Respuesta:** Igual que /api/send.

---

## 6. Variables de Entorno

| Variable | Uso |
|----------|-----|
| DATABASE_URL | URL pooled de Neon |
| DIRECT_URL | URL unpooled de Neon (migraciones) |
| ENCRYPTION_KEY | Clave para encriptar contraseñas SMTP (32+ caracteres). Opcional: si SESSION_SECRET tiene 32+ chars se usa como respaldo. |
| PANEL_PASSWORD | Contraseña del panel |
| SESSION_SECRET | Clave para iron-session (32+ caracteres) |
| NEXT_PUBLIC_APP_URL | URL base de la app (para CORS y links) |

**Remitentes SMTP:** Se configuran en el panel (Settings > Remitentes). Para Gmail: crear contraseña de aplicación en Google Account → Seguridad → Contraseñas de aplicaciones. Host: smtp.gmail.com, Puerto: 587.

---

## 7. Flujo de Envío

1. Sistema externo hace POST /api/send con X-API-Key, template_id, to, variables.
2. validateApiKey verifica la key en la BD y actualiza lastUsedAt.
3. email-service obtiene la plantilla, renderTemplate reemplaza variables en HTML y subject.
4. smtp-transport usa Nodemailer y el remitente seleccionado (o predeterminado) para enviar el correo.
5. Se crea un EmailLog con status "sent" o "failed".
6. Se devuelve success, messageId, logId.

---

## 8. Rutas del Panel (UI)

| Ruta | Descripción |
|------|-------------|
| /login | Formulario de login |
| /templates | Lista de plantillas |
| /templates/new | Crear plantilla |
| /templates/[id] | Editar plantilla (editor HTML + preview) |
| /logs | Historial de envíos |
| /actividad | Actividad API (llamadas externas, éxitos y fallos) |
| /metricas | Métricas: emails/día, tasa de éxito, alertas remitentes |
| /settings | API Keys y gestión de remitentes SMTP |
| /aia | Esta documentación |

Protegidas por middleware: requieren sesión (cookie ultramail-session).

---

## 8.1 Actividad API y troubleshooting

**Ruta /actividad:** Muestra todas las llamadas a POST /api/send desde sistemas externos, incluidas las fallidas (401, 400, 500). Útil para diagnosticar por qué un sistema integrado no envía correos.

**Errores comunes:**
| Código | Causa | Solución |
|--------|-------|----------|
| 401 Missing X-API-Key | No se envió el header | Añadir header \`X-API-Key: um_xxx...\` |
| 401 Invalid API key | Key incorrecta o desactivada | Verificar key en Settings |
| 400 template_id and to required | Body incompleto | Enviar \`{ "template_id": "...", "to": "email@..." }\` |
| 500 Template not found | template_id no existe | Usar el **ID** de la plantilla (clxxx...), no el nombre. El ID está en la URL al editar una plantilla. |
| 500 No default sender / SMTP error | Sin remitente predeterminado o credenciales incorrectas | Crear remitente en Settings > Remitentes. Para Gmail, usar contraseña de aplicación |

**Importante:** \`template_id\` debe ser el ID (cuid) de la plantilla, ej: \`clxyz123abc...\`. No usar el nombre.

---

## 9. MCP - Control por Agente IA

Ultramail incluye un servidor MCP que permite a un agente controlar el sistema sin usar el panel.

**Ubicación:** \`mcp-server/index.ts\` (en la raíz del proyecto).

**Ejecución:** \`npm run mcp\` o \`npx tsx mcp-server/index.ts\`

**Configuración en Cursor** (MCP settings, ej. .cursor/mcp.json o Cursor Settings > MCP):
\`\`\`json
{
  "mcpServers": {
    "ultramail": {
      "command": "npx",
      "args": ["tsx", "mcp-server/index.ts"],
      "cwd": "C:/ruta/completa/al/proyecto/ultramail"
    }
  }
}
\`\`\`

El MCP carga .env desde el cwd (DATABASE_URL, DIRECT_URL, ENCRYPTION_KEY). **No requiere API key ni sesión:** usa Prisma y los servicios internos directamente. Un agente puede configurar todo el sistema usando solo el MCP, sin abrir el panel web.

**Herramientas MCP disponibles:**
| Herramienta | Descripción | Parámetros |
|-------------|-------------|------------|
| ultramail_list_templates | Lista plantillas | (ninguno) |
| ultramail_get_template | Obtiene plantilla por ID | template_id |
| ultramail_create_template | Crea plantilla | name, subject, html |
| ultramail_update_template | Actualiza plantilla | template_id, name?, subject?, html? |
| ultramail_delete_template | Elimina plantilla | template_id |
| ultramail_send_email | Envía correo | template_id, to, variables?, sender_id?, attachments? |
| ultramail_list_logs | Lista historial | template_id?, status?, limit?, page? |
| ultramail_list_api_keys | Lista API keys | (ninguno) |
| ultramail_create_api_key | Crea API key | name |
| ultramail_update_api_key | Activa/desactiva o renombra API key | api_key_id, active?, name? |
| ultramail_delete_api_key | Elimina API key | api_key_id |
| ultramail_list_senders | Lista remitentes SMTP | (ninguno) |
| ultramail_senders_status | Estado conexión de cada remitente | (ninguno) |
| ultramail_create_sender | Crea remitente SMTP | name, fromEmail, smtpUser, smtpPassword, smtpHost?, smtpPort?, isDefault? |
| ultramail_update_sender | Actualiza remitente | sender_id, name?, fromEmail?, smtpHost?, smtpPort?, smtpUser?, smtpPassword?, isDefault? |
| ultramail_verify_sender | Verifica conexión de un remitente | sender_id |
| ultramail_delete_sender | Elimina remitente | sender_id |
| ultramail_health | Estado del sistema (BD, remitentes) | (ninguno) |
| ultramail_metrics | Métricas: emails/día, tasa éxito, alertas | (ninguno) |
| ultramail_list_audit | Historial de llamadas a la API | statusCode?, limit?, page? |

---

## 10. Configuración inicial (solo con MCP)

Un agente puede configurar Ultramail desde cero usando únicamente el MCP. Orden recomendado:

1. **Verificar salud:** \`ultramail_health\` — comprobar que la BD responde.
2. **Crear primer remitente:** \`ultramail_create_sender\` — name, fromEmail, smtpUser, smtpPassword (para Gmail: contraseña de aplicación), isDefault: true.
3. **Verificar conexión:** \`ultramail_verify_sender\` con el id del remitente creado.
4. **Crear API key:** \`ultramail_create_api_key\` — nombre descriptivo. Guardar la key completa.
5. **Crear plantilla:** \`ultramail_create_template\` — name, subject, html con {{variables}}.
6. **Listo.** Otros sistemas envían con POST /api/send (X-API-Key + template_id + to + variables).

Todo lo anterior se hace por MCP sin necesidad del panel ni de sesión.

---

## 11. Acciones Comunes para un Agente

| Objetivo | Acción (MCP) |
|----------|--------------|
| Configurar sistema desde cero | ultramail_health → ultramail_create_sender → ultramail_verify_sender → ultramail_create_api_key |
| Crear plantilla | ultramail_create_template |
| Enviar correo | ultramail_send_email (o POST /api/send con X-API-Key) |
| Ver métricas | ultramail_metrics |
| Verificar estado | ultramail_health, ultramail_senders_status |
| Crear API key | ultramail_create_api_key |
| Crear remitente | ultramail_create_sender |
| Ver historial / auditoría | ultramail_list_logs, ultramail_list_audit |

---

## 12. Consideraciones de Seguridad

- La API Key debe mantenerse secreta. Solo se muestra completa al crearla.
- PANEL_PASSWORD y SESSION_SECRET deben ser fuertes en producción.
- Las variables de entorno sensibles no deben commitearse (.env en .gitignore).
- El middleware protege /templates, /logs, /settings, /metricas; /aia es público (para que la IA pueda leer la documentación); /api/send usa API Key.
- El MCP tiene acceso directo a la BD: quien pueda ejecutar el MCP puede crear/eliminar remitentes, API keys y plantillas.

---

Fin de la documentación. Última actualización: Marzo 2025.
`;

export default function AiaPage() {
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setContent(DOCUMENTATION);
  }, []);

  async function handleCopy() {
    await navigator.clipboard.writeText(DOCUMENTATION);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>AIA - Documentación del sistema</h1>
        <p className={styles.subtitle}>
          Información completa para agentes de IA. Leyendo esta sección un agente
          puede entender Ultramail y saber qué hacer en cualquier situación.
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className={styles.copyBtn}
          aria-label="Copiar documentación"
        >
          {copied ? "Copiado" : "Copiar todo"}
        </button>
      </div>

      <pre className={styles.doc}>{content}</pre>
    </div>
  );
}
