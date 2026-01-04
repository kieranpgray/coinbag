/**
 * Feature Flags System
 * 
 * Simple feature flag system for enabling/disabling features.
 * Can be extended to support user-specific flags, A/B testing, etc.
 */

export type FeatureFlag = 
  | 'statement_import'
  | 'statement_import_ocr'
  | 'statement_import_llm'
  | 'statement_import_reupload'
  | 'transaction_deduplication'
  | 'import_history_view';

interface FeatureFlagConfig {
  enabled: boolean;
  description?: string;
}

// Feature flag configuration
// In production, this could be loaded from environment variables or a config service
const FEATURE_FLAGS: Record<FeatureFlag, FeatureFlagConfig> = {
  statement_import: {
    enabled: true,
    description: 'Enable statement-based transaction import feature',
  },
  statement_import_ocr: {
    enabled: import.meta.env.VITE_ENABLE_OCR === 'true',
    description: 'Enable OCR-based parsing for statement imports',
  },
  statement_import_llm: {
    enabled: import.meta.env.VITE_ENABLE_LLM === 'true',
    description: 'Enable LLM-based parsing for statement imports',
  },
  statement_import_reupload: {
    enabled: true,
    description: 'Enable re-uploading statements for the same account',
  },
  transaction_deduplication: {
    enabled: true,
    description: 'Enable transaction deduplication based on reference and date',
  },
  import_history_view: {
    enabled: true,
    description: 'Enable import history view for users',
  },
};

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag]?.enabled ?? false;
}

/**
 * Get all feature flags (useful for admin/debug views)
 */
export function getAllFeatureFlags(): Record<FeatureFlag, FeatureFlagConfig> {
  return FEATURE_FLAGS;
}

/**
 * Get feature flag description
 */
export function getFeatureFlagDescription(flag: FeatureFlag): string | undefined {
  return FEATURE_FLAGS[flag]?.description;
}

