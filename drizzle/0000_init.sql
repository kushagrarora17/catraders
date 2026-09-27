CREATE TYPE "public"."quote_status" AS ENUM('pending', 'under_review', 'quoted', 'closed', 'rejected');--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"sanity_product_id" varchar(255) NOT NULL,
	"product_title" varchar(255) NOT NULL,
	"sku" varchar(100),
	"quantity" integer NOT NULL,
	"specifications_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_items_quantity_positive" CHECK ("quote_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(20) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_phone" varchar(50) NOT NULL,
	"company_name" varchar(255),
	"notes" text,
	"status" "quote_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_requests_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_quote_items_request" ON "quote_items" USING btree ("quote_request_id");