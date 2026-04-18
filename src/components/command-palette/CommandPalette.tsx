import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants/routes';

interface CommandItem {
  id: string;
  label: string;
  path?: string;
  keywords: string[];
  action?: () => void;
}

const commands: CommandItem[] = [
  { id: 'dashboard', label: 'Go to Overview', path: '/app/dashboard', keywords: ['overview', 'dashboard', 'home', 'main'] },
  { id: 'wealth', label: 'Go to Holdings', path: '/app/wealth', keywords: ['holdings', 'wealth', 'assets', 'liabilities', 'investments', 'portfolio', 'debts', 'loans', 'net worth'] },
  { id: 'accounts', label: 'Go to Activity', path: '/app/accounts', keywords: ['activity', 'accounts', 'bank', 'financial'] },
  { id: 'settings', label: 'Go to Settings', path: '/app/settings', keywords: ['settings', 'preferences', 'config'] },
  { id: 'team', label: 'Go to Shared Access', path: '/app/settings?tab=team', keywords: ['shared access', 'team', 'workspace', 'members', 'invite', 'collaboration'] },
  { id: 'transfers', label: 'Go to Allocate', path: ROUTES.app.transfers, keywords: ['allocate', 'transfers', 'cash flow', 'move money', 'pay cycle'] },
  { id: 'budget', label: 'Go to Recurring', path: '/app/budget', keywords: ['recurring', 'budget', 'income', 'expenses', 'subscriptions', 'bills'] },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return commands;
    }

    const query = searchQuery.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(query) ||
        cmd.keywords.some((keyword) => keyword.includes(query))
    );
  }, [searchQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  const handleSelect = (command: CommandItem) => {
    if (command.path) {
      navigate(command.path);
    }
    if (command.action) {
      command.action();
    }
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleSelect(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] gap-0 overflow-hidden rounded-[20px] border border-[var(--paper-3)] p-0 shadow-[0_32px_80px_rgba(0,0,0,0.18)]">
        <div className="flex items-center border-b border-[var(--paper-3)] px-4">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search or jump to..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>
        <DialogDescription className="sr-only">
          Search and navigate to pages or perform actions
        </DialogDescription>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-6 text-center text-body text-muted-foreground">
              {searchQuery.trim()
                ? `No results for "${searchQuery.trim()}"`
                : /* TODO: commands list is never empty today; if it becomes empty, refine empty-state copy */
                  'No results for that search'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  onClick={() => handleSelect(command)}
                  className={cn(
                    'flex w-full items-center rounded-[12px] px-3 py-2 text-body text-left outline-none transition-colors',
                    index === selectedIndex
                      ? 'bg-[var(--accent-light)] text-primary'
                      : 'hover:bg-[var(--accent-light)] hover:text-primary'
                  )}
                >
                  <span className="flex-1">{command.label}</span>
                  {command.path && (
                    <span className="text-caption text-muted-foreground">
                      {command.path}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--paper-3)] px-4 py-2 text-body-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-[4px] border border-[var(--paper-3)] bg-[var(--paper-2)] px-1.5 font-mono text-[11px] font-medium opacity-100">
                <span className="text-[11px]">↑</span>
              </kbd>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-[4px] border border-[var(--paper-3)] bg-[var(--paper-2)] px-1.5 font-mono text-[11px] font-medium opacity-100">
                <span className="text-[11px]">↓</span>
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-[4px] border border-[var(--paper-3)] bg-[var(--paper-2)] px-1.5 font-mono text-[11px] font-medium opacity-100">
                Enter
              </kbd>
              <span>Select</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-[4px] border border-[var(--paper-3)] bg-[var(--paper-2)] px-1.5 font-mono text-[11px] font-medium opacity-100">
              Esc
            </kbd>
            <span>Close</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

