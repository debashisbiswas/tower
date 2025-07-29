import { test, expect, beforeAll, beforeEach } from "bun:test"
import { Hono } from "hono"
import { testClient } from "hono/testing"
import { sign } from "jsonwebtoken"
import { createAuthRoutes, authMiddleware, type AuthContext } from "./auth"
import { setupTestDb, cleanupTestDb, testDb } from "./test-setup"

import { JWT_SECRET } from "./config"

const testAuthRoutes = createAuthRoutes(testDb)
const app = new Hono().route("/auth", testAuthRoutes)
const client = testClient(app)

beforeAll(() => {
  setupTestDb()
})

beforeEach(() => {
  cleanupTestDb()
})

test("POST /auth/register creates new user", async () => {
  const res = await client.auth.register.$post({
    json: {
      username: "testuser",
      password: "password123",
    },
  })

  expect(res.status).toBe(201)
  const body = await res.json()
  expect(body).toMatchObject({
    user: { username: "testuser" },
    token: expect.any(String),
  })
})

test("POST /auth/register validates input with Zod", async () => {
  const res = await client.auth.register.$post({
    json: {
      username: "ab", // too short
      password: "123", // too short
    },
  })

  expect(res.status).toBe(400)
})

test("POST /auth/register rejects duplicate username", async () => {
  await client.auth.register.$post({
    json: {
      username: "testuser",
      password: "password123",
    },
  })

  const res = await client.auth.register.$post({
    json: {
      username: "testuser",
      password: "password123",
    },
  })

  expect(res.status).toBe(400)
})

test("POST /auth/login authenticates valid user", async () => {
  await client.auth.register.$post({
    json: {
      username: "testuser",
      password: "password123",
    },
  })

  const res = await client.auth.login.$post({
    json: {
      username: "testuser",
      password: "password123",
    },
  })

  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body).toMatchObject({
    user: { username: "testuser" },
    token: expect.any(String),
  })
})

test("POST /auth/login validates input with Zod", async () => {
  const res = await client.auth.login.$post({
    json: {
      username: "ab", // too short
      password: "", // empty
    },
  })

  expect(res.status).toBe(400)
})

test("POST /auth/login rejects invalid credentials", async () => {
  await client.auth.register.$post({
    json: {
      username: "testuser",
      password: "password123",
    },
  })

  const res = await client.auth.login.$post({
    json: {
      username: "testuser",
      password: "wrongpassword",
    },
  })

  expect(res.status).toBe(401)
})

test("authMiddleware allows valid JWT token", async () => {
  const protectedApp = new Hono().get("/protected", authMiddleware, (c: AuthContext) => {
    return c.json({ user: c.user })
  })
  const protectedClient = testClient(protectedApp)

  const token = sign({ userId: 1, username: "testuser" }, JWT_SECRET, { expiresIn: "1h" })
  const res = await protectedClient.protected.$get(
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )

  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.user?.userId).toBe(1)
  expect(body.user?.username).toBe("testuser")
})

test("authMiddleware rejects missing token", async () => {
  const protectedApp = new Hono().get("/protected", authMiddleware, (c: AuthContext) => {
    return c.json({ user: c.user })
  })
  const protectedClient = testClient(protectedApp)

  const res = await protectedClient.protected.$get()
  expect(res.status).toBe(401)
})
