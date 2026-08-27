ALTER TYPE "public"."breeding_method" ADD VALUE 'transferencia_embriao';--> statement-breakpoint
ALTER TABLE "reproduction_events" ADD COLUMN "donor_mother_id" text;--> statement-breakpoint
ALTER TABLE "reproduction_events" ADD COLUMN "external_donor_name" text;--> statement-breakpoint
ALTER TABLE "reproduction_events" ADD CONSTRAINT "reproduction_events_donor_mother_id_animals_id_fk" FOREIGN KEY ("donor_mother_id") REFERENCES "public"."animals"("id") ON DELETE no action ON UPDATE no action;