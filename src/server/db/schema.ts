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
  companyName: varchar("company_name", { length: 255 }),
  notes: text("notes"),
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

export type QuoteRequestRow = typeof quoteRequests.$inferSelect;
export type NewQuoteItem = typeof quoteItems.$inferInsert;
