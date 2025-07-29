import { test, expect } from "bun:test"
import { createClient } from "./client"

test("createClient returns typed client", () => {
  const client = createClient("http://localhost:3000")

  expect(client).toBeDefined()
  expect(client.auth).toBeDefined()
  expect(client.health).toBeDefined()
  expect(client.protected).toBeDefined()
})
