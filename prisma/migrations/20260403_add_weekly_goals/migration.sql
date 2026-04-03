-- Migration: Add weekly_goals table
-- Reason: Weekly Goals feature - allows users to set feature goals for the week

CREATE TABLE "public"."weekly_goals" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "feature_id" uuid NOT NULL,
  "week_start" date NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),

  CONSTRAINT "weekly_goals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_weekly_goals_user_feature_week" UNIQUE ("user_id", "feature_id", "week_start"),
  CONSTRAINT "weekly_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "weekly_goals_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_weekly_goals_user" ON "public"."weekly_goals" ("user_id");
CREATE INDEX "idx_weekly_goals_feature" ON "public"."weekly_goals" ("feature_id");
CREATE INDEX "idx_weekly_goals_week_start" ON "public"."weekly_goals" ("week_start");
