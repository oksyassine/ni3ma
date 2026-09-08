-- Migration: invitation links for adult members
-- Run: PGPASSWORD='Ni3maAssoc2026!' psql -U sc2bomo9230_ni3ma sc2bomo9230_ni3madb < prisma/migrate-invitation.sql

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
