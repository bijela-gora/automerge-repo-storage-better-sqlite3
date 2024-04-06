import { describe, onTestFinished } from 'vitest'
import { runStorageAdapterTests, SetupFn } from '@automerge/automerge-repo/dist/helpers/tests/storage-adapter-tests.js'
import DatabaseInstance from 'better-sqlite3'
import { BetterSqlite3StorageAdapter } from './better-sqlite3-storage-adapter.js'

const setup: SetupFn = async () => {
	const database = new DatabaseInstance(':memory:')
	onTestFinished(() => {
		database.close()
	})

	const adapter = new BetterSqlite3StorageAdapter(database)

	return { adapter }
}

describe('BetterSqlite3StorageAdapter', () => {
	runStorageAdapterTests(setup)
})
