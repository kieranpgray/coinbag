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

interface CommandItem {
  id: string;
  label: string;
  path?: string;
  keywords: string[];
  action?: () => void;
}

const commands: CommandItem[] = [
  { id: 'dashboard', label: 'Go to Dashboard', path: '/dashboard', keywords: ['dashboard', 'home', 'main'] },
  { id: 'wealth', label: 'Go to Wealth', path: '/wealth', keywords: ['wealth', 'assets', 'liabilities', 'investments', 'portfolio', 'debts', 'loans', 'net worth'] },
  { id: 'accounts', label: 'Go to Accounts', path: '/accounts', keywords: ['accounts', 'bank', 'financial'] },
  { id: 'settings', label: 'Go to Settings', path: '/settings', keywords: ['settings', 'preferences', 'config'] },
  { id: 'transfers', label: 'Go to Transfers', path: '/transfers', keywords: ['transfers', 'cash flow', 'move money', 'pay cycle'] },
  { id: 'budget', label: 'Go to Budget', path: '/budget', keywords: ['budget', 'income', 'expenses', 'subscriptions', 'recurring', 'bills'] },
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
      <DialogContent className="sm:max-w-[600px] p-0">
        <div className="flex items-center border-b px-4">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Type a command or search..."
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
              No commands found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  onClick={() => handleSelect(command)}
                  className={cn(
                    'flex w-full items-center rounded-sm px-2 py-1.5 text-body text-left outline-none transition-colors',
                    index === selectedIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
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
        <div className="flex items-center justify-between border-t px-4 py-2 text-caption text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-caption font-medium opacity-100">
                <span className="text-caption">↑</span>
              </kbd>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-caption font-medium opacity-100">
                <span className="text-caption">↓</span>
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-caption font-medium opacity-100">
                Enter
              </kbd>
              <span>Select</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              Esc
            </kbd>
            <span>Close</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

