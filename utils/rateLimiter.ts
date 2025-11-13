
const RATE_LIMIT_KEY = 'naim-banana-rate-limit';
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

interface RateLimitData {
  count: number;
  lastReset: number; // timestamp in ms
}

/**
 * Retrieves the rate limit data from localStorage, resetting it if a day has passed.
 * @returns The current or reset RateLimitData.
 */
function getStoredData(): RateLimitData {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    if (stored) {
      const data: RateLimitData = JSON.parse(stored);
      // Check if the last reset was more than 24 hours ago
      if (Date.now() - data.lastReset > ONE_DAY_IN_MS) {
        // It's a new day, so reset the counter.
        const newData = { count: 0, lastReset: Date.now() };
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(newData));
        return newData;
      }
      return data;
    }
  } catch (e) {
    console.error("Failed to parse rate limit data from localStorage", e);
    // If parsing fails, fall through to create a new one.
  }

  // Return a default/initial state if nothing is stored or parsing failed.
  const initialState = { count: 0, lastReset: Date.now() };
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(initialState));
  return initialState;
}

/**
 * Gets the number of images generated today from local storage.
 * It automatically handles the daily reset logic.
 * @returns The number of generations today.
 */
export const getDailyGenerationCount = (): number => {
  return getStoredData().count;
};

/**
 * Increments the daily generation count in local storage.
 * @returns The new count after incrementing.
 */
export const incrementDailyGenerationCount = (): number => {
  const currentData = getStoredData();
  const newCount = currentData.count + 1;
  const newData: RateLimitData = {
    ...currentData,
    count: newCount,
  };
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(newData));
  return newCount;
};
