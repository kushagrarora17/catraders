CREATE TABLE "lead_digest_cursor" (
	"id" integer PRIMARY KEY NOT NULL,
	"covered_through" timestamp with time zone NOT NULL,
	CONSTRAINT "lead_digest_cursor_singleton" CHECK ("lead_digest_cursor"."id" = 1)
);
--> statement-breakpoint
CREATE INDEX "idx_quote_requests_created_at" ON "quote_requests" USING btree ("created_at");