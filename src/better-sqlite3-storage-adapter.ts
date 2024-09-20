import type { Chunk, StorageAdapterInterface, StorageKey } from '@automerge/automerge-repo'
import { SqliteError } from 'better-sqlite3'
import type { Database as DatabaseInstance, Statement } from 'better-sqlite3'

function bufferToUint8Array(buf: Buffer): Uint8Array {
	return new Uint8Array(buf.buffer, buf.byteOffset, buf.length / Uint8Array.BYTES_PER_ELEMENT)
}

const _SEP = '.'

export class BetterSqlite3StorageAdapter implements StorageAdapterInterface {
	_db: DatabaseInstance

	_load_stmt: Statement<[string]>
	_save_stmt: Statement<[string, Uint8Array]>
	_remove_stmt: Statement<[string]>
	_loadRange_stmt: Statement<[string]>
	_removeRange_stmt: Statement<[string]>

	constructor(database: DatabaseInstance, tableName: string = 'automerge_repo_data') {
		this._db = database
		this._db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (
        key TEXT PRIMARY KEY,
        data BLOB NOT NULL
    ) WITHOUT ROWID, STRICT;`)
		this._db.exec(`CREATE INDEX idx ON ${tableName}(key);`)

		this._load_stmt = this._db.prepare(`SELECT data FROM ${tableName} WHERE key = ?;`)
		this._save_stmt = this._db.prepare(`INSERT INTO ${tableName} VALUES (?, ?);`)
		this._remove_stmt = this._db.prepare(`DELETE FROM ${tableName} WHERE key = ?;`)
		this._loadRange_stmt = this._db.prepare(`SELECT * FROM ${tableName} WHERE key GLOB ?;`)
		this._removeRange_stmt = this._db.prepare(`DELETE FROM ${tableName} WHERE key GLOB ?;`)
	}

	async load(keyArray: StorageKey): Promise<Uint8Array | undefined> {
		const key = this._keyToString(keyArray)
		const result = this._load_stmt.get(key) as { key: string; data: Uint8Array } | undefined
		if (!result) {
			return undefined
		}
		return bufferToUint8Array(result.data as Buffer)
	}

	async save(keyArray: StorageKey, binary: Uint8Array): Promise<void> {
		const key = this._keyToString(keyArray)
		try {
			this._save_stmt.run(key, binary)
		} catch (error: unknown) {
			if (error instanceof SqliteError) {
				await this.remove(keyArray)
				this._save_stmt.run(key, binary)
			} else {
				throw error
			}
		}
	}

	async remove(keyArray: string[]): Promise<void> {
		const key = this._keyToString(keyArray)
		this._remove_stmt.run(key)
	}

	async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
		const prefix = this._keyToString(keyPrefix)
		const result = this._loadRange_stmt.all(`${prefix}*`) as Array<{
			key: string
			data: Buffer
		}>

		const length = result.length
		const converted: Chunk[] = Array.from({ length })
		for (let index = 0; index < length; index++) {
			const x = result[index]
			converted[index] = {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				key: this._stringToKey(x!.key),
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				data: bufferToUint8Array(x!.data),
			}
		}

		return converted
	}

	async removeRange(keyPrefix: string[]): Promise<void> {
		const prefix = this._keyToString(keyPrefix)
		this._removeRange_stmt.run(`${prefix}*`)
	}

	_keyToString(key: StorageKey): string {
		return key.join(_SEP)
	}

	_stringToKey(key: string): StorageKey {
		return key.split(_SEP)
	}
}
