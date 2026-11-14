// Transactional email through Resend (https://resend.com). Server-only.
// Set RESEND_API_KEY and EMAIL_FROM (an address on a domain verified in Resend) in Vercel.


export const emailConfigured = () => !!process.env.RESEND_API_KEY;

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const from = process.env.EMAIL_FROM || "Just Once <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export function verificationEmail({ code, communityName, minutes }: { code: string; communityName: string; minutes: number }) {
  const name = escapeHtml(communityName);
  return {
    subject: `${code} is your Just Once code for ${communityName}`,
    text: `Your Just Once verification code for ${communityName} is ${code}. It works for ${minutes} minutes. If you didn't ask for it, ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#14110f">
  <p style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#6b6460;margin:0">Just Once · ${name}</p>
  <h1 style="font-size:22px;margin:8px 0 16px">Confirm your ${name} email</h1>
  <p style="margin:0 0 16px">Type this code back into Just Once to get your verified badge:</p>
  <p style="font-family:ui-monospace,monospace;font-size:32px;letter-spacing:.3em;font-weight:700;background:#fff1e8;border-radius:12px;padding:16px;text-align:center;margin:0 0 16px">${code}</p>
  <p style="font-size:14px;color:#6b6460;margin:0">It works for ${minutes} minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`,
  };
}

export async function sendVerificationCode({ to, code, communityName, minutes }: { to: string; code: string; communityName: string; minutes: number }) {
  await sendEmail({ to, ...verificationEmail({ code, communityName, minutes }) });
}
