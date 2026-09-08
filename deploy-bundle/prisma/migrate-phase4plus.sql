-- Phase 4+ migration: academic years, audit log, programs, attendance, Quran/tajweed,
-- volunteer hours, family links, parent portal. Idempotent (uses IF NOT EXISTS / DO blocks).

BEGIN;

-- ============== ENUMS ==============
DO $$ BEGIN
  CREATE TYPE "HifzGrade" AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_WORK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== ACADEMIC YEAR ==============
CREATE TABLE IF NOT EXISTS "academic_years" (
  "id"         TEXT PRIMARY KEY,
  "label"      TEXT NOT NULL UNIQUE,
  "start_date" DATE NOT NULL,
  "end_date"   DATE NOT NULL,
  "is_current" BOOLEAN NOT NULL DEFAULT false,
  "is_closed"  BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============== AUDIT LOG ==============
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"         TEXT PRIMARY KEY,
  "user_id"    TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "action"     "AuditAction" NOT NULL,
  "entity"     TEXT NOT NULL,
  "entity_id"  TEXT,
  "before"     JSONB,
  "after"      JSONB,
  "ip"         TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- ============== FAMILY LINKS ==============
CREATE TABLE IF NOT EXISTS "family_links" (
  "id"         TEXT PRIMARY KEY,
  "parent_id"  TEXT NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "child_id"   TEXT NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "relation"   TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("parent_id", "child_id")
);

-- ============== QURAN PROGRESS ==============
CREATE TABLE IF NOT EXISTS "quran_progress" (
  "id"                TEXT PRIMARY KEY,
  "member_id"         TEXT NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "recitation_date"   DATE NOT NULL,
  "current_surah"     TEXT,
  "surah_from_ayah"   INTEGER,
  "surah_to_ayah"     INTEGER,
  "hizb"              INTEGER,
  "juz"               INTEGER,
  "pages_memorized"   INTEGER,
  "hifz_grade"        "HifzGrade",
  "tajweed_makharij"          INTEGER,
  "tajweed_sifaat"            INTEGER,
  "tajweed_noon_meem"         INTEGER,
  "tajweed_meem_sakinah"      INTEGER,
  "tajweed_mudood"            INTEGER,
  "tajweed_lam_tareef"        INTEGER,
  "tajweed_qalqala"           INTEGER,
  "tajweed_tarqeeq_tafkheem"  INTEGER,
  "tajweed_raa"               INTEGER,
  "tajweed_waqf"              INTEGER,
  "tajweed_imalah"            INTEGER,
  "tajweed_fluency"           INTEGER,
  "tajweed_overall"           INTEGER,
  "notes"             TEXT,
  "recorded_by"       TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "academic_year_id"  TEXT REFERENCES "academic_years"("id") ON DELETE SET NULL,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "quran_progress_member_id_recitation_date_idx" ON "quran_progress"("member_id", "recitation_date");

-- Idempotent additions for full tajweed rubric (safe to re-run)
ALTER TABLE "quran_progress"
  ADD COLUMN IF NOT EXISTS "tajweed_meem_sakinah"     INTEGER,
  ADD COLUMN IF NOT EXISTS "tajweed_lam_tareef"       INTEGER,
  ADD COLUMN IF NOT EXISTS "tajweed_qalqala"          INTEGER,
  ADD COLUMN IF NOT EXISTS "tajweed_tarqeeq_tafkheem" INTEGER,
  ADD COLUMN IF NOT EXISTS "tajweed_raa"              INTEGER,
  ADD COLUMN IF NOT EXISTS "tajweed_waqf"             INTEGER,
  ADD COLUMN IF NOT EXISTS "tajweed_imalah"           INTEGER,
  ADD COLUMN IF NOT EXISTS "tajweed_fluency"          INTEGER;

-- ============== VOLUNTEER HOURS ==============
CREATE TABLE IF NOT EXISTS "volunteer_hours" (
  "id"               TEXT PRIMARY KEY,
  "member_id"        TEXT NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "section"          "Section" NOT NULL,
  "activity_id"      TEXT REFERENCES "program_activities"("id") ON DELETE SET NULL,
  "hours_date"       DATE NOT NULL,
  "hours"            NUMERIC(6, 2) NOT NULL,
  "description"      TEXT,
  "approved"         BOOLEAN NOT NULL DEFAULT false,
  "approved_by"      TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at"      TIMESTAMPTZ,
  "academic_year_id" TEXT REFERENCES "academic_years"("id") ON DELETE SET NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "volunteer_hours_member_id_hours_date_idx" ON "volunteer_hours"("member_id", "hours_date");

-- ============== ALTER EXISTING TABLES ==============

-- Member: checkin token
ALTER TABLE "members"
  ADD COLUMN IF NOT EXISTS "checkin_token" TEXT;

DO $$ BEGIN
  ALTER TABLE "members" ADD CONSTRAINT "members_checkin_token_key" UNIQUE ("checkin_token");
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- WeeklyContribution: academic_year_id
ALTER TABLE "weekly_contributions"
  ADD COLUMN IF NOT EXISTS "academic_year_id" TEXT REFERENCES "academic_years"("id") ON DELETE SET NULL;

-- Expense: academic_year_id
ALTER TABLE "expenses"
  ADD COLUMN IF NOT EXISTS "academic_year_id" TEXT REFERENCES "academic_years"("id") ON DELETE SET NULL;

-- Donation: academic_year_id
ALTER TABLE "donations"
  ADD COLUMN IF NOT EXISTS "academic_year_id" TEXT REFERENCES "academic_years"("id") ON DELETE SET NULL;

-- Attendance: checkin_method, academic_year_id
ALTER TABLE "attendance"
  ADD COLUMN IF NOT EXISTS "checkin_method" TEXT,
  ADD COLUMN IF NOT EXISTS "academic_year_id" TEXT REFERENCES "academic_years"("id") ON DELETE SET NULL;

-- AnnualProgram: academic_year_id
ALTER TABLE "annual_programs"
  ADD COLUMN IF NOT EXISTS "academic_year_id" TEXT REFERENCES "academic_years"("id") ON DELETE SET NULL;

-- ============== SEED CURRENT ACADEMIC YEAR ==============
-- Insert 2025-2026 if no current year exists
INSERT INTO "academic_years" ("id", "label", "start_date", "end_date", "is_current")
SELECT 'ay_2025_2026', '2025-2026', '2025-09-01', '2026-08-31', true
WHERE NOT EXISTS (SELECT 1 FROM "academic_years" WHERE "is_current" = true);

COMMIT;
