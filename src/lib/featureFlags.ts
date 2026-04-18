/**
 * Feature Flags System
 *
 * Simple feature flag system for enabling/disabling features.
 * Can be extended to support user-specific flags, A/B testing, etc.
 */

import { getWorkspaceCollaborationRolloutStage } from './workspaceCollaborationConfig';

function isWorkspaceCollaborationEnabled(): boolean {
  const stage = getWorkspaceCollaborationRolloutStage();
  return stage === 'full' || stage === 'percentage' || stage === 'internal';
}

export type FeatureFlag =
  | 'statement_import'
  | 'statement_import_ocr'
  | 'statement_import_llm'
  | 'statement_import_reupload'
  | 'transaction_deduplication'
  | 'import_history_view'
  | 'workspace_collaboration'
  | 'account_menu_v2'
  | 'explicit_repayment_transfers'
  | 'snaptrade_integration'
  | 'holdings_account_activity_migration';

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
  workspace_collaboration: {
    enabled: isWorkspaceCollaborationEnabled(),
    description: 'Enable multi-user workspace collaboration (invites, team, switcher)',
  },
  account_menu_v2: {
    enabled: import.meta.env.VITE_ENABLE_ACCOUNT_MENU_V2 === 'true',
    description: 'Enable account menu, profile photo upload, and team avatars',
  },
  explicit_repayment_transfers: {
    enabled: import.meta.env.VITE_ENABLE_EXPLICIT_REPAYMENT_TRANSFERS === 'true',
    description: 'Enable explicit repayment rows in transfer suggestions',
  },
  snaptrade_integration: {
    enabled: import.meta.env.VITE_ENABLE_SNAPTRADE === 'true',
    description: 'Enable SnapTrade brokerage connection flow on the Wealth page',
  },
  holdings_account_activity_migration: {
    enabled: import.meta.env.VITE_ENABLE_HOLDINGS_ACCOUNT_ACTIVITY_MIGRATION !== 'false',
    description: 'Show account-backed holdings in Wealth and keep activity contextual to account detail',
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

