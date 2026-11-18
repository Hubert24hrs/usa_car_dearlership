/**
 * Transactional email via Resend (free tier). Without RESEND_API_KEY the
 * message is logged to the server console instead — handy in development.
 */
import { Resend } from "resend";

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Marketing / alert emails must carry an unsubscribe header (CAN-SPAM, Gmail bulk rules). */
  unsubscribeUrl?: string;
};

export type EmailResult = { ok: boolean; id?: string; skipped?: boolean; error?: string };

let client: Resend | null = null;

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const from = process.env.EMAIL_FROM ?? "Prestige Auto Group <no-reply@example.com>";
  const to = Array.isArray(message.to) ? message.to : [message.to];
  if (!process.env.RESEND_API_KEY) {
    console.info(
      `[email:dev] to=${to.join(", ")} subject="${message.subject}"\n${message.text.slice(0, 1200)}${message.text.length > 1200 ? "…" : ""}`,
    );
    return { ok: true, skipped: true };
  }
  try {
    client ??= new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await client.emails.send({
      from,
      to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
      headers: message.unsubscribeUrl
        ? { "List-Unsubscribe": `<${message.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
        : undefined,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (error) {
    console.error("[email] send failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}

export function leadRecipients(): string[] {
  return (process.env.LEADS_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
