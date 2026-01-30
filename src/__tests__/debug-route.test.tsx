import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DebugPage } from '@/pages/debug/DebugPage';
import { useUser } from '@clerk/clerk-react';
import * as adminCheck from '@/lib/adminCheck';

// Mock Clerk hooks
vi.mock('@clerk/clerk-react', async () => {
  const actual = await vi.importActual('@clerk/clerk-react');
  return {
    ...actual,
    useUser: vi.fn(),
    useAuth: vi.fn(() => ({
      getToken: vi.fn(),
    })),
  };
});

// Mock admin check
vi.mock('@/lib/adminCheck', () => ({
  isAdmin: vi.fn(),
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <ClerkProvider publishableKey="pk_test_mock">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

describe('Debug Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('redirects non-admin users', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: {
        id: 'user_123',
      } as any,
      isLoaded: true,
    } as any);

    vi.mocked(adminCheck.isAdmin).mockReturnValue(false);

    render(
      <TestWrapper>
        <DebugPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('redirects unauthenticated users', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: null,
      isLoaded: true,
    } as any);

    vi.mocked(adminCheck.isAdmin).mockReturnValue(false);

    render(
      <TestWrapper>
        <DebugPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('renders debug panel for admin users', async () => {
    vi.mocked(useUser).mockReturnValue({
      user: {
        id: 'user_123',
        primaryEmailAddress: {
          emailAddress: 'admin@example.com',
        },
      } as any,
      isLoaded: true,
    } as any);

    vi.mocked(adminCheck.isAdmin).mockReturnValue(true);

    render(
      <TestWrapper>
        <DebugPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Debug Information')).toBeInTheDocument();
    });
  });
});





