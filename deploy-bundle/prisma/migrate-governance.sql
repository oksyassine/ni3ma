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

