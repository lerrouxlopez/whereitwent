export function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeLocal(key: string) {
  window.localStorage.removeItem(key);
}
