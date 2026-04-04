-- Migration: Add SnapTrade integration tables
-- Description: Adds snaptrade_users, snaptrade_connections, snaptrade_accounts,
--   snaptrade_webhook_events tables and extends assets with data_source,
--   snaptrade_account_id, and balance_currency columns.
-- Prerequisites: pgcrypto (enabled below), update_updated_at_column() trigger fn
-- Rollback: See bottom of file

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- snaptrade_users
-- One row per app user who has initiated SnapTrade registration.
-- userSecret is stored encrypted via pgp_sym_encrypt.
-- No client-accessible RLS SELECT policy — edge functions use service role.
-- ============================================================
CREATE TABLE IF NOT EXISTS snaptrade_users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             text NOT NULL UNIQUE,         -- Clerk sub
  snaptrade_user_id   text NOT NULL UNIQUE,         -- same value as user_id (Clerk sub)
  user_secret         text NOT NULL,                -- pgp_sym_encrypt(secret, SNAPTRADE_ENCRYPTION_KEY)
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  snaptrade_users                 IS 'Maps app users to SnapTrade users. userSecret is encrypted at rest.';
COMMENT ON COLUMN snaptrade_users.user_id         IS 'Clerk JWT sub — primary identity anchor';
COMMENT ON COLUMN snaptrade_users.snaptrade_user_id IS 'SnapTrade userId; same as user_id (Clerk sub)';
COMMENT ON COLUMN snaptrade_users.user_secret     IS 'pgp_sym_encrypt encrypted SnapTrade userSecret';

CREATE INDEX IF NOT EXISTS idx_snaptrade_users_user_id ON snaptrade_users(user_id);

ALTER TABLE snaptrade_users ENABLE ROW LEVEL SECURITY;
-- No SELECT policy for client: user_secret must never be exposed via RLS.
-- Edge functions bypass RLS using service role key.

-- ============================================================
-- snaptrade_connections
-- One row per brokerage connection (= SnapTrade brokerage authorization).
-- A single connection can contain multiple accounts (TFSA + RRSP + Margin).
-- ============================================================
CREATE TABLE IF NOT EXISTS snaptrade_connections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             text NOT NULL,                -- Clerk sub
  brokerage_auth_id   text NOT NULL UNIQUE,         -- SnapTrade brokerageAuthorizationId
  brokerage_slug      text NOT NULL,                -- e.g. 'QUESTRADE'
  brokerage_name      text NOT NULL,
  connection_type     text NOT NULL DEFAULT 'read', -- 'read' | 'trade'
  is_disabled         boolean NOT NULL DEFAULT false,
  disabled_at         timestamptz,
  last_refreshed_at   timestamptz,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  snaptrade_connections                 IS 'One row per brokerage connection (brokerage authorization). May contain multiple accounts.';
COMMENT ON COLUMN snaptrade_connections.brokerage_auth_id IS 'SnapTrade brokerageAuthorizationId — used for reconnect and refresh';
COMMENT ON COLUMN snaptrade_connections.is_disabled     IS 'true when SnapTrade reports CONNECTION_BROKEN; cleared on CONNECTION_FIXED';

CREATE INDEX IF NOT EXISTS idx_snaptrade_connections_user_id ON snaptrade_connections(user_id);

ALTER TABLE snaptrade_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snaptrade_connections: users read own"
  ON snaptrade_connections FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "snaptrade_connections: users insert own"
  ON snaptrade_connections FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "snaptrade_connections: users update own"
  ON snaptrade_connections FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "snaptrade_connections: users delete own"
  ON snaptrade_connections FOR DELETE
  USING ((auth.jwt() ->> 'sub') = user_id);

-- ============================================================
-- snaptrade_accounts
-- One row per brokerage account (child of a connection).
-- Stores the last known balance in native brokerage currency (no FX conversion).
-- ============================================================
CREATE TABLE IF NOT EXISTS snaptrade_accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               text NOT NULL,              -- Clerk sub
  connection_id         uuid NOT NULL REFERENCES snaptrade_connections(id) ON DELETE CASCADE,
  snaptrade_account_id  text NOT NULL UNIQUE,        -- SnapTrade accountId UUID
  account_name          text NOT NULL,
  account_number        text,                        -- last 4 chars only (masked server-side)
  institution_name      text,
  account_type          text,                        -- e.g. 'Margin', 'TFSA'
  balance_amount        numeric(18,4),               -- last known balance in native currency
  balance_currency      text,                        -- ISO 4217: 'CAD', 'USD', 'AUD', etc.
  is_imported           boolean NOT NULL DEFAULT false,
  asset_id              uuid,                        -- FK set after assets row created; avoid circular FK at creation
  last_balance_sync_at  timestamptz,
  sync_error            text,
  created_at            timestamptz DEFAULT now() NOT NULL,
  updated_at            timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  snaptrade_accounts                    IS 'One row per brokerage account within a connection. Value stored in native currency.';
