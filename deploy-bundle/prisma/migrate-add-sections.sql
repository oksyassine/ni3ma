-- =============================================================
-- Add QUDAT (مركز تأهيل القضاة) + MEDIA (القسم الإعلامي) to Section enum.
-- ALTER TYPE ADD VALUE must run OUTSIDE BEGIN/COMMIT on PG < 14.
-- =============================================================
ALTER TYPE "Section" ADD VALUE IF NOT EXISTS 'QUDAT';
ALTER TYPE "Section" ADD VALUE IF NOT EXISTS 'MEDIA';
