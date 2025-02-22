import { sleep } from './sleep';

export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    onError?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, onError } = options;
  let lastError: Error;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      if (onError) {
        onError(lastError, attempt);
      }

      if (attempt === retries) {
        throw lastError;
      }

      await sleep(delay * attempt); // Exponential backoff
    }
  }

  throw lastError!;
}