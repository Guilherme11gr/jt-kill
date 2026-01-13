-- Rollback: Restore DocTags as separate table

-- Step 1: Recreate doc_tags table
CREATE TABLE "public"."doc_tags" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  name varchar NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "doc_tags_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"(id) ON DELETE CASCADE,
  CONSTRAINT "doc_tags_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"(id) ON DELETE CASCADE,
  CONSTRAINT "uq_doc_tags_project_name" UNIQUE ("project_id", name)
);

CREATE INDEX "idx_doc_tags_org" ON "public"."doc_tags"("org_id");
CREATE INDEX "idx_doc_tags_project" ON "public"."doc_tags"("project_id");

-- Step 2: Migrate ProjectTags used by docs back to DocTags
INSERT INTO "public"."doc_tags" (id, "org_id", "project_id", name, "created_at")
SELECT DISTINCT
  pt.id,
  pt."org_id",
  pt."project_id",
  pt.name,
  pt."created_at"
FROM "public"."project_tags" pt
JOIN "public"."doc_tag_assignments" dta ON dta."tag_id" = pt.id;

-- Step 3: Revert project_tags to task_tags
ALTER TABLE "public"."project_tags" RENAME TO "task_tags";
ALTER INDEX "uq_project_tags_project_name" RENAME TO "uq_task_tags_project_name";
ALTER INDEX "idx_project_tags_org" RENAME TO "idx_task_tags_org";
ALTER INDEX "idx_project_tags_project" RENAME TO "idx_task_tags_project";

-- Step 4: Update doc_tag_assignments to reference doc_tags
ALTER TABLE "public"."doc_tag_assignments" DROP CONSTRAINT "doc_tag_assignments_tag_id_fkey";
ALTER TABLE "public"."doc_tag_assignments" 
  ADD CONSTRAINT "doc_tag_assignments_tag_id_fkey" 
  FOREIGN KEY ("tag_id") REFERENCES "public"."doc_tags"(id) 
  ON DELETE CASCADE ON UPDATE NO ACTION;
