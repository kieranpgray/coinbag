import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TransactionsPage } from '../TransactionsPage';

describe('TransactionsPage Empty State', () => {
  const renderTransactions = () => {
    return render(
      <BrowserRouter>
        <TransactionsPage />
      </BrowserRouter>
    );
  };

  it('shows empty state with CTA to accounts', () => {
    renderTransactions();

    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Transactions will appear once you connect accounts/)
    ).toBeInTheDocument();
    expect(screen.getByText('Go to Accounts')).toBeInTheDocument();
  });
});

