import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Input } from '@/components/ui/input';
import { useGoogleMapsScript } from '@/hooks/useGoogleMapsScript';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 300;
const MIN_INPUT_LENGTH = 3;
const ADDRESS_MAX_LENGTH = 200;

function truncateAddressTo200(str: string): string {
  const trimmed = str.trim();
  if (trimmed.length <= ADDRESS_MAX_LENGTH) return trimmed;
  const slice = trimmed.slice(0, ADDRESS_MAX_LENGTH);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace <= 0) return slice;
  return slice.slice(0, lastSpace);
}

/** Creates a new session token for Places API billing. Must be an instance of AutocompleteSessionToken, not a string. */
function createSessionToken(): google.maps.places.AutocompleteSessionToken | undefined {
  if (typeof window === 'undefined' || !window.google?.maps?.places?.AutocompleteSessionToken) return undefined;
  return new window.google.maps.places.AutocompleteSessionToken();
}

export interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  'aria-invalid'?: boolean;
  className?: string;
  maxLength?: number;
  /** When true, show hint that suggestions are unavailable (no key or error). */
  showFallbackHint?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  id,
  placeholder = 'Property address',
  'aria-invalid': ariaInvalid,
  className,
  maxLength = ADDRESS_MAX_LENGTH,
  showFallbackHint = true,
}: AddressAutocompleteProps) {
  const apiKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_PLACES_API_KEY;
  const { loaded: scriptLoaded, error: scriptError } = useGoogleMapsScript(apiKey);

  const [suggestions, setSuggestions] = React.useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [fallbackUsed, setFallbackUsed] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = React.useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const autocompleteServiceRef = React.useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = React.useRef<google.maps.places.PlacesService | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const hasTypeahead = Boolean(apiKey?.trim()) && scriptLoaded && !scriptError;
  const showHint = showFallbackHint && (fallbackUsed || !apiKey?.trim() || scriptError);

  // Init services when script is loaded
  React.useEffect(() => {
    if (!scriptLoaded || !window.google?.maps?.places) return;
    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    const div = document.createElement('div');
    placesServiceRef.current = new google.maps.places.PlacesService(div);
  }, [scriptLoaded]);

  const fetchPredictions = React.useCallback(
    (input: string) => {
      const service = autocompleteServiceRef.current;
      if (!service || !input || input.trim().length < MIN_INPUT_LENGTH) {
        setSuggestions([]);
        return;
      }
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = createSessionToken() ?? null;
      }
      setIsLoading(true);
      const request: google.maps.places.AutocompletionRequest = {
        input: input.trim(),
        types: ['address'],
        componentRestrictions: { country: ['au', 'us'] },
      };
      if (sessionTokenRef.current) request.sessionToken = sessionTokenRef.current;
      const timeoutMs = 10000;
      const timeoutId = window.setTimeout(() => {
        setIsLoading(false);
        setSuggestions([]);
        setFallbackUsed(true);
      }, timeoutMs);
      service.getPlacePredictions(
        request,
        (predictions, status) => {
          window.clearTimeout(timeoutId);
          setIsLoading(false);
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            setSuggestions([]);
            if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              setFallbackUsed(true);
            }
            return;
          }
          setSuggestions(predictions);
          setHighlightedIndex(-1);
        }
      );
    },
    []
  );

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      onChange(v);
      setFallbackUsed(false);
      if (!hasTypeahead) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (v.trim().length < MIN_INPUT_LENGTH) {
        setSuggestions([]);
        return;
      }
      debounceRef.current = setTimeout(() => fetchPredictions(v), DEBOUNCE_MS);
    },
    [onChange, hasTypeahead, fetchPredictions]
  );

  const selectPlace = React.useCallback(
    (placeId: string) => {
      const places = placesServiceRef.current;
      const token = sessionTokenRef.current;
      if (!places || !placeId) return;
      setSuggestions([]);
      setHighlightedIndex(-1);
      const detailsRequest: google.maps.places.PlaceDetailsRequest = {
        placeId,
        fields: ['formatted_address'],
      };
      if (token) detailsRequest.sessionToken = token;
      places.getDetails(
        detailsRequest,
        (place, status) => {
          sessionTokenRef.current = createSessionToken() ?? null;
          if (status === google.maps.places.PlacesServiceStatus.OK && place?.formatted_address) {
            const truncated = truncateAddressTo200(place.formatted_address);
            onChange(truncated);
          }
        }
      );
    },
    [onChange]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!suggestions.length) {
        if (e.key === 'Escape') setSuggestions([]);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : i));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((i) => (i > 0 ? i - 1 : -1));
        return;
      }
      if (e.key === 'Enter' && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        e.preventDefault();
        selectPlace(suggestions[highlightedIndex].place_id);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestions([]);
        setHighlightedIndex(-1);
      }
    },
    [suggestions, highlightedIndex, selectPlace]
  );

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Scroll highlighted option into view
  React.useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const option = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
    option?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const isOpen = suggestions.length > 0;

  if (!hasTypeahead) {
    return (
      <div className="space-y-1">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={ariaInvalid}
          className={className}
          maxLength={maxLength}
        />
        {showHint && (
          <p className="text-body text-muted-foreground" role="status">
            Address suggestions unavailable; you can still type your full address.
          </p>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-1">
      <Popover.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSuggestions([]);
            setHighlightedIndex(-1);
          }
        }}
      >
        <Popover.Anchor asChild>
          <div className="relative">
            <Input
              id={id}
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-invalid={ariaInvalid}
              aria-autocomplete="list"
              aria-controls={isOpen ? 'address-suggestions-list' : undefined}
              aria-expanded={isOpen}
              aria-activedescendant={
                highlightedIndex >= 0 && suggestions[highlightedIndex]
                  ? `address-suggestion-${highlightedIndex}`
                  : undefined
              }
              className={className}
              maxLength={maxLength}
              autoComplete="off"
            />
            {isLoading && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs"
                aria-hidden
              >
                Searching…
              </span>
            )}
          </div>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            className={cn(
              'z-50 mt-1 max-h-[280px] min-w-[var(--radix-popover-trigger-width)] overflow-auto rounded-md border bg-popover p-1 shadow-md',
              'focus:outline-none'
            )}
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <ul ref={listRef} className="list-none" role="listbox" id="address-suggestions-list" aria-label="Address suggestions">
              {suggestions.map((pred, i) => (
                <li key={pred.place_id} role="option" id={`address-suggestion-${i}`} aria-selected={highlightedIndex === i}>
                  <button
                    type="button"
                    className={cn(
                      'w-full cursor-pointer rounded px-2 py-2 text-left text-sm hover:bg-accent',
                      highlightedIndex === i && 'bg-accent'
                    )}
                    onClick={() => selectPlace(pred.place_id)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                  >
                    {pred.description}
                  </button>
                </li>
              ))}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {showHint && fallbackUsed && (
        <p className="text-body text-muted-foreground text-sm" role="status">
          Address suggestions unavailable; you can still type your full address.
        </p>
      )}
    </div>
  );
}
