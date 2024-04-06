import type { Chunk, StorageAdapterInterface, StorageKey } from '@automerge/automerge-repo'
import { SqliteError } from 'better-sqlite3'
import type { Database as DatabaseInstance, Statement } from 'better-sqlite3'

function bufferToUint8Array(buf: Buffer): Uint8Array {
	return new Uint8Array(buf.buffer, buf.byteOffset, buf.length / Uint8Array.BYTES_PER_ELEMENT)
}

export class BetterSqlite3StorageAdapter implements StorageAdapterInterface {
	#db: DatabaseInstance

	#load_stmt: Statement<[string]>
	#save_stmt: Statement<[string, Uint8Array]>
	#remove_stmt: Statement<[string]>
	#loadRange_stmt: Statement<[string]>
	#removeRange_stmt: Statement<[string]>

	constructor(database: DatabaseInstance, tableName: string = 'automerge_repo_data') {
		this.#db = database
		this.#db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (
        key TEXT PRIMARY KEY,
        data BLOB NOT NULL
    ) WITHOUT ROWID, STRICT;`)
		this.#db.exec(`CREATE INDEX idx ON ${tableName}(key);`)

		this.#load_stmt = this.#db.prepare(`SELECT data FROM ${tableName} WHERE key = ?;`)
		this.#save_stmt = this.#db.prepare(`INSERT INTO ${tableName} VALUES (?, ?);`)
		this.#remove_stmt = this.#db.prepare(`DELETE FROM ${tableName} WHERE key = ?;`)
		this.#loadRange_stmt = this.#db.prepare(`SELECT * FROM ${tableName} WHERE key GLOB ?;`)
		this.#removeRange_stmt = this.#db.prepare(`DELETE FROM ${tableName} WHERE key GLOB ?;`)
	}

	async load(keyArray: StorageKey): Promise<Uint8Array | undefined> {
		const key = this.#keyToString(keyArray)
		const result = this.#load_stmt.get(key) as { key: string; data: Uint8Array } | undefined
		if (!result) {
			return undefined
		}
		return bufferToUint8Array(result.data as Buffer)
	}

	async save(keyArray: StorageKey, binary: Uint8Array): Promise<void> {
		const key = this.#keyToString(keyArray)
		try {
			this.#save_stmt.run(key, binary)
		} catch (error: unknown) {
			if (error instanceof SqliteError) {
				await this.remove(keyArray)
				this.#save_stmt.run(key, binary)
			} else {
				throw error
			}
		}
	}

	async remove(keyArray: string[]): Promise<void> {
		const key = this.#keyToString(keyArray)
		this.#remove_stmt.run(key)
	}

	async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
		const prefix = this.#keyToString(keyPrefix)
		const result = this.#loadRange_stmt.all(`${prefix}*`) as Array<{
			key: string
			data: Buffer
		}>
		return result.map((x) => {
			return {
				key: this.#stringToKey(x.key),
				data: bufferToUint8Array(x.data),
			}
		})
	}

	async removeRange(keyPrefix: string[]): Promise<void> {
		const prefix = this.#keyToString(keyPrefix)
		this.#removeRange_stmt.run(`${prefix}*`)
	}

	#keyToString(key: StorageKey): string {
		return key.join(this.#SEP)
	}

	#stringToKey(key: string): StorageKey {
		return key.split(this.#SEP)
	}

	#SEP = '.'
}
