-- Migration: Enable Realtime publication for statement_imports table
-- Description: Adds statement_imports table to supabase_realtime publication to allow clients to subscribe to status updates
-- Prerequisites: statement_imports table must exist (from migration 20251230000001)
-- Rollback: ALTER PUBLICATION supabase_realtime DROP TABLE statement_imports;

-- Add statement_imports table to supabase_realtime publication
-- This enables real-time subscriptions for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE statement_imports;

-- Verify the table is in the publication (informational query)
-- Uncomment and run in SQL editor to verify:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'statement_imports';

