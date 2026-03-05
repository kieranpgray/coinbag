// Backward-compatibility aliases for subscriptions (now expenses)
import { useExpenseMutations } from '@/features/expenses/hooks/useExpenseMutations';
export { useExpenseMutations } from '@/features/expenses/hooks/useExpenseMutations';

export function useCreateSubscription() {
  const { create } = useExpenseMutations();
  return create;
}