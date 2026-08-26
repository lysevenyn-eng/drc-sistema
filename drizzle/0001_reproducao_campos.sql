ALTER TABLE "reproduction_events" DROP CONSTRAINT "reproduction_events_offspring_animal_id_animals_id_fk";--> statement-breakpoint
ALTER TABLE "reproduction_events" ADD COLUMN "live_count" integer;--> statement-breakpoint
ALTER TABLE "reproduction_events" ADD COLUMN "pregnant" boolean;--> statement-breakpoint
ALTER TABLE "reproduction_events" DROP COLUMN "offspring_sex";--> statement-breakpoint
ALTER TABLE "reproduction_events" DROP COLUMN "live_birth";--> statement-breakpoint
ALTER TABLE "reproduction_events" ALTER COLUMN "offspring_count" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "reproduction_events" ADD CONSTRAINT "reproduction_events_offspring_animal_id_animals_id_fk" FOREIGN KEY ("offspring_animal_id") REFERENCES "public"."animals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
