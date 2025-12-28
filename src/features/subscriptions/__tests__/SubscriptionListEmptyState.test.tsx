import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubscriptionList } from '../components/SubscriptionList';

describe('SubscriptionList Empty States', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderList = () => {
    return render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <SubscriptionList
            subscriptions={[]}
            grouped={false}
          />
        </QueryClientProvider>
      </BrowserRouter>
    );
  };

  it('shows empty state encouraging subscription creation', () => {
    renderList();

    expect(screen.getByText('No subscriptions yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Add your first recurring expense now/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You can leave the category as Uncategorised/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Click "Add Subscription" above to get started/)
    ).toBeInTheDocument();
  });
});

