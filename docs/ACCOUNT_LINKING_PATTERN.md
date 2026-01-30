# Account Linking Pattern

## Overview

This document describes the account linking pattern used in forms where users can select existing accounts or create new accounts inline. This pattern ensures reliable account linking even during async account creation operations.

## Problem Statement

When users create accounts inline during form submission, several race conditions and timing issues can occur:

1. **React State Timing**: React state updates are asynchronous, so form submission might proceed before account creation completes
2. **Account ID Loss**: The newly created account ID might not be captured if form state hasn't updated yet
3. **Form Submission During Creation**: Users can accidentally submit forms while account creation is still in progress

## Solution: Dual State Management Pattern

The solution uses a combination of React state and refs to handle both synchronous and asynchronous operations:

### Core Components

1. **React State**: For UI updates (loading indicators, disabled states)
2. **Refs**: For synchronous checks in event handlers and form submission logic
3. **Custom Hook**: Encapsulates the pattern for reuse across forms

### Key Patterns

#### 1. Account ID Storage (Dual Write)

```typescript
// Always update both form state AND ref synchronously
onChange={(value) => {
  setValue('accountId', value);           // Form state
  handleAccountChange(value);            // Ref storage (via hook)
}}
```

#### 2. Account Creation State Management

```typescript
// Update both UI state AND synchronous ref
onAccountCreationStateChange={(isCreating) => {
  setIsCreating(isCreating);             // UI state
  isCreatingRef.current = isCreating;    // Synchronous ref
}}
```

#### 3. Form Submission Prevention

```typescript
// Check ref synchronously in multiple places
const handleFormSubmit = (data) => {
  if (shouldPreventSubmission()) return; // Ref-based check

  const finalAccountId = getFinalAccountId(data.accountId); // Fallback pattern
  // ... submit logic
};

// Also check in form onSubmit event
<form onSubmit={(e) => {
  if (shouldPreventSubmission()) { // Synchronous check
    e.preventDefault();
    return;
  }
  handleSubmit(handleFormSubmit)(e);
}}>
```

#### 4. Account ID Fallback Logic

```typescript
// Use form value with ref fallback to ensure account linking works
const getFinalAccountId = (formValue) => {
  return formValue || linkedAccountIdRef.current;
};
```

## Usage Examples

### Using the Custom Hook

```typescript
import { useAccountLinking } from '@/hooks/useAccountLinking';

function MyForm({ defaultValues }) {
  const {
    isAccountBeingCreated,
    handleAccountChange,
    handleAccountCreationStateChange,
    getFinalAccountId,
    shouldPreventSubmission,
  } = useAccountLinking(defaultValues?.accountId);

  const handleSubmit = (data) => {
    if (shouldPreventSubmission()) return;

    const finalAccountId = getFinalAccountId(data.accountId);
    // Submit with finalAccountId
  };

  return (
    <form onSubmit={(e) => {
      if (shouldPreventSubmission()) {
        e.preventDefault();
        return;
      }
      handleSubmit(handleSubmit)(e);
    }}>
      <AccountSelect
        value={watchedAccountId}
        onChange={(value) => {
          setValue('accountId', value);
          handleAccountChange(value);
        }}
        onAccountCreationStateChange={handleAccountCreationStateChange}
      />
      <button disabled={isAccountBeingCreated}>
        {isAccountBeingCreated ? 'Creating Account...' : 'Submit'}
      </button>
    </form>
  );
}
```

### Manual Implementation (Not Recommended)

If you can't use the hook, follow this pattern:

```typescript
function MyForm() {
  const [isAccountBeingCreated, setIsAccountBeingCreated] = useState(false);
  const linkedAccountIdRef = useRef<string | undefined>();
  const isAccountBeingCreatedRef = useRef(false);

  // Sync ref with defaultValues
  useEffect(() => {
    if (defaultValues?.accountId) {
      linkedAccountIdRef.current = defaultValues.accountId;
    }
  }, [defaultValues?.accountId]);

  const handleAccountChange = (accountId: string) => {
    linkedAccountIdRef.current = accountId;
  };

  const handleAccountCreationStateChange = (isCreating: boolean) => {
    setIsAccountBeingCreated(isCreating);
    isAccountBeingCreatedRef.current = isCreating;
  };

  const getFinalAccountId = (formValue?: string) => {
    return formValue || linkedAccountIdRef.current;
  };

  const shouldPreventSubmission = () => {
    return isAccountBeingCreatedRef.current;
  };

  // Use same patterns as hook example above
}
```

## Components Involved

### AccountSelect Component

