-- Add planned/actual expense fields to tasks. Idempotent.
BEGIN;

ALTER TABLE "project_tasks"
  ADD COLUMN IF NOT EXISTS "planned_expense" NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS "actual_expense"  NUMERIC(10, 2);

COMMIT;
