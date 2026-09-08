-- Project management module migration: extend SocialProject + add InKindDonation, ProjectPlan, ProjectTask, TaskAssignment, TaskWorklog
-- Idempotent — safe to re-run.

BEGIN;

-- ============== ENUMS ==============
DO $$ BEGIN
  CREATE TYPE "ProjectKind" AS ENUM ('NACHAT', 'MACHROO3');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DonationKind" AS ENUM ('CASH', 'IN_KIND');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== EXTEND SocialProject ==============
ALTER TABLE "social_projects"
  ADD COLUMN IF NOT EXISTS "kind"                  "ProjectKind" NOT NULL DEFAULT 'MACHROO3',
  ADD COLUMN IF NOT EXISTS "objective"             TEXT,
  ADD COLUMN IF NOT EXISTS "target_audience"       TEXT,
  ADD COLUMN IF NOT EXISTS "expected_beneficiaries" INTEGER,
  ADD COLUMN IF NOT EXISTS "location"              TEXT,
  ADD COLUMN IF NOT EXISTS "partners"              TEXT,
  ADD COLUMN IF NOT EXISTS "section"               "Section" NOT NULL DEFAULT 'SOCIAL',
  ADD COLUMN IF NOT EXISTS "academic_year_id"      TEXT REFERENCES "academic_years"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "created_by"            TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "evaluation_report"     TEXT,
  ADD COLUMN IF NOT EXISTS "evaluation_score"      INTEGER,
  ADD COLUMN IF NOT EXISTS "evaluation_lessons"    TEXT,
  ADD COLUMN IF NOT EXISTS "evaluation_recommend"  TEXT,
  ADD COLUMN IF NOT EXISTS "actual_beneficiaries"  INTEGER,
  ADD COLUMN IF NOT EXISTS "evaluated_at"          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "evaluated_by"          TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now();

-- ============== InKindDonation ==============
CREATE TABLE IF NOT EXISTS "in_kind_donations" (
  "id"              TEXT PRIMARY KEY,
  "project_id"      TEXT REFERENCES "social_projects"("id") ON DELETE SET NULL,
  "donor_name"      TEXT,
  "donor_phone"     TEXT,
  "item_name"       TEXT NOT NULL,
  "quantity"        NUMERIC(10, 2) NOT NULL,
  "unit"            TEXT,
  "estimated_value" NUMERIC(10, 2),
  "donation_date"   DATE NOT NULL DEFAULT CURRENT_DATE,
  "is_anonymous"    BOOLEAN NOT NULL DEFAULT false,
  "notes"           TEXT,
  "recorded_by"     TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "academic_year_id" TEXT REFERENCES "academic_years"("id") ON DELETE SET NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============== ProjectPlan ==============
CREATE TABLE IF NOT EXISTS "project_plans" (
  "id"             TEXT PRIMARY KEY,
  "project_id"     TEXT NOT NULL REFERENCES "social_projects"("id") ON DELETE CASCADE,
  "name"           TEXT NOT NULL,
  "description"    TEXT,
  "estimated_cost" NUMERIC(10, 2),
  "is_active"      BOOLEAN NOT NULL DEFAULT false,
  "position"       INTEGER NOT NULL DEFAULT 0,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============== ProjectTask ==============
CREATE TABLE IF NOT EXISTS "project_tasks" (
  "id"              TEXT PRIMARY KEY,
  "project_id"      TEXT NOT NULL REFERENCES "social_projects"("id") ON DELETE CASCADE,
  "title"           TEXT NOT NULL,
  "description"     TEXT,
  "status"          "TaskStatus" NOT NULL DEFAULT 'TODO',
  "priority"        "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "due_date"        DATE,
  "estimated_hours" NUMERIC(6, 2),
  "position"        INTEGER NOT NULL DEFAULT 0,
  "parent_task_id"  TEXT REFERENCES "project_tasks"("id") ON DELETE SET NULL,
  "created_by"      TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "completed_at"    TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "project_tasks_project_id_status_idx" ON "project_tasks"("project_id", "status");

-- ============== TaskAssignment ==============
CREATE TABLE IF NOT EXISTS "task_assignments" (
  "id"         TEXT PRIMARY KEY,
  "task_id"    TEXT NOT NULL REFERENCES "project_tasks"("id") ON DELETE CASCADE,
  "member_id"  TEXT NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("task_id", "member_id")
);

-- ============== TaskWorklog ==============
CREATE TABLE IF NOT EXISTS "task_worklogs" (
  "id"          TEXT PRIMARY KEY,
  "task_id"     TEXT NOT NULL REFERENCES "project_tasks"("id") ON DELETE CASCADE,
  "member_id"   TEXT NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "hours"       NUMERIC(5, 2) NOT NULL,
  "worked_date" DATE NOT NULL,
  "description" TEXT,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "task_worklogs_task_id_idx" ON "task_worklogs"("task_id");
CREATE INDEX IF NOT EXISTS "task_worklogs_member_id_worked_date_idx" ON "task_worklogs"("member_id", "worked_date");

COMMIT;
