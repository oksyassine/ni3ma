-- =============================================================
-- RBAC + extended registration + beneficiary type refactor
-- Idempotent: safe to run multiple times.
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction
-- block on Postgres < 14, so the enum-extension lives OUTSIDE the
-- main BEGIN/COMMIT (psql runs each top-level statement on its own
-- implicit transaction when not wrapped).
-- =============================================================

-- ---- ENUMS: new types (CREATE) — these *can* live in a tx ----
DO $$ BEGIN
  CREATE TYPE "PermissionLevel" AS ENUM ('READ', 'RW', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BureauLevel" AS ENUM ('READ', 'RW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RegistrationType" AS ENUM ('TAMM', 'DAAM_MADRASSI', 'QURAN_TAJWEED', 'MOKHAYAM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'SICK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BeneficiaryType" AS ENUM ('GENERAL', 'YATIM', 'MOZWIZ');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend Role enum (BAHT_IJTIMA3I_TEAM) — must be standalone, no BEGIN/COMMIT.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'BAHT_IJTIMA3I_TEAM';

-- ---- everything else inside a single transaction ----
BEGIN;

-- ---- MEMBERS: extended fields ----

ALTER TABLE "members"
  ADD COLUMN IF NOT EXISTS "father_cin"          TEXT,
  ADD COLUMN IF NOT EXISTS "father_profession"   TEXT,
  ADD COLUMN IF NOT EXISTS "father_education"    TEXT,
  ADD COLUMN IF NOT EXISTS "father_landline"     TEXT,
  ADD COLUMN IF NOT EXISTS "father_address"      TEXT,
  ADD COLUMN IF NOT EXISTS "mother_cin"          TEXT,
  ADD COLUMN IF NOT EXISTS "mother_profession"   TEXT,
  ADD COLUMN IF NOT EXISTS "mother_education"    TEXT,
  ADD COLUMN IF NOT EXISTS "mother_landline"     TEXT,
  ADD COLUMN IF NOT EXISTS "mother_address"      TEXT,
  ADD COLUMN IF NOT EXISTS "siblings_boys"       INTEGER,
  ADD COLUMN IF NOT EXISTS "siblings_girls"      INTEGER,
  ADD COLUMN IF NOT EXISTS "health_status"       "HealthStatus",
  ADD COLUMN IF NOT EXISTS "landline"            TEXT,
  ADD COLUMN IF NOT EXISTS "marital_status"      "MaritalStatus",
  ADD COLUMN IF NOT EXISTS "children_boys"       INTEGER,
  ADD COLUMN IF NOT EXISTS "children_girls"      INTEGER,
  ADD COLUMN IF NOT EXISTS "interest_jtima3iya"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "interest_tarbawiya"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "interest_fikriya"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "registration_type"   "RegistrationType";

-- ---- PROJECT TASKS: self-claim flag ----

ALTER TABLE "project_tasks"
  ADD COLUMN IF NOT EXISTS "open_for_self_claim" BOOLEAN NOT NULL DEFAULT false;

-- ---- ASSOCIATION: registration fees JSON ----

ALTER TABLE "association_info"
  ADD COLUMN IF NOT EXISTS "registration_fees" JSONB;

-- ---- PROJECT BENEFICIARIES: type + yatim/mozwiz fields ----

ALTER TABLE "project_beneficiaries"
  ADD COLUMN IF NOT EXISTS "type"                 "BeneficiaryType" NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS "date_of_birth"        DATE,
  ADD COLUMN IF NOT EXISTS "gender"               "Gender",
  ADD COLUMN IF NOT EXISTS "address"              TEXT,
  ADD COLUMN IF NOT EXISTS "father_deceased"      BOOLEAN,
  ADD COLUMN IF NOT EXISTS "mother_deceased"      BOOLEAN,
  ADD COLUMN IF NOT EXISTS "guardian_name"        TEXT,
  ADD COLUMN IF NOT EXISTS "guardian_relation"    TEXT,
  ADD COLUMN IF NOT EXISTS "guardian_phone"       TEXT,
  ADD COLUMN IF NOT EXISTS "monthly_income"       NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS "family_size"          INTEGER,
  ADD COLUMN IF NOT EXISTS "housing_status"       TEXT,
  ADD COLUMN IF NOT EXISTS "financial_proof_url"  TEXT,
  ADD COLUMN IF NOT EXISTS "yatim_override_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "yatim_override_by"    TEXT,
  ADD COLUMN IF NOT EXISTS "yatim_override_at"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updated_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "project_beneficiaries_type_idx"
  ON "project_beneficiaries" ("type");

-- ---- BENEFICIARY FOLLOWUPS ----

CREATE TABLE IF NOT EXISTS "beneficiary_school_followups" (
  "id"              TEXT PRIMARY KEY,
  "beneficiary_id"  TEXT NOT NULL,
  "semester"        TEXT,
  "gpa"             NUMERIC(4, 2),
  "progress_notes"  TEXT,
  "created_by"      TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bsf_beneficiary_fk" FOREIGN KEY ("beneficiary_id")
    REFERENCES "project_beneficiaries"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "bsf_beneficiary_idx"
  ON "beneficiary_school_followups" ("beneficiary_id");

CREATE TABLE IF NOT EXISTS "beneficiary_health_followups" (
  "id"                    TEXT PRIMARY KEY,
  "beneficiary_id"        TEXT NOT NULL,
  "has_special_operation" BOOLEAN NOT NULL DEFAULT false,
  "illness"               TEXT,
  "treatment_notes"       TEXT,
  "progress_notes"        TEXT,
  "created_by"            TEXT,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bhf_beneficiary_fk" FOREIGN KEY ("beneficiary_id")
    REFERENCES "project_beneficiaries"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "bhf_beneficiary_idx"
  ON "beneficiary_health_followups" ("beneficiary_id");

-- ---- PERMISSIONS ----

CREATE TABLE IF NOT EXISTS "section_permissions" (
  "id"         TEXT PRIMARY KEY,
  "user_id"    TEXT,
  "member_id"  TEXT,
  "section"    "Section" NOT NULL,
  "level"      "PermissionLevel" NOT NULL,
  "granted_by" TEXT,
  "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "secp_user_fk"    FOREIGN KEY ("user_id")    REFERENCES "users"("id")    ON DELETE CASCADE,
  CONSTRAINT "secp_member_fk"  FOREIGN KEY ("member_id")  REFERENCES "members"("id")  ON DELETE CASCADE,
  CONSTRAINT "secp_granter_fk" FOREIGN KEY ("granted_by") REFERENCES "users"("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "secp_user_section_uniq"
  ON "section_permissions" ("user_id", "section");
CREATE UNIQUE INDEX IF NOT EXISTS "secp_member_section_uniq"
  ON "section_permissions" ("member_id", "section");
CREATE INDEX IF NOT EXISTS "secp_section_level_idx"
  ON "section_permissions" ("section", "level");

CREATE TABLE IF NOT EXISTS "bureau_permissions" (
  "id"         TEXT PRIMARY KEY,
  "user_id"    TEXT,
  "member_id"  TEXT,
  "level"      "BureauLevel" NOT NULL,
  "granted_by" TEXT,
  "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "burp_user_fk"    FOREIGN KEY ("user_id")    REFERENCES "users"("id")    ON DELETE CASCADE,
  CONSTRAINT "burp_member_fk"  FOREIGN KEY ("member_id")  REFERENCES "members"("id")  ON DELETE CASCADE,
  CONSTRAINT "burp_granter_fk" FOREIGN KEY ("granted_by") REFERENCES "users"("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "burp_user_uniq"
  ON "bureau_permissions" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "burp_member_uniq"
  ON "bureau_permissions" ("member_id");
CREATE INDEX IF NOT EXISTS "burp_level_idx"
  ON "bureau_permissions" ("level");

-- ---- BACKFILLS ----

-- Carry siblings_count → siblings_boys/girls only if both NULL.
-- We don't know the split, so we leave it null and surface a "needs review"
-- in the UI. Existing siblings_count is still readable.

-- Existing BUREAU role-holders → seed BureauPermission(level=READ).
-- (RW/ADMIN must be granted explicitly afterwards by ADMIN.)
-- Use ON CONFLICT DO NOTHING via the unique index.
INSERT INTO "bureau_permissions" ("id", "user_id", "level", "granted_at")
SELECT 'seed_' || ur.id, ur.user_id, 'READ', CURRENT_TIMESTAMP
FROM "user_roles" ur
WHERE ur.role = 'BUREAU'
ON CONFLICT ("user_id") DO NOTHING;

INSERT INTO "bureau_permissions" ("id", "member_id", "level", "granted_at")
SELECT 'seed_' || mr.id, mr.member_id, 'READ', CURRENT_TIMESTAMP
FROM "member_roles" mr
WHERE mr.role = 'BUREAU'
ON CONFLICT ("member_id") DO NOTHING;

-- Existing section role-holders → seed SectionPermission(level=READ) for that section.
-- ADMIN role gets implicit RW everywhere via app layer; no seed needed.
INSERT INTO "section_permissions" ("id", "user_id", "section", "level", "granted_at")
SELECT 'seed_edu_' || ur.id, ur.user_id, 'EDUCATIONAL', 'RW', CURRENT_TIMESTAMP
FROM "user_roles" ur WHERE ur.role = 'EDUCATIONAL'
ON CONFLICT ("user_id", "section") DO NOTHING;

INSERT INTO "section_permissions" ("id", "user_id", "section", "level", "granted_at")
SELECT 'seed_soc_' || ur.id, ur.user_id, 'SOCIAL', 'RW', CURRENT_TIMESTAMP
FROM "user_roles" ur WHERE ur.role = 'SOCIAL'
ON CONFLICT ("user_id", "section") DO NOTHING;

INSERT INTO "section_permissions" ("id", "user_id", "section", "level", "granted_at")
SELECT 'seed_qur_' || ur.id, ur.user_id, 'QURAN', 'RW', CURRENT_TIMESTAMP
FROM "user_roles" ur WHERE ur.role = 'QURAN'
ON CONFLICT ("user_id", "section") DO NOTHING;

INSERT INTO "section_permissions" ("id", "member_id", "section", "level", "granted_at")
SELECT 'seed_edu_' || mr.id, mr.member_id, 'EDUCATIONAL', 'RW', CURRENT_TIMESTAMP
FROM "member_roles" mr WHERE mr.role = 'EDUCATIONAL'
ON CONFLICT ("member_id", "section") DO NOTHING;

INSERT INTO "section_permissions" ("id", "member_id", "section", "level", "granted_at")
SELECT 'seed_soc_' || mr.id, mr.member_id, 'SOCIAL', 'RW', CURRENT_TIMESTAMP
FROM "member_roles" mr WHERE mr.role = 'SOCIAL'
ON CONFLICT ("member_id", "section") DO NOTHING;

INSERT INTO "section_permissions" ("id", "member_id", "section", "level", "granted_at")
SELECT 'seed_qur_' || mr.id, mr.member_id, 'QURAN', 'RW', CURRENT_TIMESTAMP
FROM "member_roles" mr WHERE mr.role = 'QURAN'
ON CONFLICT ("member_id", "section") DO NOTHING;

-- Enrolled members (MemberSection isActive) → SECTION_READ default if no row exists yet.
INSERT INTO "section_permissions" ("id", "member_id", "section", "level", "granted_at")
SELECT 'seed_enroll_' || ms.id, ms.member_id, ms.section, 'READ', CURRENT_TIMESTAMP
FROM "member_sections" ms
WHERE ms.is_active = true
ON CONFLICT ("member_id", "section") DO NOTHING;

COMMIT;
