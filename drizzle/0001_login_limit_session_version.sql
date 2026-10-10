CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "login_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "session_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "login_attempts_ip_hash_created_at_idx" ON "login_attempts" USING btree ("ip_hash","created_at");