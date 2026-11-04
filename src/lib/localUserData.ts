export function readUserLocalData<T>(userId: string, key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(`healthysis_${userId}_${key}`);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch (error: unknown) {
    console.warn(`Could not read local ${key} data.`, error);
    return fallback;
  }
}

export function writeUserLocalData<T>(userId: string, key: string, value: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(`healthysis_${userId}_${key}`, JSON.stringify(value));
    return true;
  } catch (error: unknown) {
    console.warn(`Could not save local ${key} data.`, error);
    return false;
  }
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (typeof error !== "object" || error === null || !("message" in error)) return false;
  return typeof error.message === "string"
    && /failed to fetch|fetch failed|network|load failed/i.test(error.message);
}
