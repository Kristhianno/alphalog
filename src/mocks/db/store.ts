import { emptyDB, SCHEMA_VERSION, STORAGE_KEY, type DB } from "./schema"
import { buildSeedDatabase } from "./seed"

let db: DB | null = null

function loadFromStorage(): DB | null {
  if (typeof localStorage === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { version: number; data: DB }
    if (parsed.version !== SCHEMA_VERSION) return null
    return { ...emptyDB(), ...parsed.data }
  } catch {
    return null
  }
}

function persist(): void {
  if (typeof localStorage === "undefined" || !db) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, data: db }))
}

/** Retorna a instância única do banco mock, semeando/hidratando na primeira chamada. */
export function getDB(): DB {
  if (!db) {
    db = loadFromStorage() ?? buildSeedDatabase()
    persist()
  }
  return db
}

/** Chamar após qualquer mutação nas tabelas de `getDB()` para persistir em localStorage. */
export function saveDB(): void {
  persist()
}

/** Apaga tudo e regenera os dados fictícios — usado pela ação "Restaurar dados de exemplo". */
export function resetDB(): DB {
  db = buildSeedDatabase()
  persist()
  return db
}

export function peekNextRequestNumber(): number {
  return getDB().nextRequestNumber
}

export function consumeNextRequestNumber(): number {
  const current = getDB()
  const value = current.nextRequestNumber
  current.nextRequestNumber += 1
  saveDB()
  return value
}
