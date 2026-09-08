-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BUREAU', 'FINANCIAL', 'EDUCATIONAL', 'SOCIAL', 'QURAN', 'MEMBER', 'BAHT_IJTIMA3I_TEAM');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('READ', 'RW', 'ADMIN');

-- CreateEnum
CREATE TYPE "BureauLevel" AS ENUM ('READ', 'RW');

-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('TAMM', 'DAAM_MADRASSI', 'QURAN_TAJWEED', 'MOKHAYAM');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'SICK');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "BeneficiaryType" AS ENUM ('GENERAL', 'YATIM', 'MOZWIZ');

-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('CHILD', 'ADULT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "Section" AS ENUM ('EDUCATIONAL', 'SOCIAL', 'QURAN', 'QUDAT', 'MEDIA');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('EDUCATIONAL', 'SOCIAL', 'QURAN', 'ADMINISTRATIVE', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HifzGrade" AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_WORK');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('NACHAT', 'MACHROO3');

-- CreateEnum
CREATE TYPE "DonationKind" AS ENUM ('CASH', 'IN_KIND');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATED', 'OCCURRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MeetingKind" AS ENUM ('AGO', 'AGE', 'BUREAU', 'OTHER');

-- CreateEnum
CREATE TYPE "GrantFunderKind" AS ENUM ('INDH', 'COMMUNE', 'MINISTRY', 'INTERNATIONAL', 'FOUNDATION', 'OTHER');

