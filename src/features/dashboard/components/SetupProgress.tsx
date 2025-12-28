import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SetupChecklistItem } from '@/types/domain';

interface SetupProgressProps {
  progress: number;
  checklist: SetupChecklistItem[];
  isLoading?: boolean;
}

export function SetupProgress({ progress, checklist, isLoading }: SetupProgressProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="fixed right-0 top-20 z-50 h-[calc(100vh-5rem)]">
        <Card className="h-full w-80 shadow-lg">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Toggle button - always visible when collapsed, hidden when expanded */}
      {isCollapsed && (
        <Button
          variant="outline"
          size="icon"
          className="fixed right-0 top-24 z-[60] h-8 w-8 rounded-l-md rounded-r-none border-r-0 shadow-md bg-background hover:bg-accent"
          onClick={() => setIsCollapsed(false)}
          aria-label="Expand setup progress"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Sidebar overlay */}
      <div
        className={`fixed right-0 top-20 z-50 h-[calc(100vh-5rem)] transition-all duration-300 ease-in-out ${
          isCollapsed ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Toggle button - positioned on the left edge of sidebar when expanded */}
        {!isCollapsed && (
          <Button
            variant="outline"
            size="icon"
            className="absolute -left-10 top-4 h-8 w-8 rounded-l-md rounded-r-none border-r-0 shadow-md bg-background hover:bg-accent"
            onClick={() => setIsCollapsed(true)}
            aria-label="Collapse setup progress"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        <Card className="h-full w-80 shadow-lg flex flex-col border-r-0 rounded-l-xl rounded-r-none bg-card">
          {/* Card content - scrollable */}
          <CardHeader className="flex-shrink-0 border-b">
            <CardTitle>Setup progress</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Complete a few more steps to unlock your full financial picture.
            </p>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">{progress}% Complete</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    readOnly
                    className="mt-0.5 rounded"
                  />
                  <div className="flex-1">
                    <div className={item.completed ? 'line-through text-muted-foreground text-sm' : 'text-sm'}>
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

