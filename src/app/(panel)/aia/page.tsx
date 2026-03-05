"use client";

import { useEffect, useState } from "react";
import styles from "./aia.module.css";

const DOCUMENTATION = `# Ultramail - Documentación para Agentes IA

Este documento contiene toda la información que un agente de IA necesita para entender y controlar el sistema Ultramail.

---

## 1. Descripción del Sistema

Ultramail es un microservicio de correo electrónico privado que:
- Envía correos automáticamente mediante plantillas HTML
- Se conecta con Gmail vía OAuth2 (Gmail API)
- Ofrece un panel web de administración
- Expone una API REST para integración con otros sistemas
- Utiliza Prisma + PostgreSQL (Neon) como base de datos

El sistema está diseñado para integración: otros sistemas lo invocan cuando necesitan enviar un correo (ej: confirmar pago, notificar usuario).

---

## 2. Arquitectura

### Stack técnico
- Next.js 16 (App Router)
- Prisma 6 + PostgreSQL (Neon)
- Gmail API (googleapis) para envío de correos
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
    email/         # Gmail transport, template engine, email service
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
| sentAt | DateTime | Fecha de envío |

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
  "variables": { "nombre": "valor", "otra": "valor" }
}
\`\`\`

**Requerido:** template_id, to. variables es opcional (objeto vacío si no hay).

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

#### GET /api/gmail-status
Verifica conexión con Gmail.
**Respuesta:** { "connected": boolean, "error"?: string }

#### POST /api/test-send
Envía correo de prueba (requiere sesión).
**Body:** { "template_id": string, "to": string, "variables"?: object }
**Respuesta:** Igual que /api/send.

---

## 6. Variables de Entorno

| Variable | Uso |
|----------|-----|
| DATABASE_URL | URL pooled de Neon |
| DIRECT_URL | URL unpooled de Neon (migraciones) |
| GMAIL_CLIENT_ID | OAuth2 Google |
| GMAIL_CLIENT_SECRET | OAuth2 Google |
| GMAIL_REFRESH_TOKEN | Token de refresco Gmail |
| GMAIL_USER | Email de la cuenta Gmail |
| PANEL_PASSWORD | Contraseña del panel |
| SESSION_SECRET | Clave para iron-session (32+ caracteres) |
| NEXT_PUBLIC_APP_URL | URL base de la app (para CORS y links) |

---

## 7. Flujo de Envío

1. Sistema externo hace POST /api/send con X-API-Key, template_id, to, variables.
2. validateApiKey verifica la key en la BD y actualiza lastUsedAt.
3. email-service obtiene la plantilla, renderTemplate reemplaza variables en HTML y subject.
4. gmail-transport usa Gmail API (sendGmail) para enviar el correo.
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
| /settings | API Keys y estado Gmail |
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
| 500 invalid_grant / Gmail error | Gmail desconectado | Regenerar refresh token en OAuth Playground y actualizar en Vercel |

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

El MCP carga .env desde el cwd, por lo que DATABASE_URL, DIRECT_URL y las variables de Gmail deben estar configuradas. No requiere API key: usa Prisma y los servicios internos directamente.

**Herramientas MCP disponibles:**
| Herramienta | Descripción | Parámetros |
|-------------|-------------|------------|
| ultramail_list_templates | Lista plantillas | (ninguno) |
| ultramail_get_template | Obtiene plantilla por ID | template_id |
| ultramail_create_template | Crea plantilla | name, subject, html |
| ultramail_update_template | Actualiza plantilla | template_id, name?, subject?, html? |
| ultramail_delete_template | Elimina plantilla | template_id |
| ultramail_send_email | Envía correo | template_id, to, variables? |
| ultramail_list_logs | Lista historial | template_id?, status?, limit?, page? |
| ultramail_list_api_keys | Lista API keys | (ninguno) |
| ultramail_create_api_key | Crea API key | name |
| ultramail_gmail_status | Estado conexión Gmail | (ninguno) |

---

## 10. Acciones Comunes para un Agente

| Objetivo | Acción |
|----------|--------|
| Enviar correo desde otro sistema | POST /api/send con X-API-Key, template_id, to, variables |
| Crear plantilla nueva | POST /api/templates (con sesión) o MCP ultramail_create_template |
| Modificar plantilla | PUT /api/templates/[id] o MCP ultramail_update_template |
| Ver historial de envíos | GET /api/logs o MCP ultramail_list_logs |
| Crear API key para integración | POST /api/keys (con sesión) o MCP ultramail_create_api_key |
| Verificar conexión Gmail | GET /api/gmail-status o MCP ultramail_gmail_status |
| Enviar correo de prueba | POST /api/test-send (con sesión) |

---

## 11. Consideraciones de Seguridad

- La API Key debe mantenerse secreta. Solo se muestra completa al crearla.
- PANEL_PASSWORD y SESSION_SECRET deben ser fuertes en producción.
- Las variables de entorno sensibles no deben commitearse (.env en .gitignore).
- El middleware protege /templates, /logs, /settings, /aia; /api/send usa API Key.

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