-- CreateEnum
CREATE TYPE "GrantStatus" AS ENUM ('APPLIED', 'APPROVED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('GOOD', 'NEEDS_REPAIR', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "SponsorshipKind" AS ENUM ('YATIM', 'STUDENT', 'FAMILY');

-- CreateEnum
CREATE TYPE "SponsorshipStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "OfficialDocKind" AS ENUM ('STATUTES', 'INTERNAL_RULES', 'PV', 'DECLARATION', 'BANK', 'CNSS', 'AGREEMENT', 'INSURANCE', 'RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "DistributionKind" AS ENUM ('RAMADAN_BASKET', 'IFTAR', 'ADHI', 'EID_CLOTHES', 'FOOD_BASKET', 'SCHOOL_KIT', 'OTHER');

-- CreateEnum
CREATE TYPE "MailDirection" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "MailStatus" AS ENUM ('PENDING', 'PROCESSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('PLANNED', 'ONGOING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "EmployeeContractType" AS ENUM ('CDI', 'CDD', 'APPRENTICESHIP', 'STAGE', 'ANAPEC', 'OTHER');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('PENDING', 'PAID', 'CNSS_DECLARED');

-- CreateEnum
CREATE TYPE "PartnershipKind" AS ENUM ('PUBLIC_INSTITUTION', 'PRIVATE_COMPANY', 'NGO', 'SCHOOL', 'HEALTH', 'INTERNATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PartnershipStatus" AS ENUM ('DRAFT', 'SIGNED', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "BookCategory" AS ENUM ('QURAN', 'TAFSIR', 'HADITH', 'FIQH', 'AQIDA', 'ARABIC_LANGUAGE', 'GENERAL', 'CHILDREN', 'OTHER');

-- CreateEnum
CREATE TYPE "BorrowingStatus" AS ENUM ('OPEN', 'RETURNED', 'LATE', 'LOST');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PENDING_PROVISIONING', 'ACTIVE', 'SUSPENDED', 'PROVISION_FAILED');

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('FREE', 'STARTER', 'PRO', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TenantPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "registration_number" SERIAL NOT NULL,
    "member_type" "MemberType" NOT NULL,
    "photo_url" TEXT,
    "full_name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "place_of_birth" TEXT,
    "gender" "Gender",
    "cin" TEXT,
    "parent_cin" TEXT,
    "father_name" TEXT,
    "father_phone" TEXT,
    "father_cin" TEXT,
    "father_profession" TEXT,
    "father_education" TEXT,
    "father_landline" TEXT,
    "father_address" TEXT,
    "mother_name" TEXT,
    "mother_phone" TEXT,
    "mother_cin" TEXT,
    "mother_profession" TEXT,
    "mother_education" TEXT,
    "mother_landline" TEXT,
    "mother_address" TEXT,
    "siblings_count" INTEGER,
    "siblings_boys" INTEGER,
    "siblings_girls" INTEGER,
    "sibling_order" INTEGER,
    "health_status" "HealthStatus",
    "health_conditions" TEXT,
    "educational_level" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "landline" TEXT,
    "profession" TEXT,
    "marital_status" "MaritalStatus",
    "children_boys" INTEGER,
    "children_girls" INTEGER,
    "interest_jtima3iya" BOOLEAN NOT NULL DEFAULT false,
    "interest_tarbawiya" BOOLEAN NOT NULL DEFAULT false,
    "interest_fikriya" BOOLEAN NOT NULL DEFAULT false,
    "interests" TEXT,
    "association_role" TEXT,
    "registration_type" "RegistrationType",
    "registration_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscription_amount" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "username" TEXT,
    "password_hash" TEXT,
    "user_is_active" BOOLEAN NOT NULL DEFAULT false,
    "checkin_token" TEXT,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_links" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "relation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_roles" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "member_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_sections" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "enrolled_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "member_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_contributions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "week_start" DATE NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" TEXT,
    "notes" TEXT,
    "academic_year_id" TEXT,
    "quittance_number" TEXT,
    "quittance_issued_at" DATE,

    CONSTRAINT "weekly_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "section" "Section",
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "expense_date" DATE NOT NULL,
    "receipt_url" TEXT,
    "recorded_by" TEXT,
    "approved_by" TEXT,
    "academic_year_id" TEXT,
    "project_id" TEXT,
    "plan_id" TEXT,
    "plan_line_item_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "donor_name" TEXT,
    "donor_phone" TEXT,
    "donor_cin" TEXT,
    "donor_address" TEXT,
    "donor_email" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "section" "Section" NOT NULL DEFAULT 'SOCIAL',
    "project_id" TEXT,
    "campaign_id" TEXT,
    "donation_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "pledged_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "recorded_by" TEXT,
    "academic_year_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receipt_number" TEXT,
    "receipt_issued_at" DATE,
    "receipt_signed_by" TEXT,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "cover_photo_url" TEXT,
    "recurring_from_id" TEXT,
    "kind" "ProjectKind" NOT NULL DEFAULT 'MACHROO3',
    "description" TEXT,
    "objective" TEXT,
    "target_audience" TEXT,
    "expected_beneficiaries" INTEGER,
    "location" TEXT,
    "partners" TEXT,
    "target_amount" DECIMAL(10,2),
    "start_date" DATE,
    "end_date" DATE,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "section" "Section" NOT NULL DEFAULT 'SOCIAL',
    "academic_year_id" TEXT,
    "created_by" TEXT,
    "evaluation_report" TEXT,
    "evaluation_score" INTEGER,
    "evaluation_lessons" TEXT,
    "evaluation_recommend" TEXT,
    "actual_beneficiaries" INTEGER,
    "evaluated_at" TIMESTAMP(3),
    "evaluated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "in_kind_donations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "donor_name" TEXT,
    "donor_phone" TEXT,
    "item_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT,
    "estimated_value" DECIMAL(10,2),
    "donation_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "recorded_by" TEXT,
    "academic_year_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "in_kind_donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_plans" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "estimated_cost" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_line_items" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "due_date" DATE,
    "estimated_hours" DECIMAL(6,2),
    "planned_expense" DECIMAL(10,2),
    "actual_expense" DECIMAL(10,2),
    "position" INTEGER NOT NULL DEFAULT 0,
    "parent_task_id" TEXT,
    "created_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "open_for_self_claim" BOOLEAN NOT NULL DEFAULT false,
    "needs_media" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_plans" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_worklogs" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "worked_date" DATE NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_worklogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_photos" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_cases" (
    "id" TEXT NOT NULL,
    "case_number" SERIAL NOT NULL,
    "type" "BeneficiaryType" NOT NULL DEFAULT 'YATIM',
    "full_name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "gender" "Gender",
    "cin" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "father_name" TEXT,
    "father_deceased" BOOLEAN,
    "mother_name" TEXT,
    "mother_deceased" BOOLEAN,
    "guardian_name" TEXT,
    "guardian_relation" TEXT,
    "guardian_phone" TEXT,
    "monthly_income" DECIMAL(10,2),
    "family_size" INTEGER,
    "housing_status" TEXT,
    "financial_proof_url" TEXT,
    "yatim_override_reason" TEXT,
    "yatim_override_by" TEXT,
    "yatim_override_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_school_followups" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "semester" TEXT,
    "gpa" DECIMAL(4,2),
    "progress_notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_school_followups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_health_followups" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "has_special_operation" BOOLEAN NOT NULL DEFAULT false,
    "illness" TEXT,
    "treatment_notes" TEXT,
    "progress_notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_health_followups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_beneficiaries" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "social_case_id" TEXT,
    "type" "BeneficiaryType" NOT NULL DEFAULT 'GENERAL',
    "name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "gender" "Gender",
    "phone" TEXT,
    "address" TEXT,
    "items_received" TEXT,
    "amount" DECIMAL(10,2),
    "notes" TEXT,
    "father_deceased" BOOLEAN,
    "mother_deceased" BOOLEAN,
    "guardian_name" TEXT,
    "guardian_relation" TEXT,
    "guardian_phone" TEXT,
    "monthly_income" DECIMAL(10,2),
    "family_size" INTEGER,
    "housing_status" TEXT,
    "financial_proof_url" TEXT,
    "yatim_override_reason" TEXT,
    "yatim_override_by" TEXT,
    "yatim_override_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiary_school_followups" (
    "id" TEXT NOT NULL,
    "beneficiary_id" TEXT NOT NULL,
    "semester" TEXT,
    "gpa" DECIMAL(4,2),
    "progress_notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiary_school_followups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiary_health_followups" (
    "id" TEXT NOT NULL,
    "beneficiary_id" TEXT NOT NULL,
    "has_special_operation" BOOLEAN NOT NULL DEFAULT false,
    "illness" TEXT,
    "treatment_notes" TEXT,
    "progress_notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiary_health_followups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_risks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mitigation" TEXT,
    "severity" "RiskSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_stakeholders" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_stakeholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_notes" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT true,
    "visible_to" "Role"[] DEFAULT ARRAY[]::"Role"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_programs" (
    "id" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "year" INTEGER NOT NULL,
    "academic_year_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annual_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_activities" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "activity_date" DATE,
    "time_start" TEXT,
    "time_end" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_resources" (
    "id" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "program_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT,
    "file_type" TEXT,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "activity_id" TEXT,
    "date" DATE NOT NULL,
    "is_present" BOOLEAN NOT NULL DEFAULT true,
    "checkin_method" TEXT,
    "recorded_by" TEXT,
    "academic_year_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "association_info" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'جمعية النعمة',
    "address" TEXT,
    "city" TEXT NOT NULL DEFAULT 'مكناس',
    "phone" TEXT,
    "email" TEXT,
    "facebook_url" TEXT,
    "cndp_registration" TEXT,
    "data_retention_policy" TEXT,
    "privacy_notice" TEXT,
    "logo_url" TEXT,
    "registration_fees" JSONB,
    "default_locale" TEXT NOT NULL DEFAULT 'ar',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "association_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "member_id" TEXT,
    "section" "Section" NOT NULL,
    "level" "PermissionLevel" NOT NULL,
    "granted_by" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bureau_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "member_id" TEXT,
    "level" "BureauLevel" NOT NULL,
    "granted_by" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bureau_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT,
    "plan" "TenantPlan" NOT NULL DEFAULT 'FREE',
    "status" "TenantStatus" NOT NULL DEFAULT 'PENDING_PROVISIONING',
    "db_url" TEXT NOT NULL,
    "custom_domain" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "trial_ends_at" TIMESTAMP(3),
    "provisioned_at" TIMESTAMP(3),
    "last_provision_error" TEXT,
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "months" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT NOT NULL DEFAULT 'youcanpay',
    "order_id" TEXT NOT NULL,
    "token_id" TEXT,
    "transaction_id" TEXT,
    "status" "TenantPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quran_progress" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "recitation_date" DATE NOT NULL,
    "current_surah" TEXT,
    "surah_from_ayah" INTEGER,
    "surah_to_ayah" INTEGER,
    "hizb" INTEGER,
    "juz" INTEGER,
    "pages_memorized" INTEGER,
    "hifz_grade" "HifzGrade",
    "tajweed_makharij" INTEGER,
    "tajweed_sifaat" INTEGER,
    "tajweed_noon_meem" INTEGER,
    "tajweed_meem_sakinah" INTEGER,
    "tajweed_mudood" INTEGER,
    "tajweed_lam_tareef" INTEGER,
    "tajweed_qalqala" INTEGER,
    "tajweed_tarqeeq_tafkheem" INTEGER,
    "tajweed_raa" INTEGER,
    "tajweed_waqf" INTEGER,
    "tajweed_imalah" INTEGER,
    "tajweed_fluency" INTEGER,
    "tajweed_overall" INTEGER,
    "notes" TEXT,
    "recorded_by" TEXT,
    "academic_year_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quran_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_hours" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "activity_id" TEXT,
    "hours_date" DATE NOT NULL,
    "hours" DECIMAL(6,2) NOT NULL,
    "description" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "academic_year_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "kind" "MeetingKind" NOT NULL DEFAULT 'AGO',
    "title" TEXT NOT NULL,
    "held_at" DATE NOT NULL,
    "location" TEXT,
    "convocation_method" TEXT,
    "agenda" TEXT,
    "minutes" TEXT,
    "minutes_url" TEXT,
    "expected_count" INTEGER NOT NULL DEFAULT 0,
    "present_count" INTEGER NOT NULL DEFAULT 0,
    "quorum_pct" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_decisions" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "votes_for" INTEGER NOT NULL DEFAULT 0,
    "votes_against" INTEGER NOT NULL DEFAULT 0,
    "votes_abstain" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grants" (
    "id" TEXT NOT NULL,
    "funder_name" TEXT NOT NULL,
    "funder_kind" "GrantFunderKind" NOT NULL DEFAULT 'OTHER',
    "project_name" TEXT NOT NULL,
    "reference" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "GrantStatus" NOT NULL DEFAULT 'APPLIED',
    "signed_at" DATE,
    "start_date" DATE,
    "end_date" DATE,
    "project_id" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grant_tranches" (
    "id" TEXT NOT NULL,
    "grant_id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'شطر',
    "amount" DECIMAL(10,2) NOT NULL,
    "expected_at" DATE,
    "received_at" DATE,
    "report_due_at" DATE,
    "reported_at" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grant_tranches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "value" DECIMAL(10,2),
    "serial_number" TEXT,
    "location" TEXT,
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "acquired_at" DATE,
    "source" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorships" (
    "id" TEXT NOT NULL,
    "kind" "SponsorshipKind" NOT NULL DEFAULT 'YATIM',
    "beneficiary_name" TEXT NOT NULL,
    "social_case_id" TEXT,
    "sponsor_name" TEXT NOT NULL,
    "sponsor_phone" TEXT,
    "monthly_amount" DECIMAL(10,2) NOT NULL,
    "day_of_month" INTEGER NOT NULL DEFAULT 5,
    "started_at" DATE NOT NULL,
    "ended_at" DATE,
    "status" "SponsorshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsorships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_documents" (
    "id" TEXT NOT NULL,
    "kind" "OfficialDocKind" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "reference" TEXT,
    "issued_at" DATE,
    "expires_at" DATE,
    "reminder_days" INTEGER NOT NULL DEFAULT 30,
    "file_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "official_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bureau_mandates" (
    "id" TEXT NOT NULL,
    "member_id" TEXT,
    "member_name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "position_order" INTEGER NOT NULL DEFAULT 99,
    "started_at" DATE NOT NULL,
    "ended_at" DATE,
    "declared_at" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "bureau_mandates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_campaigns" (
    "id" TEXT NOT NULL,
    "kind" "DistributionKind" NOT NULL DEFAULT 'OTHER',
    "name" TEXT NOT NULL,
    "year_label" TEXT,
    "unit_label" TEXT,
    "planned_units" INTEGER NOT NULL DEFAULT 0,
    "budget" DECIMAL(10,2),
    "start_date" DATE,
    "end_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distribution_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_entries" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "beneficiary_name" TEXT NOT NULL,
    "social_case_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distribution_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_items" (
    "id" TEXT NOT NULL,
    "direction" "MailDirection" NOT NULL DEFAULT 'INCOMING',
    "reference" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "correspondent" TEXT NOT NULL,
    "mail_date" DATE NOT NULL,
    "channel" TEXT,
    "status" "MailStatus" NOT NULL DEFAULT 'PENDING',
    "response_due_at" DATE,
    "responded_at" DATE,
    "file_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "responsible_name" TEXT,
    "opened_at" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "field" TEXT,
    "trainer_name" TEXT,
    "partner" TEXT,
    "location" TEXT,
    "seats_total" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATE,
    "end_date" DATE,
    "status" "CourseStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_participants" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_contracts" (
    "id" TEXT NOT NULL,
    "member_id" TEXT,
    "volunteer_name" TEXT NOT NULL,
    "cin" TEXT,
    "phone" TEXT,
    "birth_date" DATE,
    "address" TEXT,
    "mission_title" TEXT NOT NULL,
    "mission_details" TEXT,
    "weekly_hours" DECIMAL(4,1),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "insurance_ref" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "signed_at" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "cin" TEXT,
    "cnss_number" TEXT,
    "position" TEXT NOT NULL,
    "contract_type" "EmployeeContractType" NOT NULL DEFAULT 'CDI',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "hire_date" DATE NOT NULL,
    "end_date" DATE,
    "gross_salary" DECIMAL(10,2),
    "bank_name" TEXT,
    "bank_rib" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "contract_doc_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "gross_amount" DECIMAL(10,2) NOT NULL,
    "cnss_amount" DECIMAL(10,2),
    "net_amount" DECIMAL(10,2) NOT NULL,
    "paid_at" DATE,
    "status" "PayrollStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partnerships" (
    "id" TEXT NOT NULL,
    "partner_name" TEXT NOT NULL,
    "kind" "PartnershipKind" NOT NULL DEFAULT 'OTHER',
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "object" TEXT NOT NULL,
    "signed_at" DATE,
    "start_date" DATE,
    "end_date" DATE,
    "status" "PartnershipStatus" NOT NULL DEFAULT 'DRAFT',
    "file_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partnerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_books" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "category" "BookCategory" NOT NULL DEFAULT 'OTHER',
    "isbn" TEXT,
    "copies_total" INTEGER NOT NULL DEFAULT 1,
    "shelf" TEXT,
    "acquired_at" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_borrowings" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "borrower_name" TEXT NOT NULL,
    "member_id" TEXT,
    "borrowed_at" DATE NOT NULL,
    "due_at" DATE NOT NULL,
    "returned_at" DATE,
    "status" "BorrowingStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_borrowings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL DEFAULT 'WHATSAPP',
    "body" TEXT NOT NULL,
    "variables" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages_out" (
    "id" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "recipient_phone" TEXT NOT NULL,
    "recipient_email" TEXT,
    "recipient_name" TEXT,
    "recipient_member_id" TEXT,
    "template_key" TEXT,
    "variables" JSONB,
    "body" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "cost" DECIMAL(8,4),
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_out_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "target_amount" DECIMAL(12,2),
    "start_date" DATE,
    "end_date" DATE,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "cover_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT,

    CONSTRAINT "donation_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiary_receipts" (
    "id" TEXT NOT NULL,
    "social_case_id" TEXT,
    "beneficiary_name" TEXT NOT NULL,
    "recipient_cin" TEXT,
    "description" TEXT NOT NULL,
    "campaign_id" TEXT,
    "estimated_value" DECIMAL(10,2),
    "handed_at" DATE NOT NULL,
    "receipt_number" TEXT,
    "receipt_issued_at" DATE,
    "receipt_signed_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiary_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_registers" (
    "id" TEXT NOT NULL,
    "year_label" TEXT NOT NULL,
    "snapshot_at" DATE NOT NULL,
    "total_value" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_registers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "members_registration_number_key" ON "members"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "members_username_key" ON "members"("username");

-- CreateIndex
CREATE UNIQUE INDEX "members_checkin_token_key" ON "members"("checkin_token");

-- CreateIndex
CREATE UNIQUE INDEX "family_links_parent_id_child_id_key" ON "family_links"("parent_id", "child_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "member_roles_member_id_role_key" ON "member_roles"("member_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "member_sections_member_id_section_key" ON "member_sections"("member_id", "section");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_contributions_quittance_number_key" ON "weekly_contributions"("quittance_number");

-- CreateIndex
CREATE INDEX "weekly_contributions_quittance_number_idx" ON "weekly_contributions"("quittance_number");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_contributions_member_id_week_start_key" ON "weekly_contributions"("member_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "donations_receipt_number_key" ON "donations"("receipt_number");

-- CreateIndex
CREATE INDEX "donations_donation_date_idx" ON "donations"("donation_date");

-- CreateIndex
CREATE INDEX "donations_receipt_number_idx" ON "donations"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "social_projects_slug_key" ON "social_projects"("slug");

-- CreateIndex
CREATE INDEX "project_tasks_project_id_status_idx" ON "project_tasks"("project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "task_plans_task_id_plan_id_key" ON "task_plans"("task_id", "plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_task_id_member_id_key" ON "task_assignments"("task_id", "member_id");

-- CreateIndex
CREATE INDEX "task_worklogs_task_id_idx" ON "task_worklogs"("task_id");

-- CreateIndex
CREATE INDEX "task_worklogs_member_id_worked_date_idx" ON "task_worklogs"("member_id", "worked_date");

-- CreateIndex
CREATE UNIQUE INDEX "social_cases_case_number_key" ON "social_cases"("case_number");

-- CreateIndex
CREATE INDEX "social_cases_type_idx" ON "social_cases"("type");

-- CreateIndex
CREATE INDEX "social_cases_full_name_idx" ON "social_cases"("full_name");

-- CreateIndex
CREATE INDEX "case_school_followups_case_id_idx" ON "case_school_followups"("case_id");

-- CreateIndex
CREATE INDEX "case_health_followups_case_id_idx" ON "case_health_followups"("case_id");

-- CreateIndex
CREATE INDEX "project_beneficiaries_project_id_idx" ON "project_beneficiaries"("project_id");

-- CreateIndex
CREATE INDEX "project_beneficiaries_social_case_id_idx" ON "project_beneficiaries"("social_case_id");

-- CreateIndex
CREATE INDEX "project_beneficiaries_type_idx" ON "project_beneficiaries"("type");

-- CreateIndex
CREATE INDEX "beneficiary_school_followups_beneficiary_id_idx" ON "beneficiary_school_followups"("beneficiary_id");

-- CreateIndex
CREATE INDEX "beneficiary_health_followups_beneficiary_id_idx" ON "beneficiary_health_followups"("beneficiary_id");

-- CreateIndex
CREATE UNIQUE INDEX "annual_programs_section_year_key" ON "annual_programs"("section", "year");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_member_id_section_date_activity_id_key" ON "attendance"("member_id", "section", "date", "activity_id");

-- CreateIndex
CREATE INDEX "section_permissions_section_level_idx" ON "section_permissions"("section", "level");

-- CreateIndex
CREATE UNIQUE INDEX "section_permissions_user_id_section_key" ON "section_permissions"("user_id", "section");

-- CreateIndex
CREATE UNIQUE INDEX "section_permissions_member_id_section_key" ON "section_permissions"("member_id", "section");

-- CreateIndex
CREATE INDEX "bureau_permissions_level_idx" ON "bureau_permissions"("level");

-- CreateIndex
CREATE UNIQUE INDEX "bureau_permissions_user_id_key" ON "bureau_permissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bureau_permissions_member_id_key" ON "bureau_permissions"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_label_key" ON "academic_years"("label");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_db_url_key" ON "tenants"("db_url");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_custom_domain_key" ON "tenants"("custom_domain");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_payments_order_id_key" ON "tenant_payments"("order_id");

-- CreateIndex
CREATE INDEX "tenant_payments_tenant_id_status_idx" ON "tenant_payments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "quran_progress_member_id_recitation_date_idx" ON "quran_progress"("member_id", "recitation_date");

-- CreateIndex
CREATE INDEX "volunteer_hours_member_id_hours_date_idx" ON "volunteer_hours"("member_id", "hours_date");

-- CreateIndex
CREATE INDEX "meetings_held_at_idx" ON "meetings"("held_at");

-- CreateIndex
CREATE INDEX "meeting_decisions_meeting_id_idx" ON "meeting_decisions"("meeting_id");

-- CreateIndex
CREATE INDEX "grants_status_idx" ON "grants"("status");

-- CreateIndex
CREATE INDEX "grants_end_date_idx" ON "grants"("end_date");

-- CreateIndex
CREATE INDEX "grant_tranches_grant_id_idx" ON "grant_tranches"("grant_id");

-- CreateIndex
CREATE INDEX "assets_category_idx" ON "assets"("category");

-- CreateIndex
CREATE INDEX "sponsorships_status_idx" ON "sponsorships"("status");

-- CreateIndex
CREATE INDEX "official_documents_expires_at_idx" ON "official_documents"("expires_at");

-- CreateIndex
CREATE INDEX "bureau_mandates_is_active_idx" ON "bureau_mandates"("is_active");

-- CreateIndex
CREATE INDEX "distribution_campaigns_kind_idx" ON "distribution_campaigns"("kind");

-- CreateIndex
CREATE INDEX "distribution_entries_campaign_id_idx" ON "distribution_entries"("campaign_id");

-- CreateIndex
CREATE INDEX "mail_items_direction_status_idx" ON "mail_items"("direction", "status");

-- CreateIndex
CREATE INDEX "mail_items_mail_date_idx" ON "mail_items"("mail_date");

-- CreateIndex
CREATE UNIQUE INDEX "mail_items_direction_reference_key" ON "mail_items"("direction", "reference");

-- CreateIndex
CREATE INDEX "branches_is_active_idx" ON "branches"("is_active");

-- CreateIndex
CREATE INDEX "training_courses_status_idx" ON "training_courses"("status");

-- CreateIndex
CREATE INDEX "course_participants_course_id_idx" ON "course_participants"("course_id");

-- CreateIndex
CREATE INDEX "volunteer_contracts_status_idx" ON "volunteer_contracts"("status");

-- CreateIndex
CREATE INDEX "employees_status_idx" ON "employees"("status");

-- CreateIndex
CREATE INDEX "payroll_runs_period_idx" ON "payroll_runs"("period");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_employee_id_period_key" ON "payroll_runs"("employee_id", "period");

-- CreateIndex
CREATE INDEX "partnerships_status_idx" ON "partnerships"("status");

-- CreateIndex
CREATE INDEX "partnerships_end_date_idx" ON "partnerships"("end_date");

-- CreateIndex
CREATE INDEX "library_books_category_idx" ON "library_books"("category");

-- CreateIndex
CREATE INDEX "book_borrowings_book_id_idx" ON "book_borrowings"("book_id");

-- CreateIndex
CREATE INDEX "book_borrowings_status_idx" ON "book_borrowings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_key_key" ON "message_templates"("key");

-- CreateIndex
CREATE INDEX "messages_out_status_created_at_idx" ON "messages_out"("status", "created_at");

-- CreateIndex
CREATE INDEX "messages_out_recipient_member_id_idx" ON "messages_out"("recipient_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "donation_campaigns_slug_key" ON "donation_campaigns"("slug");

-- CreateIndex
CREATE INDEX "donation_campaigns_is_public_is_closed_idx" ON "donation_campaigns"("is_public", "is_closed");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_receipts_receipt_number_key" ON "beneficiary_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "beneficiary_receipts_handed_at_idx" ON "beneficiary_receipts"("handed_at");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_registers_year_label_key" ON "inventory_registers"("year_label");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_links" ADD CONSTRAINT "family_links_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_links" ADD CONSTRAINT "family_links_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_sections" ADD CONSTRAINT "member_sections_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_contributions" ADD CONSTRAINT "weekly_contributions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_contributions" ADD CONSTRAINT "weekly_contributions_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_contributions" ADD CONSTRAINT "weekly_contributions_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "project_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_plan_line_item_id_fkey" FOREIGN KEY ("plan_line_item_id") REFERENCES "plan_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "donation_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_receipt_signed_by_fkey" FOREIGN KEY ("receipt_signed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_projects" ADD CONSTRAINT "social_projects_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_projects" ADD CONSTRAINT "social_projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_projects" ADD CONSTRAINT "social_projects_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_projects" ADD CONSTRAINT "social_projects_recurring_from_id_fkey" FOREIGN KEY ("recurring_from_id") REFERENCES "social_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_kind_donations" ADD CONSTRAINT "in_kind_donations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_kind_donations" ADD CONSTRAINT "in_kind_donations_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_kind_donations" ADD CONSTRAINT "in_kind_donations_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_plans" ADD CONSTRAINT "project_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_line_items" ADD CONSTRAINT "plan_line_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "project_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "project_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_plans" ADD CONSTRAINT "task_plans_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_plans" ADD CONSTRAINT "task_plans_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "project_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_worklogs" ADD CONSTRAINT "task_worklogs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_worklogs" ADD CONSTRAINT "task_worklogs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_photos" ADD CONSTRAINT "project_photos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_school_followups" ADD CONSTRAINT "case_school_followups_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "social_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_health_followups" ADD CONSTRAINT "case_health_followups_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "social_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_beneficiaries" ADD CONSTRAINT "project_beneficiaries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_beneficiaries" ADD CONSTRAINT "project_beneficiaries_social_case_id_fkey" FOREIGN KEY ("social_case_id") REFERENCES "social_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_school_followups" ADD CONSTRAINT "beneficiary_school_followups_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "project_beneficiaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_health_followups" ADD CONSTRAINT "beneficiary_health_followups_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "project_beneficiaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_stakeholders" ADD CONSTRAINT "project_stakeholders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_programs" ADD CONSTRAINT "annual_programs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_programs" ADD CONSTRAINT "annual_programs_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_activities" ADD CONSTRAINT "program_activities_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "annual_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_resources" ADD CONSTRAINT "section_resources_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "annual_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_resources" ADD CONSTRAINT "section_resources_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "program_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_permissions" ADD CONSTRAINT "section_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_permissions" ADD CONSTRAINT "section_permissions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_permissions" ADD CONSTRAINT "section_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bureau_permissions" ADD CONSTRAINT "bureau_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bureau_permissions" ADD CONSTRAINT "bureau_permissions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bureau_permissions" ADD CONSTRAINT "bureau_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_payments" ADD CONSTRAINT "tenant_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quran_progress" ADD CONSTRAINT "quran_progress_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quran_progress" ADD CONSTRAINT "quran_progress_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quran_progress" ADD CONSTRAINT "quran_progress_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_hours" ADD CONSTRAINT "volunteer_hours_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_hours" ADD CONSTRAINT "volunteer_hours_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "program_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_hours" ADD CONSTRAINT "volunteer_hours_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_hours" ADD CONSTRAINT "volunteer_hours_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_decisions" ADD CONSTRAINT "meeting_decisions_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grants" ADD CONSTRAINT "grants_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_tranches" ADD CONSTRAINT "grant_tranches_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_social_case_id_fkey" FOREIGN KEY ("social_case_id") REFERENCES "social_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bureau_mandates" ADD CONSTRAINT "bureau_mandates_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_entries" ADD CONSTRAINT "distribution_entries_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "distribution_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_entries" ADD CONSTRAINT "distribution_entries_social_case_id_fkey" FOREIGN KEY ("social_case_id") REFERENCES "social_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_participants" ADD CONSTRAINT "course_participants_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_contracts" ADD CONSTRAINT "volunteer_contracts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_borrowings" ADD CONSTRAINT "book_borrowings_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "library_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_borrowings" ADD CONSTRAINT "book_borrowings_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages_out" ADD CONSTRAINT "messages_out_template_key_fkey" FOREIGN KEY ("template_key") REFERENCES "message_templates"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages_out" ADD CONSTRAINT "messages_out_recipient_member_id_fkey" FOREIGN KEY ("recipient_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_campaigns" ADD CONSTRAINT "donation_campaigns_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "social_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_receipts" ADD CONSTRAINT "beneficiary_receipts_social_case_id_fkey" FOREIGN KEY ("social_case_id") REFERENCES "social_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_receipts" ADD CONSTRAINT "beneficiary_receipts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "distribution_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_receipts" ADD CONSTRAINT "beneficiary_receipts_receipt_signed_by_fkey" FOREIGN KEY ("receipt_signed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_registers" ADD CONSTRAINT "inventory_registers_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

