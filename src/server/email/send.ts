import "server-only";
import { EmailClient, type EmailMessage } from "@azure/communication-email";

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function getEmailConfig() {
  const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
  const sender = process.env.EMAIL_SENDER_ADDRESS;
  if (!connectionString || !sender) return null;
  return { connectionString, sender, internalRecipient: process.env.QUOTE_NOTIFICATION_EMAIL || undefined };
}

/** Sends all messages via Azure Communication Services, logging (never throwing) failures. */
export async function sendEmails(connectionString: string, messages: EmailMessage[], label: string) {
  const client = new EmailClient(connectionString);
  const results = await Promise.allSettled(
    messages.map(async (message) => (await client.beginSend(message)).pollUntilDone()),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(`[email] Failed to send email for ${label}`, result.reason);
    }
  }
}
