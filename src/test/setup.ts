import "@testing-library/jest-dom";

// Node 26 exposes an experimental global localStorage that is undefined unless
// --localstorage-file is set, which can shadow jsdom's Storage implementation.
function ensureLocalStorage() {
  const host = globalThis as typeof globalThis & { localStorage?: Storage };
  try {
    if (host.localStorage && typeof host.localStorage.clear === "function") {
      host.localStorage.clear();
      return;
    }
  } catch {
    // fall through to install an in-memory shim
  }

  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };

  Object.defineProperty(host, "localStorage", {
    configurable: true,
    enumerable: true,
    value: memoryStorage,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      enumerable: true,
      value: memoryStorage,
    });
  }
}

ensureLocalStorage();

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;
}
