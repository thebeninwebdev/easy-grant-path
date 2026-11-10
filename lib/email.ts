import "server-only";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
const resendEndpoint = "https://api.resend.com/emails";
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character); }
async function sendEmail({ email, subject, html, text, idempotencyKey }: { email: string; subject: string; html: string; text: string; idempotencyKey?: string }) {
  const apiKey = process.env.RESEND_API_KEY; const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL must be configured for email delivery.");
  const response = await fetch(resendEndpoint, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) }, body: JSON.stringify({ from, to: [email], subject, html, text }), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Resend rejected email delivery with status ${response.status}.`);
}
function authEmailLocale(value: string): "fr" | "en" {
  try {
    const parsed = new URL(value);
    const candidates = [parsed.pathname, ...parsed.searchParams.values()].flatMap((item) => {
      try { return [item, decodeURIComponent(item)]; } catch { return [item]; }
    });
    return candidates.some((item) => /^\/en(?:\/|$)/.test(item) || /^https?:\/\/[^/]+\/en(?:\/|$)/.test(item)) ? "en" : "fr";
  } catch { return "fr"; }
}
function fill(value: string, variables: Record<string, string>) {
  return value.replace(/\{(\w+)\}/g, (_match, key: string) => variables[key] ?? "");
}
export async function sendVerificationEmail({ name, email, url }: { name: string; email: string; url: string }) {
  const locale = authEmailLocale(url); const copy = locale === "fr" ? fr.Emails : en.Emails;
  const displayName = name || copy.fallbackName; const greeting = fill(copy.verification.greeting, { name: displayName });
  const safeGreeting = escapeHtml(greeting); const safeUrl = escapeHtml(url);
  return sendEmail({ email, subject: copy.verification.subject, html: `<p>${safeGreeting}</p><p>${escapeHtml(copy.verification.body)}</p><p><a href="${safeUrl}">${escapeHtml(copy.verification.action)}</a></p><p>${escapeHtml(copy.verification.ignore)}</p>`, text: `${greeting}\n\n${copy.verification.body}\n${url}\n\n${copy.verification.ignore}` });
}
export async function sendPasswordResetEmail({ name, email, url }: { name: string; email: string; url: string }) {
  const locale = authEmailLocale(url); const copy = locale === "fr" ? fr.Emails : en.Emails;
  const displayName = name || copy.fallbackName; const greeting = fill(copy.passwordReset.greeting, { name: displayName });
  const safeGreeting = escapeHtml(greeting); const safeUrl = escapeHtml(url);
  return sendEmail({ email, subject: copy.passwordReset.subject, html: `<p>${safeGreeting}</p><p>${escapeHtml(copy.passwordReset.body)}</p><p><a href="${safeUrl}">${escapeHtml(copy.passwordReset.action)}</a></p><p>${escapeHtml(copy.passwordReset.expiry)}</p>`, text: `${greeting}\n\n${copy.passwordReset.body}\n${url}\n\n${copy.passwordReset.expiry}` });
}
export async function sendAdminServiceRequestEmail(input: { email: string; customerName: string; customerEmail: string; whatsapp: string; service: string; amount: string; reference: string; confirmedAt: string; adminUrl: string; whatsappUrl: string; idempotencyKey: string }) {
  const rows = [[ "Customer", input.customerName ], [ "Email", input.customerEmail ], [ "WhatsApp", input.whatsapp ], [ "Service", input.service ], [ "Amount", input.amount ], [ "Payment reference", input.reference ], [ "Confirmed", input.confirmedAt ]];
  const htmlRows = rows.map(([label, value]) => `<tr><th align="left" style="padding:6px 16px 6px 0">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("");
  return sendEmail({ email: input.email, subject: `New Paid ${input.service} Request - EasyGrantPath`, idempotencyKey: input.idempotencyKey, html: `<p>A customer has paid for ${escapeHtml(input.service.toLowerCase())} assistance and is waiting to be contacted.</p><table>${htmlRows}</table><p><a href="${escapeHtml(input.whatsappUrl)}">Contact Customer on WhatsApp</a></p><p><a href="${escapeHtml(input.adminUrl)}">View service request</a></p>`, text: `A customer has paid for ${input.service.toLowerCase()} assistance and is waiting to be contacted.\n\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nContact on WhatsApp: ${input.whatsappUrl}\nAdmin: ${input.adminUrl}` });
}
