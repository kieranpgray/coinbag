import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyWrapper } from '../PrivacyWrapper';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the user API
vi.mock('@/lib/api', () => ({
  userApi: {
    getCurrentUser: vi.fn().mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      privacyMode: false,
      darkMode: false,
      taxRate: 20,
      emailNotifications: {},
      mfaEnabled: false,
    }),
    updateUser: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('PrivacyWrapper', () => {
  it('displays value when privacy mode is off', async () => {
    render(
      <TestWrapper>
        <PrivacyWrapper value={1000000}>$1,000,000</PrivacyWrapper>
      </TestWrapper>
    );
    // Wait for theme context to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Should show the actual value when privacy mode is off
    expect(screen.getByText('$1,000,000')).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <PrivacyWrapper value={1000000} />
      </TestWrapper>
    );
    // Component should render
    expect(screen.getByText(/./)).toBeInTheDocument();
  });
});

