-- CreateEnum
CREATE TYPE "ZakatAsnaaf" AS ENUM ('FAQIR', 'MISKEEN', 'AMIL', 'MUALLAFATUL_QULOOB', 'FIR_RIQAB', 'AL_GHARIMIN', 'FI_SABILILLAH', 'IBN_AL_SABIL');

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
CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'ANALYTIC');

-- CreateEnum
CREATE TYPE "JournalSource" AS ENUM ('DONATION', 'CONTRIBUTION', 'EXPENSE', 'PAYROLL', 'DISTRIBUTION', 'GRANT', 'ADJUSTMENT', 'CLOSING');

-- CreateEnum
CREATE TYPE "Side" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('DRAFT', 'CANDIDACY_OPEN', 'CANDIDACY_CLOSED', 'VOTING_OPEN', 'VOTING_CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventPaymentMode" AS ENUM ('FREE', 'ONLINE', 'ONSITE');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'PAID', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PUBLISH';
ALTER TYPE "AuditAction" ADD VALUE 'SKIP';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DonationKind" ADD VALUE 'ZAKAT_FITRA';
ALTER TYPE "DonationKind" ADD VALUE 'ZAKAT_MAL';
ALTER TYPE "DonationKind" ADD VALUE 'SADAQA';
ALTER TYPE "DonationKind" ADD VALUE 'WAQF';
ALTER TYPE "DonationKind" ADD VALUE 'KAFFARA';

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "weekly_contributions" ADD COLUMN     "quittance_issued_at" DATE,
ADD COLUMN     "quittance_number" TEXT;

-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "asnaaf" "ZakatAsnaaf",
ADD COLUMN     "campaign_id" TEXT,
ADD COLUMN     "donor_address" TEXT,
ADD COLUMN     "donor_cin" TEXT,
ADD COLUMN     "donor_email" TEXT,
ADD COLUMN     "kind" "DonationKind" NOT NULL DEFAULT 'CASH',
ADD COLUMN     "receipt_issued_at" DATE,
ADD COLUMN     "receipt_number" TEXT,
ADD COLUMN     "receipt_signed_by" TEXT,
ADD COLUMN     "waqf_deed_number" TEXT;

-- AlterTable
ALTER TABLE "association_info" ADD COLUMN     "cnss_employer_code" TEXT,
ADD COLUMN     "ice" TEXT,
ADD COLUMN     "tax_id" TEXT;

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

-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" TEXT NOT NULL,
    "actor" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "tenant_id" TEXT,
    "payment_id" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "class" INTEGER NOT NULL,
    "type" "AccountType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "entry_date" DATE NOT NULL,
    "piece_number" TEXT,
    "source" "JournalSource" NOT NULL,
    "source_id" TEXT,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "analytic_code" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "account_code" TEXT,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "side" "Side" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "label" TEXT,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elections" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "election_date" DATE NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 7,
    "adult_weight" INTEGER NOT NULL DEFAULT 1,
    "child_weight" INTEGER NOT NULL DEFAULT 0,
    "status" "ElectionStatus" NOT NULL DEFAULT 'DRAFT',
    "votes_cast" INTEGER NOT NULL DEFAULT 0,
    "eligible_voters" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidacies" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "statement" TEXT,
    "ballot_order" INTEGER NOT NULL DEFAULT 0,
    "withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidacies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "voter_id" TEXT NOT NULL,
    "ballot" JSONB NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "cast_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_minutes" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "elected_order" JSONB NOT NULL,
    "bureau_roles" JSONB NOT NULL,
    "signed_by" TEXT,
    "signed_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_minutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "city" TEXT,
    "capacity" INTEGER,
    "ticket_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "member_discount_pct" DECIMAL(5,2) DEFAULT 50,
    "payment_mode" "EventPaymentMode" NOT NULL DEFAULT 'FREE',
    "youcan_order_id" TEXT,
    "visibility" "EventVisibility" NOT NULL DEFAULT 'DRAFT',
    "poster_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "attendee_name" TEXT NOT NULL,
    "attendee_phone" TEXT,
    "attendee_email" TEXT,
    "member_id" TEXT,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
    "qr_token" TEXT NOT NULL,
    "youcan_tx_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "checked_in_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CandidacyToVote" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

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

-- CreateIndex
CREATE INDEX "platform_audit_logs_entity_entity_id_idx" ON "platform_audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "platform_audit_logs_created_at_idx" ON "platform_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "webhook_events_processed_at_idx" ON "webhook_events"("processed_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_eventId_key" ON "webhook_events"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_member_id_idx" ON "password_reset_tokens"("member_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_code_key" ON "chart_of_accounts"("code");

-- CreateIndex
CREATE INDEX "chart_of_accounts_class_idx" ON "chart_of_accounts"("class");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_piece_number_key" ON "journal_entries"("piece_number");

-- CreateIndex
CREATE INDEX "journal_entries_entry_date_idx" ON "journal_entries"("entry_date");

-- CreateIndex
CREATE INDEX "journal_entries_source_source_id_idx" ON "journal_entries"("source", "source_id");

-- CreateIndex
CREATE INDEX "journal_lines_entry_id_idx" ON "journal_lines"("entry_id");

-- CreateIndex
CREATE INDEX "journal_lines_account_code_idx" ON "journal_lines"("account_code");

-- CreateIndex
CREATE INDEX "elections_election_date_idx" ON "elections"("election_date");

-- CreateIndex
CREATE UNIQUE INDEX "candidacies_election_id_member_id_key" ON "candidacies"("election_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_election_id_voter_id_key" ON "votes"("election_id", "voter_id");

-- CreateIndex
CREATE UNIQUE INDEX "election_minutes_election_id_key" ON "election_minutes"("election_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "events_youcan_order_id_key" ON "events"("youcan_order_id");

-- CreateIndex
CREATE INDEX "events_starts_at_idx" ON "events"("starts_at");

-- CreateIndex
CREATE INDEX "events_visibility_idx" ON "events"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qr_token_key" ON "tickets"("qr_token");

-- CreateIndex
CREATE INDEX "tickets_event_id_status_idx" ON "tickets"("event_id", "status");

-- CreateIndex
CREATE INDEX "tickets_event_id_idx" ON "tickets"("event_id");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "_CandidacyToVote_AB_unique" ON "_CandidacyToVote"("A", "B");

-- CreateIndex
CREATE INDEX "_CandidacyToVote_B_index" ON "_CandidacyToVote"("B");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_contributions_quittance_number_key" ON "weekly_contributions"("quittance_number");

-- CreateIndex
CREATE INDEX "weekly_contributions_quittance_number_idx" ON "weekly_contributions"("quittance_number");

-- CreateIndex
CREATE UNIQUE INDEX "donations_receipt_number_key" ON "donations"("receipt_number");

-- CreateIndex
CREATE INDEX "donations_donation_date_idx" ON "donations"("donation_date");

-- CreateIndex
CREATE INDEX "donations_receipt_number_idx" ON "donations"("receipt_number");

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "donation_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_receipt_signed_by_fkey" FOREIGN KEY ("receipt_signed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_account_code_fkey" FOREIGN KEY ("account_code") REFERENCES "chart_of_accounts"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_code_fkey" FOREIGN KEY ("account_code") REFERENCES "chart_of_accounts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elections" ADD CONSTRAINT "elections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidacies" ADD CONSTRAINT "candidacies_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidacies" ADD CONSTRAINT "candidacies_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_minutes" ADD CONSTRAINT "election_minutes_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_minutes" ADD CONSTRAINT "election_minutes_signed_by_fkey" FOREIGN KEY ("signed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CandidacyToVote" ADD CONSTRAINT "_CandidacyToVote_A_fkey" FOREIGN KEY ("A") REFERENCES "candidacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CandidacyToVote" ADD CONSTRAINT "_CandidacyToVote_B_fkey" FOREIGN KEY ("B") REFERENCES "votes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

