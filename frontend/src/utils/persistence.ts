/**
 * Tries to enable persistence for local IndexedDB data.
 * In Chrome, this is a no-op as the browser handles this based on heuristics.
 */
export function tryEnablePersistence() {
  if (navigator.storage?.persist) {
    return navigator.storage.persist().catch(console.warn);
  }
}
