ALTER TYPE "public"."task_type" ADD VALUE 'desmame' BEFORE 'outro';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'pesagem' BEFORE 'outro';--> statement-breakpoint
ALTER TABLE "lots" ADD COLUMN "avg_weight_kg" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "total_weight_kg" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "reproduction_events" ADD COLUMN "fetus_count" integer;--> statement-breakpoint
ALTER TABLE "reproduction_events" ADD COLUMN "closed_without_result" boolean DEFAULT false NOT NULL;