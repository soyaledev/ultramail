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

export async function verifyConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    const auth = getOAuth2Client();
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.getProfile({ userId: "me" });
    return { connected: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { connected: false, error: message };
  }
}
