// 選択したフォルダの FileSystemDirectoryHandle を IndexedDB に永続化する。
// ハンドルは structured clone 可能なため、そのまま保存・復元できる。

const DB_NAME = 'lite-md'
const STORE_NAME = 'handles'
const HANDLE_KEY = 'workspace-directory'

function open_db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function run_tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return open_db().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const request = run(tx.objectStore(STORE_NAME))
        request.onsuccess = () => resolve(request.result as T)
        request.onerror = () => reject(request.error)
        tx.oncomplete = () => db.close()
      }),
  )
}

export function save_handle(handle: FileSystemDirectoryHandle): Promise<void> {
  return run_tx<IDBValidKey>('readwrite', (store) => store.put(handle, HANDLE_KEY)).then(() => undefined)
}

export function load_handle(): Promise<FileSystemDirectoryHandle | null> {
  return run_tx<FileSystemDirectoryHandle | undefined>('readonly', (store) =>
    store.get(HANDLE_KEY),
  ).then((handle) => handle ?? null)
}

export function clear_handle(): Promise<void> {
  return run_tx('readwrite', (store) => store.delete(HANDLE_KEY)).then(() => undefined)
}
