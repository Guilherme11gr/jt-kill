-- Migration: Unify DocTags into TaskTags (rename TaskTag -> ProjectTag)
-- Reason: Both tag types serve same purpose with different targets
-- DocTags will now use TaskTag table (which already has color optional)

-- Step 1: Rename TaskTag to ProjectTag (more semantic)
ALTER TABLE "public"."task_tags" RENAME TO "project_tags";
ALTER INDEX "uq_task_tags_project_name" RENAME TO "uq_project_tags_project_name";
ALTER INDEX "idx_task_tags_org" RENAME TO "idx_project_tags_org";
ALTER INDEX "idx_task_tags_project" RENAME TO "idx_project_tags_project";

-- Step 2: Rename foreign key references
ALTER TABLE "public"."task_tag_assignments" RENAME TO "task_tag_assignments_temp";
ALTER TABLE "public"."feature_tag_assignments" RENAME TO "feature_tag_assignments_temp";

-- Step 3: Migrate DocTags to ProjectTags (merge data)
-- Add color to existing DocTags (default gray)
INSERT INTO "public"."project_tags" (id, "org_id", "project_id", name, color, "created_at", "updated_at")
SELECT 
  id,
  "org_id",
  "project_id",
  name,
  '#6b7280' as color, -- Gray default for docs
  "created_at",
  "created_at" as "updated_at"
FROM "public"."doc_tags"
ON CONFLICT ("project_id", name) DO NOTHING; -- Skip duplicates

-- Step 4: Migrate DocTagAssignments to use ProjectTag
ALTER TABLE "public"."doc_tag_assignments" ADD COLUMN "new_tag_id" uuid;

UPDATE "public"."doc_tag_assignments" dta
SET "new_tag_id" = pt.id
FROM "public"."doc_tags" dt
JOIN "public"."project_tags" pt ON pt."project_id" = dt."project_id" AND pt.name = dt.name
WHERE dta."tag_id" = dt.id;

-- Step 5: Drop old DocTag foreign key and rename column
ALTER TABLE "public"."doc_tag_assignments" DROP CONSTRAINT "doc_tag_assignments_tag_id_fkey";
ALTER TABLE "public"."doc_tag_assignments" DROP COLUMN "tag_id";
ALTER TABLE "public"."doc_tag_assignments" RENAME COLUMN "new_tag_id" TO "tag_id";

-- Step 6: Add new foreign key to ProjectTag
ALTER TABLE "public"."doc_tag_assignments" 
  ADD CONSTRAINT "doc_tag_assignments_tag_id_fkey" 
  FOREIGN KEY ("tag_id") REFERENCES "public"."project_tags"(id) 
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- Step 7: Drop old DocTag table
DROP TABLE "public"."doc_tags" CASCADE;

-- Step 8: Update assignment table names
ALTER TABLE "public"."task_tag_assignments_temp" RENAME TO "task_tag_assignments";
ALTER TABLE "public"."feature_tag_assignments_temp" RENAME TO "feature_tag_assignments";

-- Step 9: Update foreign key names for clarity
ALTER TABLE "public"."task_tag_assignments" DROP CONSTRAINT "task_tag_assignments_tag_id_fkey";
ALTER TABLE "public"."task_tag_assignments" 
  ADD CONSTRAINT "task_tag_assignments_tag_id_fkey" 
  FOREIGN KEY ("tag_id") REFERENCES "public"."project_tags"(id) 
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "public"."feature_tag_assignments" DROP CONSTRAINT "feature_tag_assignments_tag_id_fkey";
ALTER TABLE "public"."feature_tag_assignments" 
  ADD CONSTRAINT "feature_tag_assignments_tag_id_fkey" 
  FOREIGN KEY ("tag_id") REFERENCES "public"."project_tags"(id) 
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- Step 10: Update map names in schema (handled by Prisma after schema update)
