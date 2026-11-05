import "server-only";
const resendEndpoint = "https://api.resend.com/emails";
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character); }
async function sendEmail({ email, subject, html, text, idempotencyKey }: { email: string; subject: string; html: string; text: string; idempotencyKey?: string }) {
  const apiKey = process.env.RESEND_API_KEY; const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL must be configured for email delivery.");
  const response = await fetch(resendEndpoint, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) }, body: JSON.stringify({ from, to: [email], subject, html, text }), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Resend rejected email delivery with status ${response.status}.`);
}
export async function sendVerificationEmail({ name, email, url }: { name: string; email: string; url: string }) {
  const safeName = escapeHtml(name || "there"); const safeUrl = escapeHtml(url);
  return sendEmail({ email, subject: "Verify your EasyGrantPath email", html: `<p>Hi ${safeName},</p><p>Welcome to EasyGrantPath. Confirm your email address to secure your account.</p><p><a href="${safeUrl}">Verify my email</a></p><p>If you did not create an account, you can safely ignore this email.</p>`, text: `Hi ${name || "there"},\n\nWelcome to EasyGrantPath. Confirm your email address to secure your account:\n${url}\n\nIf you did not create an account, you can safely ignore this email.` });
}
export async function sendPasswordResetEmail({ name, email, url }: { name: string; email: string; url: string }) {
  const safeName = escapeHtml(name || "there"); const safeUrl = escapeHtml(url);
  return sendEmail({ email, subject: "Reset your EasyGrantPath password", html: `<p>Hi ${safeName},</p><p>We received a request to reset your EasyGrantPath password.</p><p><a href="${safeUrl}">Reset my password</a></p><p>This link expires in one hour. If you did not request a reset, you can safely ignore this email.</p>`, text: `Hi ${name || "there"},\n\nWe received a request to reset your EasyGrantPath password:\n${url}\n\nThis link expires in one hour. If you did not request a reset, you can safely ignore this email.` });
}
export async function sendAdminServiceRequestEmail(input: { email: string; customerName: string; customerEmail: string; whatsapp: string; service: string; amount: string; reference: string; confirmedAt: string; adminUrl: string; whatsappUrl: string; idempotencyKey: string }) {
  const rows = [[ "Customer", input.customerName ], [ "Email", input.customerEmail ], [ "WhatsApp", input.whatsapp ], [ "Service", input.service ], [ "Amount", input.amount ], [ "Payment reference", input.reference ], [ "Confirmed", input.confirmedAt ]];
  const htmlRows = rows.map(([label, value]) => `<tr><th align="left" style="padding:6px 16px 6px 0">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("");
  return sendEmail({ email: input.email, subject: `New Paid ${input.service} Request - EasyGrantPath`, idempotencyKey: input.idempotencyKey, html: `<p>A customer has paid for ${escapeHtml(input.service.toLowerCase())} assistance and is waiting to be contacted.</p><table>${htmlRows}</table><p><a href="${escapeHtml(input.whatsappUrl)}">Contact Customer on WhatsApp</a></p><p><a href="${escapeHtml(input.adminUrl)}">View service request</a></p>`, text: `A customer has paid for ${input.service.toLowerCase()} assistance and is waiting to be contacted.\n\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nContact on WhatsApp: ${input.whatsappUrl}\nAdmin: ${input.adminUrl}` });
}
