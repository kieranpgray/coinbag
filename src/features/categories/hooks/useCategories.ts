import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createCategoriesRepository } from '@/data/categories/repo';
import { useAuth } from '@clerk/clerk-react';
import type { Category } from '@/types/domain';

export function useCategories() {
  const { getToken } = useAuth();
  const repository = createCategoriesRepository();

  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const result = await repository.list(getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - improves performance by reducing refetches
    gcTime: 1000 * 60 * 10, // 10 minutes - keep cached data longer
  });
}

export function useCategory(id: string) {
  const { getToken } = useAuth();
  const repository = createCategoriesRepository();

  return useQuery<Category | undefined>({
    queryKey: ['categories', id],
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

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createCategoriesRepository();

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const result = await repository.create(data, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      // Note: Dashboard expense breakdown uses categoryId, not category name,
      // so category mutations don't need to invalidate dashboard.
      // Components displaying category names will refetch categories query separately.
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createCategoriesRepository();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string } }) => {
      const result = await repository.update(id, data, getToken);
      if (result.error) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', variables.id] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const repository = createCategoriesRepository();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await repository.remove(id, getToken);
      if (result.error) {
        throw result.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
