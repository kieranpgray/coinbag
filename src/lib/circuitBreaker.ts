/**
 * Circuit Breaker for external API calls
 *
 * Implements circuit breaker pattern to prevent cascading failures
 * when external services (like Mistral OCR) are unavailable.
 */

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

export class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'closed'
  };

  private readonly threshold: number;
  private readonly timeout: number;
  private readonly halfOpenMaxCalls: number = 3;
  private halfOpenCalls = 0;

  constructor(
    threshold: number = 5, // Number of failures before opening
    timeout: number = 60000 // Time before trying again (1 minute)
  ) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state.state = 'half-open';
        this.halfOpenCalls = 0;
      } else {
        throw new Error('Circuit breaker is open - service temporarily unavailable');
      }
    }

    if (this.state.state === 'half-open' && this.halfOpenCalls >= this.halfOpenMaxCalls) {
      throw new Error('Circuit breaker half-open limit exceeded');
    }

    try {
      const result = await fn();

      // Success - reset circuit breaker
      this.onSuccess();
      return result;

    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.state.failures = 0;
    this.state.lastFailureTime = 0;
    this.state.state = 'closed';
    this.halfOpenCalls = 0;
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failures >= this.threshold) {
      this.state.state = 'open';
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.state.lastFailureTime >= this.timeout;
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state.state,
      failures: this.state.failures,
      lastFailureTime: this.state.lastFailureTime
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed'
    };
    this.halfOpenCalls = 0;
  }
}

// Global circuit breaker instance for Mistral OCR
export const mistralCircuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1 minute timeout



