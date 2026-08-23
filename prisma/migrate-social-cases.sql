-- =============================================================
-- SocialCase master table + child followups + project link.
-- Idempotent. Migrates existing YATIM/MOZWIZ project_beneficiaries
-- into social_cases (1:1) and back-fills the link.
-- =============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS "social_cases" (
  "id"                    TEXT PRIMARY KEY,
  "case_number"           SERIAL UNIQUE,
  "type"                  "BeneficiaryType" NOT NULL DEFAULT 'YATIM',
  "full_name"             TEXT NOT NULL,
  "date_of_birth"         DATE,
  "gender"                "Gender",
  "cin"                   TEXT,
  "phone"                 TEXT,
  "address"               TEXT,
  "father_name"           TEXT,
  "father_deceased"       BOOLEAN,
  "mother_name"           TEXT,
  "mother_deceased"       BOOLEAN,
  "guardian_name"         TEXT,
  "guardian_relation"     TEXT,
  "guardian_phone"        TEXT,
  "monthly_income"        NUMERIC(10, 2),
  "family_size"           INTEGER,
  "housing_status"        TEXT,
  "financial_proof_url"   TEXT,
  "yatim_override_reason" TEXT,
  "yatim_override_by"     TEXT,
  "yatim_override_at"     TIMESTAMP(3),
  "notes"                 TEXT,
  "created_by"            TEXT,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "social_cases_type_idx"      ON "social_cases" ("type");
CREATE INDEX IF NOT EXISTS "social_cases_fullname_idx"  ON "social_cases" ("full_name");

CREATE TABLE IF NOT EXISTS "case_school_followups" (
  "id"             TEXT PRIMARY KEY,
  "case_id"        TEXT NOT NULL,
  "semester"       TEXT,
  "gpa"            NUMERIC(4, 2),
  "progress_notes" TEXT,
  "created_by"     TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "csf_case_fk" FOREIGN KEY ("case_id") REFERENCES "social_cases"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "csf_case_idx" ON "case_school_followups" ("case_id");

CREATE TABLE IF NOT EXISTS "case_health_followups" (
  "id"                    TEXT PRIMARY KEY,
  "case_id"               TEXT NOT NULL,
  "has_special_operation" BOOLEAN NOT NULL DEFAULT false,
  "illness"               TEXT,
  "treatment_notes"       TEXT,
  "progress_notes"        TEXT,
  "created_by"            TEXT,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chf_case_fk" FOREIGN KEY ("case_id") REFERENCES "social_cases"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "chf_case_idx" ON "case_health_followups" ("case_id");

-- Add FK column to project_beneficiaries
ALTER TABLE "project_beneficiaries"
  ADD COLUMN IF NOT EXISTS "social_case_id" TEXT;

-- FK constraint (only if not already present)
DO $$ BEGIN
  ALTER TABLE "project_beneficiaries"
    ADD CONSTRAINT "pb_social_case_fk"
    FOREIGN KEY ("social_case_id") REFERENCES "social_cases"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "pb_social_case_idx" ON "project_beneficiaries" ("social_case_id");

-- ---- BACKFILL ----
-- For each existing YATIM or MOZWIZ project_beneficiary that doesn't yet
-- have a social_case_id, create a SocialCase from its data and link it.
-- Skipped on second run (WHERE social_case_id IS NULL).

INSERT INTO "social_cases" (
  "id", "type", "full_name", "date_of_birth", "gender",
  "phone", "address",
  "father_deceased", "mother_deceased",
  "guardian_name", "guardian_relation", "guardian_phone",
  "monthly_income", "family_size", "housing_status", "financial_proof_url",
  "yatim_override_reason", "yatim_override_by", "yatim_override_at",
  "notes", "created_at", "updated_at"
)
SELECT
  'sc_' || pb.id,
  pb.type,
  pb.name,
  pb.date_of_birth, pb.gender,
  pb.phone, pb.address,
  pb.father_deceased, pb.mother_deceased,
  pb.guardian_name, pb.guardian_relation, pb.guardian_phone,
  pb.monthly_income, pb.family_size, pb.housing_status, pb.financial_proof_url,
  pb.yatim_override_reason, pb.yatim_override_by, pb.yatim_override_at,
  pb.notes, pb.created_at, COALESCE(pb.updated_at, pb.created_at)
FROM "project_beneficiaries" pb
WHERE pb.type IN ('YATIM', 'MOZWIZ')
  AND pb.social_case_id IS NULL
ON CONFLICT ("id") DO NOTHING;

UPDATE "project_beneficiaries" pb
SET "social_case_id" = 'sc_' || pb.id
WHERE pb.type IN ('YATIM', 'MOZWIZ')
  AND pb.social_case_id IS NULL
  AND EXISTS (SELECT 1 FROM "social_cases" sc WHERE sc.id = 'sc_' || pb.id);

COMMIT;
