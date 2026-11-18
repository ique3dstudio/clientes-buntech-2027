// Mini-wrapper do IndexedDB: guarda a fila de registros feitos sem sinal e a cópia local dos clientes.
const NOME = "buntech-offline";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(NOME, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore("fila", { keyPath: "id" });
      db.createObjectStore("clientes", { keyPath: "id" });
      db.createObjectStore("meta", { keyPath: "chave" });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

async function tx<T>(loja: string, modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await abrir();
  return new Promise((ok, erro) => {
    const t = db.transaction(loja, modo);
    const req = fn(t.objectStore(loja));
    t.oncomplete = () => { db.close(); ok(req ? (req.result as T) : undefined); };
    t.onerror = () => { db.close(); erro(t.error); };
  });
}

export const idb = {
  todos: async <T>(loja: string) => ((await tx<T[]>(loja, "readonly", (s) => s.getAll())) ?? []) as T[],
  obter: <T>(loja: string, chave: string) => tx<T>(loja, "readonly", (s) => s.get(chave)),
  gravar: (loja: string, valor: unknown) => tx(loja, "readwrite", (s) => { s.put(valor); }),
  apagar: (loja: string, chave: string) => tx(loja, "readwrite", (s) => { s.delete(chave); }),
  substituir: async (loja: string, valores: unknown[]) => {
    await tx(loja, "readwrite", (s) => {
      s.clear();
      for (const v of valores) s.put(v);
    });
  },
};
