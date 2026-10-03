CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"category" varchar(100),
	"message" text,
	"status" "quote_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiries_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE INDEX "idx_inquiries_created_at" ON "inquiries" USING btree ("created_at");