CREATE TABLE "mcp_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correlation_id" uuid NOT NULL,
	"operator_email" varchar(320) NOT NULL,
	"action" varchar(128) NOT NULL,
	"target" varchar(255) NOT NULL,
	"outcome" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_codes" ADD COLUMN "operator_email" varchar(320);
--> statement-breakpoint
ALTER TABLE "oauth_codes" ADD COLUMN "operator_revision" varchar(128);
--> statement-breakpoint
ALTER TABLE "oauth_refresh_tokens" ADD COLUMN "operator_email" varchar(320);
--> statement-breakpoint
ALTER TABLE "oauth_refresh_tokens" ADD COLUMN "operator_revision" varchar(128);
--> statement-breakpoint
CREATE TABLE "oauth_login_states" (
	"state_hash" varchar(64) PRIMARY KEY NOT NULL,
	"nonce" varchar(64) NOT NULL,
	"provider" varchar(16) NOT NULL,
	"authorization" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_oauth_login_states_expires_at" ON "oauth_login_states" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "idx_mcp_audit_events_created_at" ON "mcp_audit_events" USING btree ("created_at");
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catraders_app') THEN
    GRANT SELECT, INSERT ON TABLE public.mcp_audit_events TO catraders_app;
    REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.mcp_audit_events FROM catraders_app;
    GRANT SELECT, INSERT, DELETE ON TABLE public.oauth_login_states TO catraders_app;
  END IF;
END
$$;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.mcp_audit_events FROM PUBLIC;
