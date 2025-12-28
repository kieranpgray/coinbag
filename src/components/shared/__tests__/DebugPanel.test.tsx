import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DebugPanel } from '../DebugPanel';
import { useUser } from '@clerk/clerk-react';
import * as adminCheck from '@/lib/adminCheck';

// Mock Clerk hooks
vi.mock('@clerk/clerk-react', () => ({
  useUser: vi.fn(),
  useAuth: vi.fn(() => ({
    getToken: vi.fn(),
  })),
}));

// Mock admin check
vi.mock('@/lib/adminCheck', () => ({
  isAdmin: vi.fn(),
}));

// Mock migration version
vi.mock('@/lib/migrationVersion', () => ({
  getLatestMigrationVersion: vi.fn(() => '20251228180000'),
  formatMigrationVersion: vi.fn((v) => v === '20251228180000' ? '2025-12-28 18:00:00' : v),
  extractSupabaseProjectId: vi.fn((url) => {
    if (!url) return 'unknown';
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : 'unknown';
  }),
}));

describe('DebugPanel', () => {
  const mockSetOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(import.meta, 'env', {
      value: {
        MODE: 'development',
        VITE_DATA_SOURCE: 'supabase',
        VITE_SUPABASE_URL: 'https://test-project.supabase.co',
      },
      writable: true,
      configurable: true,
    });
  });

  it('does not render for non-admin users', () => {
    vi.mocked(useUser).mockReturnValue({
      user: {
        id: 'user_123',
      } as any,
      isLoaded: true,
    } as any);

    vi.mocked(adminCheck.isAdmin).mockReturnValue(false);

    const { container } = render(
      <DebugPanel open={true} onOpenChange={mockSetOpen} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders for admin users', async () => {
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

    render(<DebugPanel open={true} onOpenChange={mockSetOpen} />);

    await waitFor(() => {
      expect(screen.getByText('Debug Information')).toBeInTheDocument();
    });
  });

  it('displays environment information', async () => {
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

    render(<DebugPanel open={true} onOpenChange={mockSetOpen} />);

    await waitFor(() => {
      expect(screen.getByText('development')).toBeInTheDocument();
      expect(screen.getByText('supabase')).toBeInTheDocument();
      expect(screen.getByText('https://test-project.supabase.co')).toBeInTheDocument();
      expect(screen.getByText('test-project')).toBeInTheDocument();
      expect(screen.getByText('2025-12-28 18:00:00')).toBeInTheDocument();
    });
  });

  it('displays user ID', async () => {
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

    render(<DebugPanel open={true} onOpenChange={mockSetOpen} />);

    await waitFor(() => {
      expect(screen.getByText('user_123')).toBeInTheDocument();
    });
  });

  it('handles missing Supabase URL gracefully', async () => {
    Object.defineProperty(import.meta, 'env', {
      value: {
        MODE: 'development',
        VITE_DATA_SOURCE: 'supabase',
        VITE_SUPABASE_URL: undefined,
      },
      writable: true,
      configurable: true,
    });

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

    render(<DebugPanel open={true} onOpenChange={mockSetOpen} />);

    await waitFor(() => {
      expect(screen.getByText('Not configured')).toBeInTheDocument();
    });
  });
});

