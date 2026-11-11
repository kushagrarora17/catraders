import "server-only";
import type { EmailMessage } from "@azure/communication-email";
import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import type { Database } from "@/server/db";
import { inquiries, leadDigestCursor, quoteItems, quoteRequests } from "@/server/db/schema";
import { acsSender, escapeHtml, getEmailConfig, type EmailDeps, type EmailSender } from "@/server/email/send";

const DAY_MS = 24 * 60 * 60 * 1000;
const SNIPPET_MAX = 140;

const toronto = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
});

/** Wall time in Ontario, where the daily digest is read. */
const formatToronto = (date: Date) => toronto.format(date);

function leadSnippet(value: string | null | undefined) {
  const compact = (value ?? "").replace(/\s+/g, " ").trim();
  if (!compact) return "—";
  if (compact.length <= SNIPPET_MAX) return compact;
  return `${compact.slice(0, SNIPPET_MAX - 1)}…`;
}

export interface DigestLead {
  referenceNumber: string;
  type: "RFQ" | "INQ";
  createdAt: Date;
  name: string;
  company: string | null;
  email: string;
  snippet: string;
}

export async function listLeadsSince(db: Database, since: Date, until: Date): Promise<DigestLead[]> {
  const quotes = await db
    .select({
      referenceNumber: quoteRequests.referenceNumber,
      createdAt: quoteRequests.createdAt,
      name: quoteRequests.customerName,
      company: quoteRequests.companyName,
      email: quoteRequests.customerEmail,
      notes: quoteRequests.notes,
      items: sql<string | null>`string_agg(${quoteItems.productTitle}, ', ')`,
    })
    .from(quoteRequests)
    .leftJoin(quoteItems, eq(quoteItems.quoteRequestId, quoteRequests.id))
    .where(and(gte(quoteRequests.createdAt, since), lt(quoteRequests.createdAt, until)))
    .groupBy(quoteRequests.id)
    .orderBy(asc(quoteRequests.createdAt));

  const inquiryRows = await db
    .select({
      referenceNumber: inquiries.referenceNumber,
      createdAt: inquiries.createdAt,
      name: inquiries.name,
      company: inquiries.businessName,
      email: inquiries.email,
      message: inquiries.message,
    })
    .from(inquiries)
    .where(and(gte(inquiries.createdAt, since), lt(inquiries.createdAt, until)))
    .orderBy(asc(inquiries.createdAt));

  return [
    ...quotes.map((row) => ({
      referenceNumber: row.referenceNumber,
      type: "RFQ" as const,
      createdAt: row.createdAt,
      name: row.name,
      company: row.company,
      email: row.email,
      snippet: leadSnippet(row.notes || row.items),
    })),
    ...inquiryRows.map((row) => ({
      referenceNumber: row.referenceNumber,
      type: "INQ" as const,
      createdAt: row.createdAt,
      name: row.name,
      company: row.company,
      email: row.email,
      snippet: leadSnippet(row.message),
    })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.referenceNumber.localeCompare(b.referenceNumber));
}

export function buildDigestEmail(
  leads: DigestLead[],
  since: Date,
  until: Date,
  config: { sender: string; internalRecipient: string },
): EmailMessage {
  const rfq = leads.filter((lead) => lead.type === "RFQ").length;
  const inquiriesCount = leads.length - rfq;
  const title = leads.length === 1 ? "1 new lead" : `${leads.length} new leads`;
  const breakdown =
    leads.length === 0
      ? ""
      : ` (${rfq} RFQ, ${inquiriesCount} ${inquiriesCount === 1 ? "inquiry" : "inquiries"})`;
  const headline = `${title}${breakdown}`;
  const lines = [
    `${headline}.`,
    `Window: ${since.toISOString()} through ${until.toISOString()} (${formatToronto(since)} to ${formatToronto(until)}, America/Toronto).`,
  ];
  if (leads.length === 0) lines.push("No RFQs or inquiries were saved in this window.");
  for (const lead of leads) {
    lines.push(
      "",
      lead.referenceNumber,
      `Type: ${lead.type}`,
      `Created: ${lead.createdAt.toISOString()} (${formatToronto(lead.createdAt)})`,
      `Name: ${lead.name}`,
      `Company: ${lead.company?.trim() || "—"}`,
      `Email: ${lead.email}`,
      `Snippet: ${lead.snippet}`,
    );
  }
  const plainText = lines.join("\n");
  return {
    senderAddress: config.sender,
    recipients: { to: [{ address: config.internalRecipient }] },
    content: {
      subject: `Daily lead digest: ${headline}`,
      plainText,
      html: `<pre>${escapeHtml(plainText)}</pre>`,
    },
  };
}

export type DigestResult =
  | { ok: true; status: 200; leadCount: number; since: string; until: string }
  | { ok: false; status: 502 | 503; message: string };

async function readCursor(db: Database) {
  const [row] = await db.select({ coveredThrough: leadDigestCursor.coveredThrough }).from(leadDigestCursor).limit(1);
  return row?.coveredThrough ?? null;
}

async function saveCursor(db: Database, until: Date) {
  await db
    .insert(leadDigestCursor)
    .values({ id: 1, coveredThrough: until })
    .onConflictDoUpdate({ target: leadDigestCursor.id, set: { coveredThrough: until } });
}

/**
 * Emails leads saved since the previous successful digest (or the last 24 hours
 * on the first run). The cursor advances only after the email is accepted, so a
 * failed send is retried by the next run. Always sends, including when the count is zero.
 */
export async function runLeadDigest(getDatabase: () => Database, deps?: EmailDeps): Promise<DigestResult> {
  const config = deps?.config !== undefined ? deps.config : getEmailConfig();
  if (!config?.internalRecipient) {
    console.error("[email] Failed reference=digest type=digest reason=email_not_configured");
    return { ok: false, status: 503, message: "Email not configured" };
  }

  let send: EmailSender;
  try {
    send = deps?.send ?? acsSender(config.connectionString);
  } catch {
    console.error("[email] Failed reference=digest type=digest reason=email_not_configured");
    return { ok: false, status: 503, message: "Email not configured" };
  }

  const db = getDatabase();
  const until = deps?.now ?? new Date();
  const since = (await readCursor(db)) ?? new Date(until.getTime() - DAY_MS);
  const leads = await listLeadsSince(db, since, until);
  try {
    await send(buildDigestEmail(leads, since, until, { sender: config.sender, internalRecipient: config.internalRecipient }));
  } catch {
    console.error("[email] Failed reference=digest type=digest reason=digest_undeliverable");
    return { ok: false, status: 502, message: "Email failed" };
  }
  await saveCursor(db, until);
  return { ok: true, status: 200, leadCount: leads.length, since: since.toISOString(), until: until.toISOString() };
}
