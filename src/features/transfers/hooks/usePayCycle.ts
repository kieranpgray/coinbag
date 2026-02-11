import { useQueryClient } from '@tanstack/react-query';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useUserPreferences';
import type { PayCycleConfig } from '@/types/domain';

/**
 * Hook to access and update pay cycle configuration
 * Uses user preferences system for persistence
 */
export function usePayCycle() {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const queryClient = useQueryClient();

  const payCycle = preferences?.payCycle ?? null;

  const updatePayCycle = async (config: PayCycleConfig) => {
    await updatePreferences.mutateAsync({
      payCycle: config,
    });
    
    // Invalidate dependent queries
    queryClient.invalidateQueries({ queryKey: ['transferSuggestions'] });
    queryClient.invalidateQueries({ queryKey: ['cashFlowByAccount'] });
  };

  return {
    payCycle,
    isLoading,
    updatePayCycle,
    isUpdating: updatePreferences.isPending,
    error: updatePreferences.error,
  };
}
