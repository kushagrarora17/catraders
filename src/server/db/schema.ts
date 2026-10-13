import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const quoteStatus = pgEnum("quote_status", [
  "pending",
  "under_review",
  "quoted",
  "closed",
  "rejected",
]);

export const quoteRequests = pgTable("quote_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  referenceNumber: varchar("reference_number", { length: 20 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }).notNull(),
  // Nullable: rows from before the city field was added have none.
  city: varchar("city", { length: 100 }),
  companyName: varchar("company_name", { length: 255 }),
  notes: text("notes"),
  // Client-generated per submission, so retries and double-submits don't create duplicates.
  idempotencyKey: uuid("idempotency_key").unique(),
  status: quoteStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Catalog details captured at submission time, so later CMS edits don't rewrite history. */
export interface SpecificationsSnapshot {
  categoryPath: string[];
  attributes: { attribute: string; values: string[] }[];
  /** Missing on quotes submitted before out-of-stock products could be quoted. */
  inStock?: boolean;
}

export const quoteItems = pgTable(
  "quote_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    sanityProductId: varchar("sanity_product_id", { length: 255 }).notNull(),
    productTitle: varchar("product_title", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 100 }),
    quantity: integer("quantity").notNull(),
    specificationsSnapshot: jsonb("specifications_snapshot").$type<SpecificationsSnapshot>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("quote_items_quantity_positive", sql`${table.quantity} > 0`),
    index("idx_quote_items_request").on(table.quoteRequestId),
  ],
);

/** General inquiries from the landing-page contact form (no products attached). */
export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referenceNumber: varchar("reference_number", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    businessName: varchar("business_name", { length: 255 }).notNull(),
    city: varchar("city", { length: 100 }),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    category: varchar("category", { length: 100 }),
    message: text("message"),
    idempotencyKey: uuid("idempotency_key").unique(),
    status: quoteStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_inquiries_created_at").on(table.createdAt)],
);

/** OAuth clients registered through dynamic client registration (CIMD clients are fetched, not stored). */
export const oauthClients = pgTable("oauth_clients", {
  clientId: varchar("client_id", { length: 64 }).primaryKey(),
  clientName: varchar("client_name", { length: 255 }),
  redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One-time authorization codes for the MCP server's OAuth flow. Only the SHA-256 of the code is stored. */
export const oauthCodes = pgTable("oauth_codes", {
  codeHash: varchar("code_hash", { length: 64 }).primaryKey(),
  clientId: text("client_id").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  codeChallenge: varchar("code_challenge", { length: 128 }).notNull(),
  resource: text("resource").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Rotating refresh tokens. Only the SHA-256 of the token is stored. */
export const oauthRefreshTokens = pgTable("oauth_refresh_tokens", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  clientId: text("client_id").notNull(),
  resource: text("resource").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type QuoteRequestRow = typeof quoteRequests.$inferSelect;
export type NewQuoteItem = typeof quoteItems.$inferInsert;
