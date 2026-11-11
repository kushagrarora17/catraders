import "server-only";
import { EmailClient, KnownEmailSendStatus, type EmailMessage } from "@azure/communication-email";

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export interface EmailConfig {
  connectionString: string;
  sender: string;
  internalRecipient?: string;
}

export function getEmailConfig(): EmailConfig | null {
  const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
  const sender = process.env.EMAIL_SENDER_ADDRESS;
  if (!connectionString || !sender) return null;
  return { connectionString, sender, internalRecipient: process.env.QUOTE_NOTIFICATION_EMAIL || undefined };
}

export interface LeadContact {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface LeadNotice {
  referenceNumber: string;
  leadType: "quote" | "inquiry";
  occurredAt: Date;
  contact: LeadContact;
}

/** Injected in tests so CI never needs a live Azure Communication Services account. */
export type EmailSender = (message: EmailMessage) => Promise<void>;

export interface EmailDeps {
  /** `null` means email is not configured. Omit to read the environment. */
  config?: EmailConfig | null;
  send?: EmailSender;
  now?: Date;
}

const logFailed = (reference: string, leadType: string, reason: string) => {
  // One line, no message body and no connection string. The lead id is the lookup key.
  console.error(`[email] Failed reference=${reference} type=${leadType} reason=${reason}`);
};

function buildFailureAlert(lead: LeadNotice, sender: string, recipient: string): EmailMessage {
  const lines = [
    `A saved ${lead.leadType} lead was not fully notified.`,
    `Type: ${lead.leadType}`,
    `Id: ${lead.referenceNumber}`,
    `Timestamp: ${lead.occurredAt.toISOString()}`,
    `Name: ${lead.contact.name}`,
    `Email: ${lead.contact.email}`,
    lead.contact.phone && `Phone: ${lead.contact.phone}`,
    lead.contact.company && `Company: ${lead.contact.company}`,
    `Follow up in the database using ${lead.referenceNumber}.`,
  ].filter((line): line is string => Boolean(line));
  return {
    senderAddress: sender,
    recipients: { to: [{ address: recipient }] },
    content: {
      subject: `Email failed for ${lead.referenceNumber}`,
      plainText: lines.join("\n"),
      html: `<p>${lines.map(escapeHtml).join("<br>")}</p>`,
    },
  };
}

export function acsSender(connectionString: string): EmailSender {
  const client = new EmailClient(connectionString);
  return async (message) => {
    const result = await (await client.beginSend(message)).pollUntilDone();
    if (result.status !== KnownEmailSendStatus.Succeeded) {
      throw new Error(`Email status ${result.status}`);
    }
  };
}

async function failedSends(messages: EmailMessage[], send: EmailSender) {
  const results = await Promise.all(
    messages.map(async (message) => {
      try {
        await send(message);
        return null;
      } catch {
        return message;
      }
    }),
  );
  return results.filter((message): message is EmailMessage => message !== null);
}

/**
 * Sends the customer receipt and internal notice. Failures are retried once.
 * If either still fails, emails the internal inbox an alert. Never throws.
 * When that alert cannot be sent, logs `[email] Failed` with the lead id.
 */
export async function sendLeadEmails(messages: EmailMessage[], lead: LeadNotice, deps?: EmailDeps) {
  const config = deps?.config !== undefined ? deps.config : getEmailConfig();
  if (!config) {
    logFailed(lead.referenceNumber, lead.leadType, "email_not_configured");
    return;
  }

  let send: EmailSender;
  try {
    send = deps?.send ?? acsSender(config.connectionString);
  } catch {
    logFailed(lead.referenceNumber, lead.leadType, "email_not_configured");
    return;
  }

  let failed = await failedSends(messages, send);
  if (failed.length) failed = await failedSends(failed, send);
  if (!failed.length && config.internalRecipient) return;

  if (!config.internalRecipient) {
    logFailed(lead.referenceNumber, lead.leadType, "alert_not_configured");
    return;
  }

  try {
    await send(buildFailureAlert(lead, config.sender, config.internalRecipient));
  } catch {
    logFailed(lead.referenceNumber, lead.leadType, "alert_undeliverable");
  }
}
