CREATE TYPE "public"."breeding_method" AS ENUM('monta_natural', 'inseminacao_artificial');--> statement-breakpoint
ALTER TABLE "animals" ADD COLUMN "external_father_name" text;--> statement-breakpoint
ALTER TABLE "animals" ADD COLUMN "breeding_method" "breeding_method";--> statement-breakpoint
ALTER TABLE "reproduction_events" ADD COLUMN "external_father_name" text;--> statement-breakpoint
ALTER TABLE "reproduction_events" ADD COLUMN "breeding_method" "breeding_method";