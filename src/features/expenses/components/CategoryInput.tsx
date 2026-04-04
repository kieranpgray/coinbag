import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Check, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createCategoriesRepository } from '@/data/categories/repo';
import { useAuth } from '@clerk/clerk-react';
import * as Popover from '@radix-ui/react-popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CategoryForm } from '@/features/categories/components/CategoryForm';
import { useCategories } from '@/features/categories/hooks';

interface CategoryInputProps {
  /**
   * Optional id to support <Label htmlFor="..."> association.
   * This is particularly helpful for accessibility and testing.
   */
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  onCategoriesRefresh?: () => void;
  /**
   * Visual variant of the input. 'compact' uses smaller height and font size.
   */
  variant?: 'default' | 'compact';
}

export function CategoryInput({ id, value, onChange, placeholder = "Select category", error, onCategoriesRefresh, variant = 'default' }: CategoryInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth();

  // Use the useCategories hook for consistent data and caching
  const { data: categories = [], isLoading, error: loadError, refetch: refetchCategories } = useCategories();

  // Filter categories based on search query
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find selected category name
  const selectedCategory = categories.find(cat => cat.id === value);

  const handleCategorySelect = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
    setSearchQuery('');
    buttonRef.current?.focus();
  };

  const handleCreateCategory = async (data: { name: string }) => {
    const repository = createCategoriesRepository();
    try {
      setIsCreating(true);
      setCreateError(null);
      const result = await repository.create(data, getToken);
      
      if (result.error) {
        setCreateError(result.error.error);
        return;
      }

      // Success: reload categories and select the new one
      await refetchCategories();
      if (result.data) {
        // Select the newly created category
        onChange(result.data.id);
      }
      if (onCategoriesRefresh) {
        onCategoriesRefresh();
      }
      // Close the create dialog and ensure dropdown is closed
      setIsCreateDialogOpen(false);
      setIsOpen(false);
      setSearchQuery('');
      // Focus the button to show the selected category
      buttonRef.current?.focus();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setIsOpen(false);
    setSearchQuery('');
    setIsCreateDialogOpen(true);
    setCreateError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setSearchQuery(''); // Clear search to show all categories when opening
      setIsOpen(true);
    }
  };

  // When opening via keyboard (ArrowDown), clear search so all categories show
  const handleOpenChange = (open: boolean) => {
    if (open) setSearchQuery('');
    setIsOpen(open);
  };

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure dropdown is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);


  return (
    <>
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      <Popover.Trigger asChild>
        <Button
        id={id}
        ref={buttonRef}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          // Atlassian Design System styling: clean borders, subtle focus states
          "w-full justify-between rounded-md border border-border bg-background px-3 py-2 text-foreground overflow-hidden",
          variant === 'compact'
            ? "h-8 min-h-0 text-body-sm"
            : "h-10 text-body",
          "hover:border-neutral-mid hover:bg-muted/50",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 focus:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted disabled:hover:border-border",
          error && "border-destructive",
          !selectedCategory && "text-muted-foreground"
        )}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 min-w-0">
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
            <span className={variant === 'compact' ? undefined : "truncate"} title={variant === 'compact' ? "Loading categories..." : undefined}>
              {variant === 'compact' ? "Loading..." : "Loading categories..."}
            </span>
          </div>
        ) : loadError ? (
          <span className={cn(variant === 'compact' ? undefined : "truncate", "text-destructive")} title={variant === 'compact' && loadError instanceof Error ? loadError.message : variant === 'compact' ? "Error loading categories" : undefined}>
            {variant === 'compact' ? "Error" : loadError instanceof Error ? loadError.message : "Error loading categories"}
          </span>
        ) : selectedCategory ? (
          <span className="truncate min-w-0" title={variant === 'compact' ? selectedCategory.name : undefined}>{selectedCategory.name}</span>
        ) : (
          <span className="truncate min-w-0">{placeholder}</span>
        )}
        {!isLoading && <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform flex-shrink-0", isOpen && "rotate-180")} />}
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          role="listbox"
          className="z-10 w-full bg-background border border-border rounded-md shadow-sm max-h-80 overflow-hidden flex flex-col"
          sideOffset={4}
          align="start"
        >
          {loadError ? (
            <div className="px-3 py-2 text-body text-destructive">
              {loadError instanceof Error ? loadError.message : 'Failed to load categories'}
            </div>
          ) : categories.length > 0 ? (
            <>
              {/* Search input */}
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchQuery('');
                        setIsOpen(false);
                        buttonRef.current?.focus();
                      }
                    }}
                  />
                </div>
              </div>
              
              {/* Categories list */}
              <div className="overflow-auto max-h-60">
                {filteredCategories.length > 0 ? (
                  <div className="py-1">
                    {filteredCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        role="option"
                        aria-selected={category.id === value}
                        className={cn(
                          // Atlassian Design System styling: improved hover states, better selected state indication
                          "w-full px-3 py-2 text-left text-body text-foreground rounded-sm flex items-center justify-between",
                          "hover:bg-muted",
                          "focus:bg-primary/10 focus:outline-none",
                          category.id === value && "bg-primary/10"
                        )}
                        onClick={() => handleCategorySelect(category.id)}
                      >
                        <span>{category.name}</span>
                        {category.id === value && <Check className="h-4 w-4 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-6 text-center text-body text-muted-foreground">
                    No categories found for "{searchQuery}"
                  </div>
                )}
              </div>

              {/* Create new category button */}
              <div className="border-t border-border">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-muted text-primary rounded-sm text-body"
                  onClick={handleOpenCreateDialog}
                >
                  + Create new category
                </button>
              </div>
            </>
          ) : (
            <div className="py-1">
              <div className="px-3 py-2 text-body text-muted-foreground">
                Preparing categories...
              </div>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>

      {error && (
        <p className="text-body text-destructive mt-1">{error}</p>
      )}
    </Popover.Root>

    {/* Inline create category dialog */}
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create category</DialogTitle>
          <DialogDescription>
            Create a category to organise expenses (optional). You can also do this while adding an expense.
          </DialogDescription>
        </DialogHeader>

        <CategoryForm
          submitLabel="Create"
          isSubmitting={isCreating}
          onSubmit={handleCreateCategory}
        />

        {createError && (
          <p className="text-body text-destructive mt-2">
            {createError}
          </p>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

