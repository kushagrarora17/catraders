import "server-only";
import type { EmailMessage } from "@azure/communication-email";
import { escapeHtml, getEmailConfig, sendLeadEmails, type EmailDeps, type LeadNotice } from "@/server/email/send";
import type { NewInquiry } from "./repository";

export function buildInquiryEmails(
  referenceNumber: string,
  inquiry: NewInquiry,
  config: { sender: string; internalRecipient?: string },
): EmailMessage[] {
  const messages: EmailMessage[] = [
    {
      senderAddress: config.sender,
      recipients: { to: [{ address: inquiry.email, displayName: inquiry.name }] },
      content: {
        subject: `We received your inquiry ${referenceNumber}`,
        plainText: `Hi ${inquiry.name},\n\nThanks for reaching out to CA Elite Lubes. We'll get back to you with wholesale pricing within 24 hours.\n\nReference: ${referenceNumber}\n`,
        html: `<p>Hi ${escapeHtml(inquiry.name)},</p><p>Thanks for reaching out to CA Elite Lubes. We'll get back to you with wholesale pricing within 24 hours.</p><p>Reference: <strong>${referenceNumber}</strong></p>`,
      },
    },
  ];

  if (config.internalRecipient) {
    const details = [
      `Name: ${inquiry.name}`,
      `Business: ${inquiry.business}`,
      `City: ${inquiry.city}`,
      `Email: ${inquiry.email}`,
      inquiry.phone && `Phone: ${inquiry.phone}`,
      inquiry.category && `Category: ${inquiry.category}`,
    ].filter((line): line is string => Boolean(line));
    const message = inquiry.message ?? "(no message)";
    messages.push({
      senderAddress: config.sender,
      recipients: { to: [{ address: config.internalRecipient }] },
      replyTo: [{ address: inquiry.email, displayName: inquiry.name }],
      content: {
        subject: `New inquiry ${referenceNumber} from ${inquiry.business}`,
        plainText: `${details.join("\n")}\n\n${message}\n`,
        html: `<p>${details.map(escapeHtml).join("<br>")}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
      },
    });
  }
  return messages;
}

/** Sends the customer receipt and internal notification. Never throws. */
export async function sendInquiryEmails(referenceNumber: string, inquiry: NewInquiry, deps?: EmailDeps) {
  const config = deps?.config !== undefined ? deps.config : getEmailConfig();
  const lead: LeadNotice = {
    referenceNumber,
    leadType: "inquiry",
    occurredAt: deps?.now ?? new Date(),
    contact: {
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      company: inquiry.business,
    },
  };
  await sendLeadEmails(config ? buildInquiryEmails(referenceNumber, inquiry, config) : [], lead, {
    config,
    send: deps?.send,
  });
}
