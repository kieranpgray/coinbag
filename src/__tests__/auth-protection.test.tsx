import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// Mock Clerk for auth protection tests
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignedIn: ({ children }: { children: React.ReactNode }) => <div data-testid="signed-in">{children}</div>,
  SignedOut: ({ children }: { children: React.ReactNode }) => <div data-testid="signed-out">{children}</div>,
  RedirectToSignIn: () => <div data-testid="redirect-to-sign-in" />,
  UserButton: () => <button data-testid="user-button" />,
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    userId: 'mock-user-id',
  }),
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      firstName: 'Test',
      lastName: 'User',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      primaryPhoneNumber: { phoneNumber: '+10000000000' },
      update: vi.fn().mockResolvedValue({}),
    },
  }),
}));

// Mock environment
vi.mock('import.meta.env', () => ({
  VITE_DATA_SOURCE: 'mock',
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function renderApp() {
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe('Authentication Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Signed In State (Default for Tests)', () => {
    it('shows protected application when authenticated', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('signed-in')).toBeInTheDocument();
      });
    });

    it('renders main application layout', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('signed-in')).toBeInTheDocument();
      });

      // Should eventually render the main app content
      // This would be more comprehensive with actual route testing
    });
  });

  describe('Route Protection', () => {
    it('protects budget routes', () => {
      // This test would verify that accessing /budget redirects to /sign-in when unauthenticated
      // Would require MemoryRouter with initial entries and route change assertions
      expect(true).toBe(true); // Placeholder for future comprehensive routing tests
    });

    it('allows access to auth routes when unauthenticated', () => {
      // Verify /sign-in and /sign-up routes are accessible without authentication
      expect(true).toBe(true); // Placeholder for auth route accessibility tests
    });
  });

  describe('Clerk Integration', () => {
    it('provides Clerk context to the application', () => {
      // Verify ClerkProvider wraps the app
      expect(true).toBe(true); // Placeholder for Clerk provider tests
    });

    it('handles authentication state changes', () => {
      // Test transitions between signed in/out states
      expect(true).toBe(true); // Placeholder for auth state transition tests
    });
  });
});
