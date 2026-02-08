import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { TransactionList } from '../components/TransactionList';
import type { TransactionEntity } from '@/contracts/transactions';
import { createTransactionsRepository } from '@/data/transactions/repo';

// Mock the transactions repository
vi.mock('@/data/transactions/repo', () => ({
  createTransactionsRepository: vi.fn(),
}));

// Mock Clerk
const _mockClerkProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider
      publishableKey="pk_test_mock"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      {children}
    </ClerkProvider>
  );
};

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <ClerkProvider
      publishableKey="pk_test_mock"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

describe('Transaction Provenance Tests', () => {
  const accountId = 'account-123';
  const statementImportId = 'statement-import-123';
  const mockGetToken = vi.fn(() => Promise.resolve('mock-token'));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provenance Filtering', () => {
    it('should filter out transactions without statement_import_id when statementImportId is provided', async () => {
      const mockTransactions: TransactionEntity[] = [
        {
          id: 'tx-1',
          userId: 'user-123',
          accountId,
          date: '2024-01-01',
          description: 'Transaction with statement_import_id',
          amount: 100.0,
          type: 'income',
          category: 'Test',
          transactionReference: 'ref-1',
          statementImportId,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'tx-2',
          userId: 'user-123',
          accountId,
          date: '2024-01-02',
          description: 'Transaction without statement_import_id',
          amount: 50.0,
          type: 'expense',
          category: 'Test',
          transactionReference: 'ref-2',
          statementImportId: null, // No provenance
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      const mockRepository = {
        list: vi.fn((accountIdParam, getToken, statementImportIdParam) => {
          // Repository should filter by statementImportId
          const filtered = mockTransactions.filter(
            tx => tx.statementImportId === statementImportIdParam
          );
          return Promise.resolve({ data: filtered });
        }),
      };

      vi.mocked(createTransactionsRepository).mockResolvedValue(mockRepository as any);

      render(
        <TransactionList
          accountId={accountId}
          statementImportId={statementImportId}
        />,
        { wrapper }
      );

      // Wait for query to resolve
      await screen.findByText('Transaction with statement_import_id');

      // Verify repository was called with statementImportId
      expect(mockRepository.list).toHaveBeenCalledWith(accountId, mockGetToken, statementImportId);

      // Verify transaction with statement_import_id is shown
      expect(screen.getByText('Transaction with statement_import_id')).toBeInTheDocument();

      // Verify transaction without statement_import_id is NOT shown
      expect(screen.queryByText('Transaction without statement_import_id')).not.toBeInTheDocument();
    });

    it('should show empty state when no transactions with statement_import_id are found', async () => {
      const mockRepository = {
        list: vi.fn(() => Promise.resolve({ data: [] })),
      };

      vi.mocked(createTransactionsRepository).mockResolvedValue(mockRepository as any);

      render(
        <TransactionList
          accountId={accountId}
          statementImportId={statementImportId}
        />,
        { wrapper }
      );

      // Wait for empty state
      await screen.findByText(/No transactions yet/i);

      // Verify empty state is shown (not mock data)
      expect(screen.getByText(/No transactions yet/i)).toBeInTheDocument();
      expect(screen.queryByText(/CINEMA TICKETS/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/UBER EATS/i)).not.toBeInTheDocument();
    });
  });

  describe('Sign Mapping', () => {
    it('should render income transactions with positive sign (+)', async () => {
      const mockTransactions: TransactionEntity[] = [
        {
          id: 'tx-income',
          userId: 'user-123',
          accountId,
          date: '2024-01-01',
          description: 'Salary Payment',
          amount: 5000.0, // Positive amount
          type: 'income',
          category: 'Salary',
          transactionReference: 'ref-income',
          statementImportId,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const mockRepository = {
        list: vi.fn(() => Promise.resolve({ data: mockTransactions })),
      };

      vi.mocked(createTransactionsRepository).mockResolvedValue(mockRepository as any);

      render(
        <TransactionList
          accountId={accountId}
          statementImportId={statementImportId}
        />,
        { wrapper }
      );

      // Wait for transaction to render
      await screen.findByText('Salary Payment');

      // Verify positive sign (+) is shown for income
      const amountElement = screen.getByText(/\+.*5,000/i);
      expect(amountElement).toBeInTheDocument();
    });

    it('should render expense transactions with negative sign (-)', async () => {
      const mockTransactions: TransactionEntity[] = [
        {
          id: 'tx-expense',
          userId: 'user-123',
          accountId,
          date: '2024-01-01',
          description: 'BUNNINGS 302000 BALCATTA',
          amount: 868.36, // Positive amount (sign determined by type)
          type: 'expense',
          category: 'Shopping',
          transactionReference: 'ref-expense',
          statementImportId,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const mockRepository = {
        list: vi.fn(() => Promise.resolve({ data: mockTransactions })),
      };

      vi.mocked(createTransactionsRepository).mockResolvedValue(mockRepository as any);

      render(
        <TransactionList
          accountId={accountId}
          statementImportId={statementImportId}
        />,
        { wrapper }
      );

      // Wait for transaction to render
      await screen.findByText('BUNNINGS 302000 BALCATTA');

      // Verify negative sign (-) is shown for expense
      const amountElement = screen.getByText(/-.*868/i);
      expect(amountElement).toBeInTheDocument();
    });
  });

  describe('No Mock Data in Production', () => {
    it('should not show mock transactions when repository returns empty', async () => {
      const mockRepository = {
        list: vi.fn(() => Promise.resolve({ data: [] })),
      };

      vi.mocked(createTransactionsRepository).mockResolvedValue(mockRepository as any);

      render(
        <TransactionList
          accountId={accountId}
          statementImportId={statementImportId}
        />,
        { wrapper }
      );

      // Wait for empty state
      await screen.findByText(/No transactions yet/i);

      // CRITICAL: Verify mock transactions are NOT shown
      const mockMerchants = ['CINEMA TICKETS', 'UBER EATS', 'WOOLWORTHS', 'AMAZON AUSTRALIA SERVICES'];
      mockMerchants.forEach(merchant => {
        expect(screen.queryByText(new RegExp(merchant, 'i'))).not.toBeInTheDocument();
      });

      // Verify empty state is shown instead
      expect(screen.getByText(/No transactions yet/i)).toBeInTheDocument();
    });

    it('should only show transactions that match the provided statementImportId', async () => {
      const otherStatementImportId = 'other-statement-import-456';
      
      const mockTransactions: TransactionEntity[] = [
        {
          id: 'tx-1',
          userId: 'user-123',
          accountId,
          date: '2024-01-01',
          description: 'Transaction from current statement',
          amount: 100.0,
          type: 'income',
          category: 'Test',
          transactionReference: 'ref-1',
          statementImportId, // Matches
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'tx-2',
          userId: 'user-123',
          accountId,
          date: '2024-01-02',
          description: 'Transaction from other statement',
          amount: 50.0,
          type: 'expense',
          category: 'Test',
          transactionReference: 'ref-2',
          statementImportId: otherStatementImportId, // Different statement
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      const mockRepository = {
        list: vi.fn((accountIdParam, getToken, statementImportIdParam) => {
          // Repository should filter by statementImportId
          const filtered = mockTransactions.filter(
            tx => tx.statementImportId === statementImportIdParam
          );
          return Promise.resolve({ data: filtered });
        }),
      };

      vi.mocked(createTransactionsRepository).mockResolvedValue(mockRepository as any);

      render(
        <TransactionList
          accountId={accountId}
          statementImportId={statementImportId}
        />,
        { wrapper }
      );

      // Wait for transaction to render
      await screen.findByText('Transaction from current statement');

      // Verify only transaction from current statement is shown
      expect(screen.getByText('Transaction from current statement')).toBeInTheDocument();
      expect(screen.queryByText('Transaction from other statement')).not.toBeInTheDocument();
    });
  });
});




