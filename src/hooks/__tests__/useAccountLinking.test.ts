import { renderHook, act } from '@testing-library/react';
import { useAccountLinking } from '../useAccountLinking';

describe('useAccountLinking', () => {
  describe('initialization', () => {
    it('should initialize with undefined accountId', () => {
      const { result } = renderHook(() => useAccountLinking());

      expect(result.current.isAccountBeingCreated).toBe(false);
      expect(result.current.shouldPreventSubmission()).toBe(false);
      expect(result.current.getFinalAccountId()).toBeUndefined();
      expect(result.current.getFinalAccountId('test-id')).toBe('test-id');
    });

    it('should initialize with provided default accountId', () => {
      const { result } = renderHook(() => useAccountLinking('default-id'));

      expect(result.current.isAccountBeingCreated).toBe(false);
      expect(result.current.shouldPreventSubmission()).toBe(false);
      expect(result.current.getFinalAccountId()).toBe('default-id');
      expect(result.current.getFinalAccountId('test-id')).toBe('test-id');
    });
  });

  describe('handleAccountChange', () => {
    it('should update the linked account ID ref', () => {
      const { result } = renderHook(() => useAccountLinking());

      act(() => {
        result.current.handleAccountChange('new-account-id');
      });

      expect(result.current.getFinalAccountId()).toBe('new-account-id');
    });
  });

  describe('handleAccountCreationStateChange', () => {
    it('should update both state and ref when account creation starts', () => {
      const { result } = renderHook(() => useAccountLinking());

      act(() => {
        result.current.handleAccountCreationStateChange(true);
      });

      expect(result.current.isAccountBeingCreated).toBe(true);
      expect(result.current.shouldPreventSubmission()).toBe(true);
    });

    it('should update both state and ref when account creation ends', () => {
      const { result } = renderHook(() => useAccountLinking());

      act(() => {
        result.current.handleAccountCreationStateChange(true);
      });

      expect(result.current.isAccountBeingCreated).toBe(true);
      expect(result.current.shouldPreventSubmission()).toBe(true);

      act(() => {
        result.current.handleAccountCreationStateChange(false);
      });

      expect(result.current.isAccountBeingCreated).toBe(false);
      expect(result.current.shouldPreventSubmission()).toBe(false);
    });
  });

  describe('getFinalAccountId', () => {
    it('should return form value when provided', () => {
      const { result } = renderHook(() => useAccountLinking());

      expect(result.current.getFinalAccountId('form-value')).toBe('form-value');
    });

    it('should return ref value when form value is undefined', () => {
      const { result } = renderHook(() => useAccountLinking('ref-value'));

      expect(result.current.getFinalAccountId()).toBe('ref-value');
    });

    it('should prioritize form value over ref value', () => {
      const { result } = renderHook(() => useAccountLinking('ref-value'));

      expect(result.current.getFinalAccountId('form-value')).toBe('form-value');
    });
  });

  describe('shouldPreventSubmission', () => {
    it('should return false when not creating account', () => {
      const { result } = renderHook(() => useAccountLinking());

      expect(result.current.shouldPreventSubmission()).toBe(false);
    });

    it('should return true when creating account', () => {
      const { result } = renderHook(() => useAccountLinking());

      act(() => {
        result.current.handleAccountCreationStateChange(true);
      });

      expect(result.current.shouldPreventSubmission()).toBe(true);
    });
  });

  describe('ref synchronization with defaultValues', () => {
    it('should sync ref when defaultAccountId changes', () => {
      const { result, rerender } = renderHook(
        ({ defaultId }) => useAccountLinking(defaultId),
        { initialProps: { defaultId: undefined } }
      );

      expect(result.current.getFinalAccountId()).toBeUndefined();

      rerender({ defaultId: 'new-default-id' });

      expect(result.current.getFinalAccountId()).toBe('new-default-id');
    });
  });

  describe('race condition prevention', () => {
    it('should prevent form submission during account creation', () => {
      const { result } = renderHook(() => useAccountLinking());

      // Simulate form submission attempt during account creation
      act(() => {
        result.current.handleAccountCreationStateChange(true);
      });

      // Form should be blocked from submission
      expect(result.current.shouldPreventSubmission()).toBe(true);

      // Even if form value is provided, submission should still be prevented
      expect(result.current.getFinalAccountId('some-form-value')).toBe('some-form-value');
      expect(result.current.shouldPreventSubmission()).toBe(true);
    });

    it('should allow form submission after account creation completes', () => {
      const { result } = renderHook(() => useAccountLinking());

      // Start account creation
      act(() => {
        result.current.handleAccountCreationStateChange(true);
      });

      expect(result.current.shouldPreventSubmission()).toBe(true);

      // Complete account creation
      act(() => {
        result.current.handleAccountCreationStateChange(false);
      });

      expect(result.current.shouldPreventSubmission()).toBe(false);
    });
  });

  describe('account ID persistence', () => {
    it('should maintain account ID through state updates', () => {
      const { result } = renderHook(() => useAccountLinking());

      // Set account ID
      act(() => {
        result.current.handleAccountChange('persistent-id');
      });

      expect(result.current.getFinalAccountId()).toBe('persistent-id');

      // Start account creation (should not affect stored ID)
      act(() => {
        result.current.handleAccountCreationStateChange(true);
      });

      expect(result.current.getFinalAccountId()).toBe('persistent-id');
      expect(result.current.shouldPreventSubmission()).toBe(true);

      // End account creation
      act(() => {
        result.current.handleAccountCreationStateChange(false);
      });

      expect(result.current.getFinalAccountId()).toBe('persistent-id');
      expect(result.current.shouldPreventSubmission()).toBe(false);
    });
  });
});
