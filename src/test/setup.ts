import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Node 25 ships a native localStorage that interferes with happy-dom's (it auto-injects a broken
// --localstorage-file flag). Replace it with an in-memory polyfill so zustand/persist works.
class InMemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

const memoryStorage = new InMemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: memoryStorage, configurable: true });
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", { value: memoryStorage, configurable: true });
}

// happy-dom doesn't implement Element.getAnimations(); Base UI's ScrollArea expects it.
if (typeof Element !== "undefined" && typeof Element.prototype.getAnimations !== "function") {
  Element.prototype.getAnimations = () => [];
}

afterEach(() => {
  cleanup();
  memoryStorage.clear();
});
