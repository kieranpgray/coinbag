/**
 * Hook to fetch the user's SnapTrade connection states (disabled/active).
 * Used to show inline "Reconnect" prompt on broken connection assets.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { supabase } from '@/lib/supabaseClient';

interface SnaptradeConnectionState {
  id: string;
  brokerage_auth_id: string;
  brokerage_name: string;
  is_disabled: boolean;
}

export function useSnaptradeConnections() {
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['snaptrade-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('snaptrade_connections')
        .select('id, brokerage_auth_id, brokerage_name, is_disabled');

      if (error) throw new Error(error.message);
      return (data ?? []) as SnaptradeConnectionState[];
    },
    enabled: !!isSignedIn,
    staleTime: 60_000,
  });
}
