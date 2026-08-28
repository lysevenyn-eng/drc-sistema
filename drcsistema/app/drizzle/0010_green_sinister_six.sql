ALTER TYPE "public"."animal_status" ADD VALUE 'abatido';--> statement-breakpoint
CREATE TABLE "abate_events" (
	"id" text PRIMARY KEY NOT NULL,
	"farm_id" text NOT NULL,
	"animal_id" text NOT NULL,
	"lot_id" text,
	"carcass_weight_kg" numeric(6, 2),
	"live_weight_kg" numeric(6, 2),
	"event_date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"sale_id" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mortality_events" ALTER COLUMN "reason" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mortality_events" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "abate_events" ADD CONSTRAINT "abate_events_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abate_events" ADD CONSTRAINT "abate_events_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abate_events" ADD CONSTRAINT "abate_events_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abate_events" ADD CONSTRAINT "abate_events_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abate_events" ADD CONSTRAINT "abate_events_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;