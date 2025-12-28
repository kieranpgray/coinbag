import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createAssetsRepository } from '@/data/assets/repo';
import { useAuth } from '@clerk/clerk-react';
import type { Asset } from '@/types/domain';
import { logger, getCorrelationId } from '@/lib/logger';
import {
  addAssetOptimistically,
  updateAssetOptimistically,
  removeAssetOptimistically,
} from '@/features/dashboard/utils/optimisticUpdates';

export function useAssets() {
  const { getToken, userId } = useAuth();
  const repository = createAssetsRepository();

  return useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: async () => {
      logger.debug('QUERY:ASSETS_LIST', 'Fetching assets list', { userId }, getCorrelationId() || undefined);
      const result = await repository.list(getToken);
      if (result.error) {
        logger.error('QUERY:ASSETS_LIST', 'Failed to fetch assets', { error: result.error }, getCorrelationId() || undefined);
        throw result.error;
      }
      logger.debug('QUERY:ASSETS_LIST', 'Assets list fetched', { count: result.data?.length || 0 }, getCorrelationId() || undefined);
      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - improves performance by reducing refetches
    gcTime: 1000 * 60 * 10, // 10 minutes - keep cached data longer
  });
}

export function useAsset(id: string) {
  const { getToken } = useAuth();
  const repository = createAssetsRepository();

  return useQuery<Asset | undefined>({
    queryKey: ['assets', id],
    queryFn: async () => {
      const result = await repository.get(id, getToken);
      if (result.error) {
        if (result.error.code === 'NOT_FOUND') {
          return undefined;
        }
        throw result.error;
      }
      return result.data;
    },
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  const { getToken, userId } = useAuth();
  const repository = createAssetsRepository();
  const correlationId = getCorrelationId();

  return useMutation({
    mutationFn: async (data: Omit<Asset, 'id'>) => {
      // Get current assets count before mutation
      const currentData = queryClient.getQueryData<Asset[]>(['assets']);
      const beforeCount = currentData?.length || 0;
      
      logger.info(
        'MUTATION:ASSET_CREATE',
        'Creating asset',
        {
          assetType: data.type,
          assetName: data.name,
          assetValue: data.value,
          assetsBeforeCount: beforeCount,
          userId,
        },
        correlationId || undefined
      );

      const result = await repository.create(data, getToken);
      
      if (result.error) {
        logger.error(
          'MUTATION:ASSET_CREATE',
          'Failed to create asset',
          { error: result.error, assetType: data.type },
          correlationId || undefined
        );
        throw result.error;
      }

      logger.info(
        'MUTATION:ASSET_CREATE',
        'Asset created successfully',
        {
          assetId: result.data?.id,
          assetType: result.data?.type,
          assetName: result.data?.name,
        },
        correlationId || undefined
      );

      return result.data!;
    },
    onSuccess: (newAsset) => {
      // Optimistically update dashboard cache instead of invalidating
      // This dramatically improves response time (100-200ms vs 1000-1500ms)
      addAssetOptimistically(queryClient, newAsset);
      
      // Still invalidate assets list to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      
      logger.info(
        'MUTATION:ASSET_CREATE',
        'Asset created with optimistic dashboard update',
        {
          assetId: newAsset.id,
          assetType: newAsset.type,
        },
        correlationId || undefined
      );
    },
    onError: () => {
      // If mutation fails, invalidate dashboard to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createAssetsRepository();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Asset, 'id'>> }) => {
      const result = await repository.update(id, data, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: (updatedAsset) => {
      // Optimistically update dashboard cache instead of invalidating
      updateAssetOptimistically(queryClient, updatedAsset);
      
      // Still invalidate assets queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', updatedAsset.id] });
    },
    onError: () => {
      // If mutation fails, invalidate dashboard to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  const { getToken, userId } = useAuth();
  const repository = createAssetsRepository();
  const correlationId = getCorrelationId();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get asset before deletion for logging
      const currentData = queryClient.getQueryData<Asset[]>(['assets']);
      const assetToDelete = currentData?.find(a => a.id === id);
      const beforeCount = currentData?.length || 0;

      logger.warn(
        'MUTATION:ASSET_DELETE',
        'Deleting asset',
        {
          assetId: id,
          assetName: assetToDelete?.name,
          assetType: assetToDelete?.type,
          assetsBeforeCount: beforeCount,
          userId,
        },
        correlationId || undefined
      );

      const result = await repository.remove(id, getToken);
      
      if (result.error) {
        logger.error(
          'MUTATION:ASSET_DELETE',
          'Failed to delete asset',
          { error: result.error, assetId: id },
          correlationId || undefined
        );
        throw result.error;
      }

      logger.warn(
        'MUTATION:ASSET_DELETE',
        'Asset deleted successfully',
        {
          assetId: id,
          assetsBeforeCount: beforeCount,
          expectedAfterCount: beforeCount - 1,
        },
        correlationId || undefined
      );
    },
    onSuccess: (_, deletedId) => {
      // Optimistically update dashboard cache instead of invalidating
      removeAssetOptimistically(queryClient, deletedId);
      
      // Still invalidate assets list to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      
      logger.info(
        'MUTATION:ASSET_DELETE',
        'Asset deleted with optimistic dashboard update',
        {
          assetId: deletedId,
        },
        correlationId || undefined
      );
    },
    onError: () => {
      // If mutation fails, invalidate dashboard to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

