ALTER TABLE "inquiries" ADD COLUMN "idempotency_key" uuid;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "idempotency_key" uuid;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_idempotency_key_unique" UNIQUE("idempotency_key");--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_idempotency_key_unique" UNIQUE("idempotency_key");