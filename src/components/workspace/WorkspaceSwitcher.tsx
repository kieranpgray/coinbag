import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Building2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

interface WorkspaceSwitcherProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function WorkspaceSwitcher({ className, variant = 'default' }: WorkspaceSwitcherProps) {
  const {
    activeWorkspace,
    memberships,
    setActiveWorkspaceId,
    isLoading,
    error,
  } = useWorkspace();
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border px-3 py-2 animate-pulse bg-muted/50',
          className
        )}
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-body text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-destructive/50 px-3 py-2 bg-destructive/10',
          className
        )}
      >
        <span className="text-caption text-destructive">Workspace error</span>
      </div>
    );
  }

  if (!activeWorkspace || memberships.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'flex items-center gap-2 hover:bg-accent',
            variant === 'compact' && 'px-2 py-1.5 h-auto',
            className
          )}
          aria-label="Switch workspace"
        >
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          {variant === 'compact' ? (
            <span className="text-body font-medium truncate max-w-[120px]">
              {activeWorkspace.name}
            </span>
          ) : (
            <>
              <span className="text-body font-medium truncate max-w-[140px]">
                {activeWorkspace.name}
              </span>
              <Badge variant="secondary" className="text-caption shrink-0">
                {activeWorkspace.role}
              </Badge>
            </>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {memberships.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => {
              setActiveWorkspaceId(ws.id);
              setOpen(false);
            }}
            className={cn(
              'flex items-center justify-between gap-2',
              ws.id === activeWorkspace.id && 'bg-accent'
            )}
          >
            <span className="truncate">{ws.name}</span>
            <Badge variant="outline" className="text-caption shrink-0">
              {ws.role}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
