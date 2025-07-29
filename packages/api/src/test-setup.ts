import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { Database } from "bun:sqlite"
import * as schema from "./db/schema"
import { users } from "./db/schema"

const testSqlite = new Database(":memory:")
export const testDb = drizzle(testSqlite, { schema })

export const setupTestDb = () => {
  migrate(testDb, { migrationsFolder: "./packages/api/src/db/migrations" })
}

export const cleanupTestDb = () => {
  testDb.delete(users)
}
