-- needs_media flag on project_tasks → surfaces task in /media kanban.
ALTER TABLE "project_tasks"
  ADD COLUMN IF NOT EXISTS "needs_media" BOOLEAN NOT NULL DEFAULT false;
