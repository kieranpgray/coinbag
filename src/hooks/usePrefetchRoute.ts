import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { createAssetsRepository } from '@/data/assets/repo';
import { createLiabilitiesRepository } from '@/data/liabilities/repo';
import { createExpensesRepository } from '@/data/expenses/repo';
import { createIncomeRepository } from '@/data/income/repo';
import { createAccountsRepository } from '@/data/accounts/repo';
import { createCategoriesRepository } from '@/data/categories/repo';

/**
 * Hook to prefetch route data on navigation link hover
 * This dramatically improves perceived page load time by loading data before user clicks
 */
export function usePrefetchRoute() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const prefetchAssets = () => {
    if (!getToken) return;
    // Skip if data is already cached and fresh
    const cached = queryClient.getQueryData(['assets']);
    if (cached) return;
    
    const repository = createAssetsRepository();
    queryClient.prefetchQuery({
      queryKey: ['assets'],
      queryFn: async () => {
        const result = await repository.list(getToken);
        if (result.error) throw result.error;
        return result.data;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  const prefetchLiabilities = () => {
    if (!getToken) return;
    // Skip if data is already cached and fresh
    const cached = queryClient.getQueryData(['liabilities']);
    if (cached) return;
    
    const repository = createLiabilitiesRepository();
    queryClient.prefetchQuery({
      queryKey: ['liabilities'],
      queryFn: async () => {
        const result = await repository.list(getToken);
        if (result.error) throw result.error;
        return result.data;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  const prefetchExpenses = () => {
    if (!getToken) return;
    // Skip if data is already cached and fresh
    const cachedExpenses = queryClient.getQueryData(['expenses']);
    const cachedCats = queryClient.getQueryData(['categories']);
    
    if (!cachedExpenses) {
      const repository = createExpensesRepository();
      queryClient.prefetchQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
          const result = await repository.list(getToken);
          if (result.error) throw result.error;
          return result.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    }
    
    // Also prefetch categories since expenses page uses them
    if (!cachedCats) {
      const categoriesRepo = createCategoriesRepository();
      queryClient.prefetchQuery({
        queryKey: ['categories'],
        queryFn: async () => {
          const result = await categoriesRepo.list(getToken);
          if (result.error) throw result.error;
          return result.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    }
  };

  const prefetchIncome = () => {
    if (!getToken) return;
    // Skip if data is already cached and fresh
    const cached = queryClient.getQueryData(['incomes']);
    if (cached) return;
    
    const repository = createIncomeRepository();
    queryClient.prefetchQuery({
      queryKey: ['incomes'],
      queryFn: async () => {
        const result = await repository.list(getToken);
        if (result.error) throw result.error;
        return result.data;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  const prefetchBudget = () => {
    if (!getToken) return;
    // Prefetch both income and expenses for budget page
    const cachedIncomes = queryClient.getQueryData(['incomes']);
    const cachedExpenses = queryClient.getQueryData(['expenses']);
    const cachedCats = queryClient.getQueryData(['categories']);
    
    if (!cachedIncomes) {
      const incomeRepo = createIncomeRepository();
      queryClient.prefetchQuery({
        queryKey: ['incomes'],
        queryFn: async () => {
          const result = await incomeRepo.list(getToken);
          if (result.error) throw result.error;
          return result.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    }
    
    if (!cachedExpenses) {
      const expensesRepo = createExpensesRepository();
      queryClient.prefetchQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
          const result = await expensesRepo.list(getToken);
          if (result.error) throw result.error;
          return result.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    }
    
    // Also prefetch categories since budget page uses them
    if (!cachedCats) {
      const categoriesRepo = createCategoriesRepository();
      queryClient.prefetchQuery({
        queryKey: ['categories'],
        queryFn: async () => {
          const result = await categoriesRepo.list(getToken);
          if (result.error) throw result.error;
          return result.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    }
  };

  const prefetchAccounts = () => {
    if (!getToken) return;
    // Skip if data is already cached and fresh
    const cached = queryClient.getQueryData(['accounts']);
    if (cached) return;
    
    const repository = createAccountsRepository();
    queryClient.prefetchQuery({
      queryKey: ['accounts'],
      queryFn: async () => {
        const result = await repository.list(getToken);
        if (result.error) throw result.error;
        return result.data;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  const prefetchWealth = () => {
    if (!getToken) return;
    // Prefetch both assets and liabilities for wealth page
    prefetchAssets();
    prefetchLiabilities();
  };

  return {
    prefetchAssets,
    prefetchLiabilities,
    prefetchExpenses,
    prefetchIncome,
    prefetchBudget,
    prefetchAccounts,
    prefetchWealth,
    // Backward compatibility
    prefetchSubscriptions: prefetchExpenses,
  };
}

