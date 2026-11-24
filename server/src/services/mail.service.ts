import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export const mailConfigured = () => Boolean(env.SMTP_HOST && (env.MAIL_FROM || env.SMTP_USER));

/** Sends the temporary password. Never throws: returns whether it was sent. */
export async function sendTemporaryPassword(
  to: string,
  name: string,
  temporaryPassword: string,
  reason: "approved" | "reset",
): Promise<boolean> {
  if (!mailConfigured()) return false;
  try {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    const intro =
      reason === "approved"
        ? `Your access request to ${env.APP_NAME} was approved.`
        : `An administrator reset your ${env.APP_NAME} password.`;
    await transport.sendMail({
      from: env.MAIL_FROM || env.SMTP_USER,
      to,
      subject: `${env.APP_NAME}: your temporary password`,
      text: `Hi ${name},\n\n${intro}\n\nTemporary password: ${temporaryPassword}\n\nSign in at ${env.CLIENT_ORIGIN}. You will be asked to choose a new password straight away.\n`,
    });
    return true;
  } catch (e) {
    console.error("Could not send email:", e instanceof Error ? e.message : e);
    return false;
  }
}
