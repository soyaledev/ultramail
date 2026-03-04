import { google } from "googleapis";

const OAuth2 = google.auth.OAuth2;

function getOAuth2Client() {
  const client = new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return client;
}

function buildRawEmail(options: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): string {
  const boundary = "boundary_" + Date.now().toString(16);

  const lines = [
    `From: ${options.from}`,
    `To: ${options.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(options.html).toString("base64"),
    `--${boundary}--`,
  ];

  const raw = lines.join("\r\n");
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendGmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ messageId: string }> {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: "v1", auth });

  const raw = buildRawEmail({
    from: process.env.GMAIL_USER!,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return { messageId: res.data.id ?? "" };
}

// #region agent log
function _debugLog(payload: { hypothesisId: string; message: string; data: Record<string, unknown> }) {
  const entry = { sessionId: "560e07", ...payload, timestamp: Date.now() };
  console.log("[gmail-debug]", JSON.stringify(entry));
  fetch("http://127.0.0.1:7399/ingest/70174cf6-c312-49ec-a1d0-4a5657b92331", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "560e07" }, body: JSON.stringify(entry) }).catch(() => {});
}
// #endregion

export async function verifyConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  // #region agent log
  const envCheck = {
    hasClientId: !!process.env.GMAIL_CLIENT_ID,
    hasClientSecret: !!process.env.GMAIL_CLIENT_SECRET,
    hasRefreshToken: !!process.env.GMAIL_REFRESH_TOKEN,
    hasGmailUser: !!process.env.GMAIL_USER,
    clientIdLen: (process.env.GMAIL_CLIENT_ID ?? "").length,
    refreshTokenLen: (process.env.GMAIL_REFRESH_TOKEN ?? "").length,
    isVercel: !!process.env.VERCEL,
  };
  _debugLog({ hypothesisId: "H1,H4", message: "verifyConnection env check", data: envCheck });
  // #endregion

  try {
    const auth = getOAuth2Client();
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.getProfile({ userId: "me" });
    return { connected: true };
  } catch (err) {
    // #region agent log
    const errData: Record<string, unknown> = {
      errMessage: err instanceof Error ? err.message : String(err),
      errName: err instanceof Error ? err.name : undefined,
    };
    if (err && typeof err === "object" && "response" in err) {
      const res = (err as { response?: { data?: unknown; status?: number } }).response;
      if (res) errData.responseStatus = res.status, errData.responseData = res.data;
    }
    if (err && typeof err === "object" && "code" in err) errData.code = (err as { code?: unknown }).code;
    _debugLog({ hypothesisId: "H2,H3,H5", message: "verifyConnection error", data: errData });
    // #endregion
    const message = err instanceof Error ? err.message : String(err);
    return { connected: false, error: message };
  }
}
