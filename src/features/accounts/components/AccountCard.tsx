import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import type { Account } from '@/types/domain';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onClick?: (account: Account) => void;
}

export function AccountCard({ account, onEdit, onDelete, onClick }: AccountCardProps) {
  const { locale } = useLocale();

  const handleClick = () => {
    onClick?.(account);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">{account.accountName}</CardTitle>
            <p className="text-body text-muted-foreground mt-1 truncate">
              {account.institution || 'No institution'}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(account);
              }}
              aria-label="Edit account"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(account);
              }}
              aria-label="Delete account"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-body text-muted-foreground">Type</span>
            <span className="text-body">{account.accountType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-body text-muted-foreground">Balance</span>
            <span className="font-semibold">{formatCurrency(account.balance, locale)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-body text-muted-foreground">Last Updated</span>
            <span className="text-body">{formatDate(account.lastUpdated, locale)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
