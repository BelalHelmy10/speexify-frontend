// Audio blobs belong in IndexedDB, rather than the small localStorage quota.
function openStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("speexify-placement", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("recordings");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact(key, mode, value) {
  const db = await openStore();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction("recordings", mode);
      const store = transaction.objectStore("recordings");
      const request = mode === "readonly" ? store.get(key)
        : value === null ? store.delete(key) : store.put(value, key);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error("Recording save interrupted"));
    });
  } finally {
    db.close();
  }
}

export const loadPlacementAudio = (accountKey) => transact(accountKey, "readonly");
export const savePlacementAudio = (accountKey, recording) => transact(accountKey, "readwrite", recording);
export const clearPlacementAudio = (accountKey) => transact(accountKey, "readwrite", null);
