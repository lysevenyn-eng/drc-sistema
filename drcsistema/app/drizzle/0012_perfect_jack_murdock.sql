CREATE TABLE "lot_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"farm_id" text NOT NULL,
	"animal_id" text,
	"from_lot_id" text,
	"to_lot_id" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"event_date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lot_transfers" ADD CONSTRAINT "lot_transfers_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_transfers" ADD CONSTRAINT "lot_transfers_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_transfers" ADD CONSTRAINT "lot_transfers_from_lot_id_lots_id_fk" FOREIGN KEY ("from_lot_id") REFERENCES "public"."lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_transfers" ADD CONSTRAINT "lot_transfers_to_lot_id_lots_id_fk" FOREIGN KEY ("to_lot_id") REFERENCES "public"."lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_transfers" ADD CONSTRAINT "lot_transfers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;