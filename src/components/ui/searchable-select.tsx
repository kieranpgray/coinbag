/**
 * SearchableSelect component with typeahead functionality.
 * 
 * Allows users to type to filter options, matching Atlassian Design System styling.
 * Built for dropdowns where users need to quickly find items by typing.
 * 
 * @example
 * <SearchableSelect
 *   value={value}
 *   onValueChange={setValue}
 *   options={[
 *     { value: 'weekly', label: 'Weekly' },
 *     { value: 'monthly', label: 'Monthly' }
 *   ]}
 *   placeholder="Select frequency"
 * />
 */

import * as React from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Button } from './button';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  /**
   * The selected value
   */
  value?: string;
  /**
   * Callback when value changes
   */
  onValueChange: (value: string) => void;
  /**
   * Array of options to display
   */
  options: SearchableSelectOption[];
  /**
   * Placeholder text when no value is selected
   */
  placeholder?: string;
  /**
   * Whether the select is disabled
   */
  disabled?: boolean;
  /**
   * Optional id for accessibility
   */
  id?: string;
  /**
   * Optional error message to display
   */
  error?: string;
  /**
   * Optional className for the trigger button
   */
  className?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  id,
  error,
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return options;
    }
    const query = searchQuery.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Find selected option
  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
    buttonRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
      buttonRef.current?.focus();
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    } else if (e.key.length === 1 && !isOpen) {
      // Open dropdown when user starts typing
      e.preventDefault(); // Prevent browser from inserting character into input
      setIsOpen(true);
      setSearchQuery(e.key);
    }
  };

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure dropdown is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen]);

  // Handle keyboard navigation in dropdown
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);

  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredOptions.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

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
          'w-full justify-between h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground',
          'hover:border-neutral-mid hover:bg-muted/50',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 focus:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted disabled:hover:border-border',
          error && 'border-destructive',
          !selectedOption && 'text-muted-foreground',
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-500 transition-transform ml-2 shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md max-h-80 overflow-hidden flex flex-col shadow-lg"
        >
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Type to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 h-8"
                autoFocus
              />
            </div>
          </div>

          {/* Options list */}
          <div className="overflow-auto max-h-60">
            {filteredOptions.length > 0 ? (
              <div className="py-1">
                {filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    className={cn(
                      // Atlassian Design System styling: improved hover states, better selected state indication
                      'w-full px-3 py-2 text-left text-sm text-foreground rounded-sm flex items-center justify-between',
                      'hover:bg-muted',
                      'focus:bg-primary/10 focus:outline-none',
                      index === highlightedIndex && 'bg-primary/10',
                      option.value === value && 'bg-primary/10'
                    )}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span>{option.label}</span>
                    {option.value === value && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No options found for &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