COMMENT ON COLUMN snaptrade_accounts.account_number     IS 'Masked — last 4 chars of brokerage account number only';
COMMENT ON COLUMN snaptrade_accounts.balance_currency   IS 'ISO 4217 currency code; NOT converted to AUD in Phase 1';
COMMENT ON COLUMN snaptrade_accounts.asset_id           IS 'FK to assets.id — set after import; nullable (not yet imported)';

CREATE INDEX IF NOT EXISTS idx_snaptrade_accounts_user_id       ON snaptrade_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_snaptrade_accounts_connection_id ON snaptrade_accounts(connection_id);

ALTER TABLE snaptrade_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snaptrade_accounts: users read own"
  ON snaptrade_accounts FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "snaptrade_accounts: users insert own"
  ON snaptrade_accounts FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "snaptrade_accounts: users update own"
  ON snaptrade_accounts FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "snaptrade_accounts: users delete own"
  ON snaptrade_accounts FOR DELETE
  USING ((auth.jwt() ->> 'sub') = user_id);

-- ============================================================
-- snaptrade_webhook_events
-- Idempotency log for all SnapTrade webhook deliveries.
-- Created in Phase 1 so it exists before webhooks can fire.
-- Append-only from edge function perspective.
-- ============================================================
CREATE TABLE IF NOT EXISTS snaptrade_webhook_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id          text NOT NULL UNIQUE,          -- SnapTrade webhookId (deduplication key)
  event_type          text NOT NULL,
  user_id             text,
  payload             jsonb NOT NULL,
  processed_at        timestamptz DEFAULT now() NOT NULL,
  processing_status   text NOT NULL DEFAULT 'ok'     -- 'ok' | 'error' | 'skipped'
);

COMMENT ON TABLE  snaptrade_webhook_events            IS 'Append-only audit log of all SnapTrade webhook deliveries. webhook_id is the deduplication key.';
COMMENT ON COLUMN snaptrade_webhook_events.webhook_id IS 'SnapTrade webhookId — unique per delivery attempt';

CREATE INDEX IF NOT EXISTS idx_snaptrade_webhook_events_user_id    ON snaptrade_webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_snaptrade_webhook_events_event_type ON snaptrade_webhook_events(event_type);

-- No RLS on webhook_events — written only by the service-role webhook edge function.
-- Client never reads this table directly.

-- ============================================================
-- assets table extensions
-- data_source: 'manual' (default) | 'snaptrade'
-- snaptrade_account_id: FK to snaptrade_accounts (nullable for manual assets)
-- balance_currency: native brokerage currency (null for manual assets)
-- ============================================================
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS data_source          text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS snaptrade_account_id uuid,
  ADD COLUMN IF NOT EXISTS balance_currency     text;

COMMENT ON COLUMN assets.data_source          IS 'manual | snaptrade — distinguishes auto-synced from user-entered assets';
COMMENT ON COLUMN assets.snaptrade_account_id IS 'FK to snaptrade_accounts.id; null for manual assets';
COMMENT ON COLUMN assets.balance_currency     IS 'ISO 4217 currency code from brokerage; null for manual assets';

-- Add FK constraint after both tables exist
ALTER TABLE snaptrade_accounts
  ADD CONSTRAINT fk_snaptrade_accounts_asset
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL;

ALTER TABLE assets
  ADD CONSTRAINT fk_assets_snaptrade_account
    FOREIGN KEY (snaptrade_account_id) REFERENCES snaptrade_accounts(id) ON DELETE SET NULL;

-- Index for fast lookup of snaptrade assets
CREATE INDEX IF NOT EXISTS idx_assets_snaptrade_account_id ON assets(snaptrade_account_id) WHERE snaptrade_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_data_source          ON assets(data_source)          WHERE data_source <> 'manual';

-- ============================================================
-- updated_at triggers (consistent with existing tables)
-- ============================================================
CREATE TRIGGER set_snaptrade_users_updated_at
  BEFORE UPDATE ON snaptrade_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_snaptrade_connections_updated_at
  BEFORE UPDATE ON snaptrade_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_snaptrade_accounts_updated_at
  BEFORE UPDATE ON snaptrade_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Rollback (run in reverse if needed):
--   ALTER TABLE assets DROP COLUMN IF EXISTS balance_currency;
--   ALTER TABLE assets DROP COLUMN IF EXISTS snaptrade_account_id;
--   ALTER TABLE assets DROP COLUMN IF EXISTS data_source;
--   DROP TABLE IF EXISTS snaptrade_webhook_events;
--   DROP TABLE IF EXISTS snaptrade_accounts;
--   DROP TABLE IF EXISTS snaptrade_connections;
--   DROP TABLE IF EXISTS snaptrade_users;
-- ============================================================
