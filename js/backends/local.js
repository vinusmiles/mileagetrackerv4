// Backend: this browser's localStorage. Used when Firebase is not set up.
// Writes the whole data set on every change (small data, simple and safe).

const KEY = 'mileagemate:v1';
const blank = () => ({ version: 1, vehicles: [], entries: [] });

export function readLocalData() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { data: blank(), persistent: true };
    try {
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.vehicles) || !Array.isArray(data.entries)) throw new Error('bad shape');
      return { data, persistent: true };
    } catch {
      localStorage.setItem(`${KEY}:unreadable:${Date.now()}`, raw); // keep it aside, never overwrite silently
      return { data: blank(), persistent: true };
    }
  } catch {
    return { data: blank(), persistent: false }; // storage blocked (some private modes)
  }
}

export function createLocalBackend() {
  let persistent = true;
  return {
    kind: 'local',
    get persistent() { return persistent; },
    async load() {
      const r = readLocalData();
      persistent = r.persistent;
      return r.data;
    },
    /** `next` is the full data set after the change. */
    async save(_ops, next) {
      if (!persistent) return;
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        throw new Error('Could not save on this device. Browser storage may be full or blocked.');
      }
    },
  };
}
