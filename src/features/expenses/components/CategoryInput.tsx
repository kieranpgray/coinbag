import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Check, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createCategoriesRepository } from '@/data/categories/repo';
import { useAuth } from '@clerk/clerk-react';
import type { Category } from '@/types/domain';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CategoryForm } from '@/features/categories/components/CategoryForm';

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
}

export function CategoryInput({ id, value, onChange, placeholder = "Select category", error, onCategoriesRefresh }: CategoryInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth();

  // Load categories on mount and when requested
  const loadCategories = async () => {
    const repository = createCategoriesRepository();
    try {
      setIsLoading(true);
      setLoadError(null);
      const result = await repository.list(getToken);
      if (result.error) {
        setLoadError(result.error.error);
      } else {
        setCategories(result.data);
      }
    } catch (error) {
      setLoadError('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      await loadCategories();
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

  const handleToggleOpen = () => {
    if (!isOpen) {
      // Clear search query when opening to ensure all categories are shown
      setSearchQuery('');
    }
    setIsOpen(!isOpen);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
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
          "w-full justify-between h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900",
          "hover:border-gray-400 hover:bg-gray-50",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 focus:border-blue-500",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 disabled:hover:border-gray-300",
          error && "border-red-500",
          !selectedCategory && "text-gray-400"
        )}
        onClick={handleToggleOpen}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading categories...
          </div>
        ) : loadError ? (
          <span className="text-destructive">Error loading categories</span>
        ) : selectedCategory ? (
          selectedCategory.name
        ) : (
          placeholder
        )}
        {!isLoading && <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform", isOpen && "rotate-180")} />}
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-sm max-h-80 overflow-hidden flex flex-col"
        >
          {loadError ? (
            <div className="px-3 py-2 text-sm text-destructive">
              {loadError}
            </div>
          ) : categories.length > 0 ? (
            <>
              {/* Search input */}
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                          "w-full px-3 py-2 text-left text-sm text-gray-900 rounded-sm flex items-center justify-between",
                          "hover:bg-gray-100",
                          "focus:bg-blue-50 focus:outline-none",
                          category.id === value && "bg-blue-50"
                        )}
                        onClick={() => handleCategorySelect(category.id)}
                      >
                        <span>{category.name}</span>
                        {category.id === value && <Check className="h-4 w-4 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No categories found for "{searchQuery}"
                  </div>
                )}
              </div>

              {/* Create new category button */}
              <div className="border-t border-gray-200">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 text-blue-600 rounded-sm text-sm"
                  onClick={handleOpenCreateDialog}
                >
                  + Create new category
                </button>
              </div>
            </>
          ) : (
            <div className="py-1">
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Preparing categories...
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}

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
            <p className="text-sm text-destructive mt-2">
              {createError}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

