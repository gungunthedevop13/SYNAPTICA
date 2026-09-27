const { Resend } = require("resend");

console.log("Resend config check:", {
  RESEND_API_KEY_present: !!process.env.RESEND_API_KEY,
  RESEND_API_KEY_length: (process.env.RESEND_API_KEY || "").length,
  RESEND_API_KEY_startsWithRe: (process.env.RESEND_API_KEY || "").startsWith("re_"),
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "(missing)",
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Resend's sandbox sender ("onboarding@resend.dev") works with zero setup,
// but can only deliver to the email address you signed up to Resend with.
// Once you verify your own domain on resend.com, switch FROM_EMAIL to
// something like "noreply@yourdomain.com" to send to any address.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

const sendResetEmail = async (toEmail, resetUrl) => {
  const { error } = await resend.emails.send({
    from: `Synaptica <${FROM_EMAIL}>`,
    to: toEmail,
    subject: "Reset your Synaptica password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;">
        <h2 style="color: #111;">Reset your password</h2>
        <p style="color: #444;">
          You (or someone else) requested a password reset for your Synaptica account.
          This link expires in 30 minutes.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #caff4d; color: #0a0b08; padding: 12px 20px;
                  border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Reset password
        </a>
        <p style="color: #888; font-size: 13px;">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend send error (full):", JSON.stringify(error, null, 2));
    throw new Error(error.message || "Failed to send email via Resend.");
  }
};

const sendDueTasksEmail = async (toEmail, userName, tasks) => {
  const taskRows = tasks
    .map(
      (t) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #1e211b; color: #f4f5f3; font-size: 14px;">
            ${t.title}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #1e211b; text-align: center;">
            <span style="
              font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
              background: ${t.priority === "High" ? "rgba(239,68,68,0.15)" : t.priority === "Low" ? "rgba(110,231,183,0.15)" : "rgba(245,158,11,0.15)"};
              color: ${t.priority === "High" ? "#f4a3a3" : t.priority === "Low" ? "#9fe8c4" : "#f6c976"};
            ">${t.priority}</span>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #1e211b; color: #9a9d96; font-size: 13px; text-align: center;">
            ${t.estimatedMinutes ? `${t.estimatedMinutes} min` : "—"}
          </td>
        </tr>
      `
    )
    .join("");

  const { error } = await resend.emails.send({
    from: `Synaptica <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `📅 You have ${tasks.length} task${tasks.length > 1 ? "s" : ""} due today`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: auto; padding: 24px; background: #0c0e0b; border-radius: 12px;">
        <h2 style="color: #caff4d; font-size: 20px; margin-bottom: 4px;">Good morning, ${userName}! 👋</h2>
        <p style="color: #9a9d96; font-size: 14px; margin-bottom: 24px;">
          Here are your tasks due <strong style="color: #f4f5f3;">today</strong>. Let's get them done!
        </p>

        <table style="width: 100%; border-collapse: collapse; background: #111310; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #161911;">
              <th style="padding: 10px 12px; text-align: left; color: #6c6f67; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Task</th>
              <th style="padding: 10px 12px; text-align: center; color: #6c6f67; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Priority</th>
              <th style="padding: 10px 12px; text-align: center; color: #6c6f67; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Est. Time</th>
            </tr>
          </thead>
          <tbody>
            ${taskRows}
          </tbody>
        </table>

        <div style="margin-top: 24px; padding: 14px 16px; background: rgba(202,255,77,0.07); border: 1px solid rgba(202,255,77,0.2); border-radius: 8px;">
          <p style="margin: 0; color: #caff4d; font-size: 13px; font-weight: 600;">
            💪 ${tasks.length} task${tasks.length > 1 ? "s" : ""} to complete today — you've got this!
          </p>
        </div>

        <p style="color: #4a4f43; font-size: 11px; margin-top: 24px; text-align: center;">
          Synaptica · Your daily study reminder
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend due-tasks email error:", JSON.stringify(error, null, 2));
    throw new Error(error.message || "Failed to send due-tasks reminder email.");
  }
};

module.exports = { sendResetEmail, sendDueTasksEmail };