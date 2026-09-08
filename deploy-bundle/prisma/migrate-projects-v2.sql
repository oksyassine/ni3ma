-- Phase 1-5 migration: plan-task tagging, plan line items, expense→plan linking,
-- donation pledges, photos, beneficiaries, recurring, slug, risks, stakeholders.
-- Idempotent.

BEGIN;

-- ============== ENUMS ==============
DO $$ BEGIN
  CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATED', 'OCCURRED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== EXTEND SocialProject ==============
ALTER TABLE "social_projects"
  ADD COLUMN IF NOT EXISTS "slug"               TEXT,
  ADD COLUMN IF NOT EXISTS "is_public"          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cover_photo_url"    TEXT,
  ADD COLUMN IF NOT EXISTS "recurring_from_id"  TEXT REFERENCES "social_projects"("id") ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE "social_projects" ADD CONSTRAINT "social_projects_slug_key" UNIQUE ("slug");
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- ============== EXTEND Donation (pledged donations) ==============
ALTER TABLE "donations"
  ADD COLUMN IF NOT EXISTS "is_paid"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pledged_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "paid_at"    TIMESTAMPTZ;

-- ============== EXTEND Expense (project budget linkage) ==============
ALTER TABLE "expenses"
  ADD COLUMN IF NOT EXISTS "project_id"          TEXT REFERENCES "social_projects"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "plan_id"             TEXT REFERENCES "project_plans"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "plan_line_item_id"   TEXT;

-- ============== TaskPlan ==============
CREATE TABLE IF NOT EXISTS "task_plans" (
  "id"         TEXT PRIMARY KEY,
  "task_id"    TEXT NOT NULL REFERENCES "project_tasks"("id") ON DELETE CASCADE,
  "plan_id"    TEXT NOT NULL REFERENCES "project_plans"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("task_id", "plan_id")
);

-- ============== PlanLineItem ==============
CREATE TABLE IF NOT EXISTS "plan_line_items" (
  "id"         TEXT PRIMARY KEY,
  "plan_id"    TEXT NOT NULL REFERENCES "project_plans"("id") ON DELETE CASCADE,
  "name"       TEXT NOT NULL,
  "amount"     NUMERIC(10, 2) NOT NULL,
  "position"   INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now wire the FK on expenses.plan_line_item_id (after table exists)
DO $$ BEGIN
  ALTER TABLE "expenses" ADD CONSTRAINT "expenses_plan_line_item_id_fkey"
    FOREIGN KEY ("plan_line_item_id") REFERENCES "plan_line_items"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== ProjectPhoto ==============
CREATE TABLE IF NOT EXISTS "project_photos" (
  "id"          TEXT PRIMARY KEY,
  "project_id"  TEXT NOT NULL REFERENCES "social_projects"("id") ON DELETE CASCADE,
  "url"         TEXT NOT NULL,
  "caption"     TEXT,
  "uploaded_by" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============== ProjectBeneficiary ==============
CREATE TABLE IF NOT EXISTS "project_beneficiaries" (
  "id"             TEXT PRIMARY KEY,
  "project_id"     TEXT NOT NULL REFERENCES "social_projects"("id") ON DELETE CASCADE,
  "name"           TEXT NOT NULL,
  "phone"          TEXT,
  "items_received" TEXT,
  "amount"         NUMERIC(10, 2),
  "notes"          TEXT,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "project_beneficiaries_project_id_idx" ON "project_beneficiaries"("project_id");

-- ============== ProjectRisk ==============
CREATE TABLE IF NOT EXISTS "project_risks" (
  "id"          TEXT PRIMARY KEY,
  "project_id"  TEXT NOT NULL REFERENCES "social_projects"("id") ON DELETE CASCADE,
  "description" TEXT NOT NULL,
  "mitigation"  TEXT,
  "severity"    "RiskSeverity" NOT NULL DEFAULT 'MEDIUM',
  "status"      "RiskStatus" NOT NULL DEFAULT 'OPEN',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============== ProjectStakeholder ==============
CREATE TABLE IF NOT EXISTS "project_stakeholders" (
  "id"         TEXT PRIMARY KEY,
  "project_id" TEXT NOT NULL REFERENCES "social_projects"("id") ON DELETE CASCADE,
  "name"       TEXT NOT NULL,
  "role"       TEXT,
  "phone"      TEXT,
  "email"      TEXT,
  "notes"      TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
