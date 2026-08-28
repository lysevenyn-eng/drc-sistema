ALTER TABLE "abate_events" ALTER COLUMN "animal_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "abate_events" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "abate_events" ADD COLUMN "resolved_at" timestamp with time zone;