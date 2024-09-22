import { DatabaseSync, StatementSync } from 'node:sqlite'

import type { Chunk, StorageAdapterInterface, StorageKey } from '@automerge/automerge-repo'

const _SEP = '.'

export class NodeSqliteStorageAdapter implements StorageAdapterInterface {
	_db: DatabaseSync

	_load_stmt: StatementSync
	_save_stmt: StatementSync
	_remove_stmt: StatementSync
	_loadRange_stmt: StatementSync
	_removeRange_stmt: StatementSync

	constructor(database: DatabaseSync, tableName: string = '`automerge_repo_data`') {
		this._db = database
		const KEY_PROP_NAME = '`key`'
		const DATA_PROP_NAME = '`data`'

		this._db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (
        ${KEY_PROP_NAME} TEXT PRIMARY KEY,
        ${DATA_PROP_NAME} BLOB NOT NULL
    ), STRICT;`)
		this._db.exec(`CREATE INDEX idx ON ${tableName}(${KEY_PROP_NAME});`)

		this._load_stmt = this._db.prepare(`SELECT ${DATA_PROP_NAME} FROM ${tableName} WHERE ${KEY_PROP_NAME} = ?;`)
		this._save_stmt = this._db.prepare(`INSERT OR REPLACE INTO ${tableName} VALUES (?, ?);`)
		this._remove_stmt = this._db.prepare(`DELETE FROM ${tableName} WHERE ${KEY_PROP_NAME} = ?;`)
		this._loadRange_stmt = this._db.prepare(
			`SELECT * FROM ${tableName} WHERE ${KEY_PROP_NAME} GLOB ? ORDER BY rowid;`,
		) // TODO: find out should we order or not
		this._removeRange_stmt = this._db.prepare(`DELETE FROM ${tableName} WHERE ${KEY_PROP_NAME} GLOB ?;`)
	}

	async load(keyArray: StorageKey): Promise<Uint8Array | undefined> {
		const key = this._keyToString(keyArray)
		const result = this._load_stmt.get(key) as { key: string; data: Uint8Array } | undefined
		if (!result) {
			return undefined
		}
		return result.data
	}

	async save(keyArray: StorageKey, binary: Uint8Array): Promise<void> {
		const key = this._keyToString(keyArray)
		this._save_stmt.run(key, binary)
	}

	async remove(keyArray: string[]): Promise<void> {
		const key = this._keyToString(keyArray)
		this._remove_stmt.run(key)
	}

	async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
		const prefix = this._keyToString(keyPrefix)
		const result = this._loadRange_stmt.all(`${prefix}*`) as Array<{
			key: string
			data: Uint8Array
		}>

		const length = result.length
		const converted: Chunk[] = Array.from({ length })
		for (let index = 0; index < length; index++) {
			const x = result[index]
			converted[index] = {
				key: this._stringToKey(x!.key),
				data: x!.data,
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
