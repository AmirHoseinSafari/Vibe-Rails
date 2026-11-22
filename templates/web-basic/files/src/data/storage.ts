// The only place that reads and writes saved data. Keeping it here means the way data is kept
// can change later (another format, or a server) without touching the rest of the app.
// When the shape of saved data changes, keep old data readable: fill in missing fields when loading.
const PREFIX = '{{slug}}:';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}
