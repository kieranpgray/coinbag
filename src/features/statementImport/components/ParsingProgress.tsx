import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ParsingProgressProps {
  progress: number; // 0-100
  status: 'extracting' | 'parsing' | 'validating';
  message?: string;
}

export function ParsingProgress({ progress, status, message }: ParsingProgressProps) {
  const statusMessages = {
    extracting: 'Extracting text from statement...',
    parsing: 'Parsing transactions...',
    validating: 'Validating transactions...',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {message || statusMessages[status]}
              </p>
              <Progress value={progress} className="mt-2" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {Math.round(progress)}% complete
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

