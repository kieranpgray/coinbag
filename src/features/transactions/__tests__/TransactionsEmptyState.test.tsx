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

  it('shows redirect message while navigating to activity', () => {
    renderTransactions();

    expect(screen.getByText('Redirecting to Activity...')).toBeInTheDocument();
  });
});





