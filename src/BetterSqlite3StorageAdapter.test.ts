import {describe, onTestFinished} from "vitest"
import {
    runStorageAdapterTests,
    SetupFn
} from '@automerge/automerge-repo/dist/helpers/tests/storage-adapter-tests'
import DatabaseInstance from "better-sqlite3"
import {BetterSqlite3StorageAdapter} from "./BetterSqlite3StorageAdapter.js";

describe("BetterSqlite3StorageAdapter", () => {
    const setup: SetupFn = async () => {
        const db = new DatabaseInstance(":memory:");
        onTestFinished(() => {
            db.close()
        })

        const adapter = new BetterSqlite3StorageAdapter(db);

        return { adapter }
    }

    runStorageAdapterTests(setup)
})
