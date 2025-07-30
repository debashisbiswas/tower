import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import * as schema from "./schema"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"

const isTestEnv = Bun.env.NODE_ENV === "test"

const sqlite = new Database(isTestEnv ? ":memory:" : "./tower.db")
const db = drizzle(sqlite, { schema })

if (isTestEnv) {
  migrate(db, { migrationsFolder: "./packages/api/src/db/migrations" })
}

export { db }
