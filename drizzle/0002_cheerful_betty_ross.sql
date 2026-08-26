CREATE TABLE "management_task_assignees" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "management_task_assignees" ADD CONSTRAINT "management_task_assignees_task_id_management_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."management_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_task_assignees" ADD CONSTRAINT "management_task_assignees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_assignee_idx" ON "management_task_assignees" USING btree ("task_id","user_id");--> statement-breakpoint
ALTER TABLE "management_tasks" DROP COLUMN "responsible";