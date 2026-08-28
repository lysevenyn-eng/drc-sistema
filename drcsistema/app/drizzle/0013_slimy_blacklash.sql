ALTER TABLE "abate_events" ALTER COLUMN "carcass_weight_kg" SET DATA TYPE numeric(7, 3);--> statement-breakpoint
ALTER TABLE "abate_events" ALTER COLUMN "live_weight_kg" SET DATA TYPE numeric(7, 3);--> statement-breakpoint
ALTER TABLE "lots" ALTER COLUMN "avg_weight_kg" SET DATA TYPE numeric(7, 3);--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "total_weight_kg" SET DATA TYPE numeric(9, 3);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "live_weight_kg" SET DATA TYPE numeric(7, 3);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "carcass_weight_kg" SET DATA TYPE numeric(7, 3);--> statement-breakpoint
ALTER TABLE "weighings" ALTER COLUMN "weight_kg" SET DATA TYPE numeric(7, 3);