/**
 * Hooks for symbol prices and manual refresh
 * Uses Clerk user for availability and mutation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import {
  getManualRefreshAvailability,
  triggerManualRefresh,
  getSymbolPrice,
  getSymbolPrices,
  getPriceFreshnessStatus,
} from '@/lib/services/price-service';
import type {
  AssetClass,
  ManualRefreshAvailability,
  PriceFetchRequest,
  PriceFreshnessStatus,
  SymbolPrice,
} from '@/types/prices';

export function useManualRefreshAvailability() {
  const { getToken, userId } = useAuth();

  return useQuery<ManualRefreshAvailability>({
    queryKey: ['manual-refresh-availability'],
    queryFn: async () => {
      if (!userId || !getToken) return { canRefresh: false, remainingRefreshes: 0, nextAvailableAt: null, cooldownEndsAt: null };
      return getManualRefreshAvailability(getToken, userId);
    },
    enabled: !!userId,
    refetchInterval: 60 * 1000, // 1 min
  });
}

export function useManualPriceRefresh() {
  const queryClient = useQueryClient();
  const { getToken, userId } = useAuth();

  return useMutation({
    mutationFn: async (requests: PriceFetchRequest[]) => {
      if (!getToken || !userId) throw new Error('Authentication required');
      return triggerManualRefresh(getToken, requests);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-refresh-availability'] });
      queryClient.invalidateQueries({ queryKey: ['symbol-price'] });
      queryClient.invalidateQueries({ queryKey: ['symbol-prices'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSymbolPrice(symbol: string | undefined, assetClass: AssetClass) {
  const { getToken } = useAuth();

  return useQuery<SymbolPrice | null>({
    queryKey: ['symbol-price', symbol, assetClass],
    queryFn: async () => {
      if (!symbol || !getToken) return null;
      return getSymbolPrice(getToken, symbol, assetClass);
    },
    enabled: !!symbol && !!getToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSymbolPrices(requests: PriceFetchRequest[]) {
  const { getToken } = useAuth();

  return useQuery<SymbolPrice[]>({
    queryKey: ['symbol-prices', JSON.stringify(requests)],
    queryFn: async () => {
      if (!getToken || requests.length === 0) return [];
      return getSymbolPrices(getToken, requests);
    },
    enabled: !!getToken && requests.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePriceFreshness(
  fetchedAt: string | null | undefined,
  assetClass: AssetClass
): PriceFreshnessStatus {
  return getPriceFreshnessStatus(fetchedAt, assetClass);
}
