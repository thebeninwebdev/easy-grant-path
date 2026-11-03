import "server-only";

const resendEndpoint = "https://api.resend.com/emails";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function sendVerificationEmail({ name, email, url }: { name: string; email: string; url: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.error("Signup verification email was not sent: RESEND_API_KEY and RESEND_FROM_EMAIL must be configured.");
    return;
  }

  const safeName = escapeHtml(name || "there");
  const safeUrl = escapeHtml(url);
  const response = await fetch(resendEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Verify your EasyGrantPath email",
      html: `<p>Hi ${safeName},</p><p>Welcome to EasyGrantPath. Confirm your email address to secure your account.</p><p><a href="${safeUrl}">Verify my email</a></p><p>If you did not create an account, you can safely ignore this email.</p>`,
      text: `Hi ${name || "there"},\n\nWelcome to EasyGrantPath. Confirm your email address to secure your account:\n${url}\n\nIf you did not create an account, you can safely ignore this email.`,
    }),
  });

  if (!response.ok) {
    console.error("Signup verification email was not sent:", response.status, await response.text());
  }
}
