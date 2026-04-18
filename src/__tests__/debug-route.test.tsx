import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DebugPage } from '@/pages/debug/DebugPage';
import { useUser } from '@clerk/clerk-react';
import * as adminCheck from '@/lib/adminCheck';

// Mock Clerk hooks (avoid real ClerkProvider — publishable key validation breaks tests)
vi.mock('@clerk/clerk-react', async () => {
  const actual = await vi.importActual('@clerk/clerk-react');
  return {
    ...actual,
    ClerkProvider: ({ children }: { children: ReactNode }) => children,
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
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





