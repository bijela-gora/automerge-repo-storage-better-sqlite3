import * as sqlite from 'node:sqlite'

import { runStorageAdapterTests } from './test-suite.ts'
import { NodeSqliteStorageAdapter } from './node-sqlite-storage-adapter.ts'

const setup = async () => {
	const database = new sqlite.DatabaseSync(':memory:')
	const teardown = () => database.close()
	const adapter = new NodeSqliteStorageAdapter(database)

	return { adapter, teardown }
}

runStorageAdapterTests(setup, 'NodeSqliteStorageAdapter')
