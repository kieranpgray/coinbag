import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';

/**
 * Stops automatic SnapTrade sync for an asset while keeping the current balance on the record.
 */
export function useDisconnectBrokerageSync() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const supabase = await createAuthenticatedSupabaseClient(getToken);
      const { error } = await supabase
        .from('assets')
        .update({ data_source: 'manual', snaptrade_account_id: null })
        .eq('id', assetId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['snaptrade-connections'] });
    },
  });
}
