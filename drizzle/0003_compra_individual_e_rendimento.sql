ALTER TABLE "animals" ADD COLUMN "acquisition_cost" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "animal_id" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "live_weight_kg" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "carcass_weight_kg" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE set null ON UPDATE no action;