import { onTestFinished } from 'vitest'
import { runStorageAdapterTests, SetupFn } from '@automerge/automerge-repo/helpers/tests/storage-adapter-tests.js'
import DatabaseInstance from 'better-sqlite3'
import { BetterSqlite3StorageAdapter } from './better-sqlite3-storage-adapter.js'

const setup: SetupFn = async () => {
	const database = new DatabaseInstance(':memory:')
	const teardown = () => {
		database.close()
	}

	const adapter = new BetterSqlite3StorageAdapter(database)

	return { adapter, teardown }
}

runStorageAdapterTests(setup, 'BetterSqlite3StorageAdapter')