```typescript
interface AccountSelectProps {
  value?: string;
  onChange: (value: string) => void;
  onAccountCreationStateChange?: (isCreating: boolean) => void;
  onAccountCreationError?: (error: string | null) => void;
  context?: 'expense' | 'income'; // For dynamic dialog text
}
```

**Key Features:**
- Dropdown with search and account creation
- Error handling with user feedback
- Keeps dialog open on creation failure
- Passes creation state to parent components

### useAccountLinking Hook

**API:**
```typescript
interface UseAccountLinkingReturn {
  isAccountBeingCreated: boolean;           // UI state
  linkedAccountIdRef: React.MutableRefObject<string | undefined>;
  isAccountBeingCreatedRef: React.MutableRefObject<boolean>;
  handleAccountChange: (accountId: string) => void;
  handleAccountCreationStateChange: (isCreating: boolean) => void;
  getFinalAccountId: (formValue?: string) => string | undefined;
  shouldPreventSubmission: () => boolean;
}
```

## Common Pitfalls & Solutions

### ❌ Pitfall: Only Using React State for Submission Checks

```typescript
// BAD: Relies on async state updates
if (isAccountBeingCreated) return; // May not be updated yet
```

**✅ Solution:** Use refs for synchronous checks
```typescript
if (shouldPreventSubmission()) return; // Uses ref.current
```

### ❌ Pitfall: Not Updating Ref When Account Changes

```typescript
// BAD: Only updates form state
onChange={(value) => setValue('accountId', value)}
```

**✅ Solution:** Update both state and ref
```typescript
onChange={(value) => {
  setValue('accountId', value);
  handleAccountChange(value);
}}
```

### ❌ Pitfall: Not Using Ref Fallback in Submission

```typescript
// BAD: May lose account ID
onSubmit({ accountId: data.accountId })
```

**✅ Solution:** Use fallback pattern
```typescript
const finalAccountId = getFinalAccountId(data.accountId);
onSubmit({ accountId: finalAccountId })
```

### ❌ Pitfall: Not Preventing Submission in Form onSubmit

```typescript
// BAD: Only checks in handleSubmit function
<form onSubmit={handleSubmit(onSubmitHandler)}>
```

**✅ Solution:** Check in both places
```typescript
<form onSubmit={(e) => {
  if (shouldPreventSubmission()) {
    e.preventDefault();
    return;
  }
  handleSubmit(onSubmitHandler)(e);
}}>
```

### ❌ Pitfall: Not Syncing Ref with Default Values

```typescript
// BAD: Ref doesn't update when editing existing records
const linkedAccountIdRef = useRef(defaultValues?.accountId);
```

**✅ Solution:** Use useEffect to sync
```typescript
useEffect(() => {
  if (defaultValues?.accountId) {
    linkedAccountIdRef.current = defaultValues.accountId;
  }
}, [defaultValues?.accountId]);
```

## Testing Strategy

### Unit Tests for Hook

```typescript
describe('useAccountLinking', () => {
  it('should prevent submission during account creation', () => {
    const { result } = renderHook(() => useAccountLinking());

    act(() => {
      result.current.handleAccountCreationStateChange(true);
    });

    expect(result.current.shouldPreventSubmission()).toBe(true);
  });

  it('should use ref fallback for account ID', () => {
    const { result } = renderHook(() => useAccountLinking());

    act(() => {
      result.current.handleAccountChange('fallback-id');
    });

    expect(result.current.getFinalAccountId()).toBe('fallback-id');
    expect(result.current.getFinalAccountId('form-id')).toBe('form-id');
  });
});
```

### Integration Tests

- Test account creation flow: select → create → submit → verify linking
- Test error scenarios: creation failure → retry → success
- Test editing scenarios: existing account → verify persistence

## Future Applications

This pattern can be applied to any form where:

1. Users can select existing entities
2. Users can create entities inline
3. Entity creation is asynchronous
4. Entity ID must be captured reliably

**Potential Use Cases:**
- Category selection with inline creation
- Tag/label selection with creation
- Contact selection with creation
- Any parent-child relationship creation

## Migration Guide

When adding this pattern to existing forms:

1. **Add the hook** or implement the pattern manually
2. **Update AccountSelect usage** with proper callbacks
3. **Update form submission** to use ref fallback
4. **Add submission prevention** in form onSubmit
5. **Update UI feedback** (disabled states, loading text)
6. **Add error handling** for account creation failures
7. **Test thoroughly** - especially edge cases around timing

## Related Files

- `src/hooks/useAccountLinking.ts` - Custom hook implementation
- `src/components/shared/AccountSelect.tsx` - Account selection component
- `src/features/expenses/components/ExpenseForm.tsx` - Example usage
- `src/features/income/IncomePage.tsx` - Example usage
- `src/hooks/__tests__/useAccountLinking.test.ts` - Unit tests
