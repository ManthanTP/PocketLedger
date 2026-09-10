/**
 * In-memory test environment mock for localStorage and IndexedDB
 */

export class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

export function setupMockStorage() {
  const localStorage = new MockLocalStorage();
  const dbData: Record<string, Map<string, any>> = {
    accounts: new Map(),
    transactions: new Map(),
    categories: new Map(),
    security: new Map(),
  };

  const createMockIDB = () => ({
    open: (_name: string, _version: number) => {
      const req: any = {
        result: null,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      setTimeout(() => {
        const db = {
          objectStoreNames: {
            contains: (s: string) => s in dbData,
          },
          createObjectStore: (s: string) => {
            if (!dbData[s]) dbData[s] = new Map();
            return {
              createIndex: () => {},
            };
          },
          transaction: (_storeName: string, _mode?: string) => ({
            objectStore: (s: string) => {
              const map = dbData[s] || (dbData[s] = new Map());
              return {
                get: (key: string) => {
                  const r: any = { result: map.get(key) || null, onsuccess: null, onerror: null };
                  setTimeout(() => r.onsuccess?.({ target: r }), 0);
                  return r;
                },
                getAll: () => {
                  const r: any = { result: Array.from(map.values()), onsuccess: null, onerror: null };
                  setTimeout(() => r.onsuccess?.({ target: r }), 0);
                  return r;
                },
                put: (val: any) => {
                  map.set(val.id, val);
                  const r: any = { onsuccess: null, onerror: null };
                  setTimeout(() => r.onsuccess?.({ target: r }), 0);
                  return r;
                },
                delete: (key: string) => {
                  map.delete(key);
                  const r: any = { onsuccess: null, onerror: null };
                  setTimeout(() => r.onsuccess?.({ target: r }), 0);
                  return r;
                },
              };
            },
          }),
          close: () => {},
        };

        req.result = db;
        if (req.onupgradeneeded) {
          req.onupgradeneeded({ target: req });
        }
        if (req.onsuccess) {
          req.onsuccess({ target: req });
        }
      }, 0);

      return req;
    },
    deleteDatabase: (_name: string) => {
      for (const k of Object.keys(dbData)) {
        dbData[k].clear();
      }
      const req: any = { onsuccess: null, onerror: null };
      setTimeout(() => req.onsuccess?.({ target: req }), 0);
      return req;
    },
  });

  (globalThis as any).localStorage = localStorage;
  (globalThis as any).indexedDB = createMockIDB();
  (globalThis as any).window = {
    document: {
      documentElement: {
        classList: {
          add: () => {},
          remove: () => {},
        },
      },
    },
    matchMedia: () => ({ matches: false }),
  };

  return { localStorage, dbData };
}
