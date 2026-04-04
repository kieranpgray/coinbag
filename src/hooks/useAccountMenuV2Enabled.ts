import { isFeatureEnabled } from '@/lib/featureFlags';

export function useAccountMenuV2Enabled(): boolean {
  return isFeatureEnabled('account_menu_v2');
}
