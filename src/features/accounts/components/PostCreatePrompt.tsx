import { FileText, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Account } from '@/types/domain';

interface PostCreatePromptProps {
  account: Account;
  onImportStatement: () => void;
  onDismiss: () => void;
}

export function PostCreatePrompt({
  account,
  onImportStatement,
  onDismiss,
}: PostCreatePromptProps) {
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Import Statement</CardTitle>
              <CardDescription className="mt-1">
                Import transactions from a statement for {account.accountName}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Upload a PDF or image of your bank statement to automatically import transactions.
        </p>
        <Button onClick={onImportStatement} className="w-full sm:w-auto">
          <FileText className="h-4 w-4 mr-2" />
          Import Statement
        </Button>
      </CardContent>
    </Card>
  );
}

