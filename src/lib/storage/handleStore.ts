// 開いたフォルダのハンドルとユーザー指定の表示名(label)を IndexedDB に永続化する。
// ハンドルは structured clone 可能なため、ラベルと合わせたオブジェクトのまま保存・復元できる。

const DB_NAME = 'lite-md'
const STORE_NAME = 'handles'
const FOLDERS_KEY = 'workspace-directories'

export type PersistedFolder = {
  handle: FileSystemDirectoryHandle
  label: string
}

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

// 旧形式（ハンドルの配列）も読めるよう正規化する
function normalize(value: unknown): PersistedFolder[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (item && typeof item === 'object' && 'handle' in item) {
      const record = item as { handle: FileSystemDirectoryHandle; label?: unknown }
      return { handle: record.handle, label: typeof record.label === 'string' ? record.label : '' }
    }
    return { handle: item as FileSystemDirectoryHandle, label: '' }
  })
}

export function save_folders(folders: PersistedFolder[]): Promise<void> {
  return run_tx<IDBValidKey>('readwrite', (store) => store.put(folders, FOLDERS_KEY)).then(
    () => undefined,
  )
}

export function load_folders(): Promise<PersistedFolder[]> {
  return run_tx<unknown>('readonly', (store) => store.get(FOLDERS_KEY)).then(normalize)
}
