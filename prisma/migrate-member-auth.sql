-- Migration: add login fields to members + member_roles table
-- Run on server: psql -U sc2bomo9230_ni3ma sc2bomo9230_ni3madb < migrate-member-auth.sql

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS user_is_active BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS member_roles (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  UNIQUE (member_id, role)
);
