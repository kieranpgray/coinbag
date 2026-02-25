-- Migration: Add address, property_type (Real Estate), grant_price (RSU) to assets
-- Description: Phase 1 free-text address (max 200), property type (max 100), RSU grant price.
-- Prerequisites: assets table exists.
-- Plan: specs/asset-fields-update

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'address') THEN
    ALTER TABLE assets ADD COLUMN address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'property_type') THEN
    ALTER TABLE assets ADD COLUMN property_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'grant_price') THEN
    ALTER TABLE assets ADD COLUMN grant_price numeric(12,4);
  END IF;
END $$;

COMMENT ON COLUMN assets.address IS 'Property address (free text, max 200 chars); used when type is Real Estate';
COMMENT ON COLUMN assets.property_type IS 'Property type (optional free text, max 100 chars)';
COMMENT ON COLUMN assets.grant_price IS 'RSU price at grant; used for unrealised P/L when type is RSU';
