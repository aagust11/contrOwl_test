let database: Promise<IDBDatabase>;
function db() {
  return database ||= new Promise((resolve, reject) => {
    const r = indexedDB.open('contrOwl-direct-v1', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('data');
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
}
export async function read<T>(key: string): Promise<T | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {const r = d.transaction('data').objectStore('data').get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);});
}
export async function write(key: string, value: unknown) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {const t = d.transaction('data', 'readwrite'); t.objectStore('data').put(value, key); t.oncomplete = () => resolve(); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error || Error('No s’ha pogut desar.'));});
}
export function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
