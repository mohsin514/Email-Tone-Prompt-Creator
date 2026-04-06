export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, onRetry } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const jitter = Math.random() * 1000;
      const delay = Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay);

      if (onRetry) {
        onRetry(error as Error, attempt + 1);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Unreachable');
}
