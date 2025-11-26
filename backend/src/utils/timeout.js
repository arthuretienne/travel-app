// backend/src/utils/timeout.js
// Timeout utilities for API calls

/**
 * Wraps a promise with a timeout
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name of operation for error message
 * @returns {Promise} Promise that rejects if timeout is exceeded
 */
export function withTimeout(promise, timeoutMs, operationName = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Wraps a promise with timeout and fallback value
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {any} fallbackValue - Value to return on timeout
 * @param {string} operationName - Name of operation for logging
 * @returns {Promise} Promise that returns fallback on timeout
 */
export async function withTimeoutAndFallback(
  promise,
  timeoutMs,
  fallbackValue,
  operationName = 'Operation'
) {
  try {
    return await withTimeout(promise, timeoutMs, operationName);
  } catch (error) {
    if (error.message.includes('timed out')) {
      console.warn(`⏱️  ${operationName} timeout - using fallback`);
      return fallbackValue;
    }
    throw error;
  }
}

/**
 * Retry a promise with exponential backoff
 * @param {Function} fn - Function that returns a promise
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delayMs - Initial delay in milliseconds
 * @returns {Promise} Promise that retries on failure
 */
export async function withRetry(fn, maxRetries = 3, delayMs = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const waitTime = delayMs * Math.pow(2, i);
        console.log(`🔄 Retry ${i + 1}/${maxRetries} after ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}
