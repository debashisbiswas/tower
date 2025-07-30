import { test, expect, beforeEach } from "bun:test"
import { testClient } from "hono/testing"
import { db } from "./db"
import app from "./index"
import { users, refreshTokens } from "./db/schema"

const client = testClient(app)

beforeEach(() => {
  db.delete(refreshTokens).execute()
  db.delete(users).execute()
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
    accessToken: expect.any(String),
    refreshToken: expect.any(String),
  })
})

test("POST /auth/register enforces length requirements", async () => {
  const res = await client.auth.register.$post({
    json: {
      username: "ab", // too short
      password: "123", // too short
    },
  })

  expect(res.status).toBe(400)
})

test("POST /auth/register rejects duplicate username", async () => {
  const first = await client.auth.register.$post({
    json: {
      username: "testuser",
      password: "password123",
    },
  })
  expect(first.status).toBe(201)

  const second = await client.auth.register.$post({
    json: {
      username: "testuser",
      password: "password123",
    },
  })

  expect(second.status).toBe(400)
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
    accessToken: expect.any(String),
    refreshToken: expect.any(String),
  })
})

test("POST /auth/login enforces length requirements", async () => {
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

test("Auth allows valid JWT token", async () => {
  // TODO: This is more of an end-to-end test, it would be nice to have a
  // "Token" module and create one for the test
  const registerRes = await client.auth.register.$post({
    json: {
      username: "testuser",
      password: "password123",
    },
  })

  expect(registerRes.status).toBe(201)
  const registerBody = await registerRes.json()

  if ("error" in registerBody) {
    throw new Error("Register failed")
  }

  const token = registerBody.accessToken

  const res = await client.protected.$get(
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )

  expect(res.status).toBe(200)
})

test("Auth rejects missing token", async () => {
  const res = await client.protected.$get()
  expect(res.status).toBe(401)
})

test("POST /auth/refresh generates new tokens with valid refresh token", async () => {
  const registerRes = await client.auth.register.$post({
    json: {
      username: "refreshuser",
      password: "password123",
    },
  })

  expect(registerRes.status).toBe(201)
  const registerBody = await registerRes.json()

  if ("error" in registerBody) {
    throw new Error("Register failed")
  }

  const refreshToken = registerBody.refreshToken
  expect(refreshToken).toBeDefined()

  const res = await client.auth.refresh.$post({
    json: {
      refreshToken,
    },
  })

  expect(res.status).toBe(200)
  const refreshBody = await res.json()

  if ("error" in refreshBody) {
    throw new Error("Register failed")
  }

  expect(refreshBody).toMatchObject({
    accessToken: expect.any(String),
    refreshToken: expect.any(String),
  })

  // New refresh token should be different
  expect(refreshBody.refreshToken).not.toBe(refreshToken)
})

test("POST /auth/refresh rejects invalid refresh token", async () => {
  const res = await client.auth.refresh.$post({
    json: {
      refreshToken: "invalid-token",
    },
  })

  expect(res.status).toBe(401)
  const body = await res.json()

  if (!("error" in body)) {
    throw new Error("Expected error")
  }
})

test("POST /auth/logout invalidates refresh token", async () => {
  // Register and login to get tokens
  const registerRes = await client.auth.register.$post({
    json: {
      username: "logoutuser",
      password: "password123",
    },
  })
  expect(registerRes.status).toBe(201)
  const registerBody = await registerRes.json()
  if (!("refreshToken" in registerBody)) {
    throw new Error("Expected refreshToken in response")
  }
  const { refreshToken } = registerBody

  // Logout with the refresh token
  const logoutRes = await client.auth.logout.$post({
    json: {
      refreshToken,
    },
  })
  expect(logoutRes.status).toBe(200)
  const logoutBody = await logoutRes.json()
  expect(logoutBody).toMatchObject({
    message: "Logged out successfully",
  })

  // Try to use the refresh token after logout - should fail
  const refreshRes = await client.auth.refresh.$post({
    json: {
      refreshToken,
    },
  })
  expect(refreshRes.status).toBe(401)
})

test("Multiple device login scenario", async () => {
  // Register user
  const registerRes = await client.auth.register.$post({
    json: {
      username: "multiuser",
      password: "password123",
    },
  })
  expect(registerRes.status).toBe(201)
  const registerBody = await registerRes.json()
  if (!("refreshToken" in registerBody)) {
    throw new Error("Expected refreshToken in response")
  }
  const { refreshToken: firstToken } = registerBody

  // Login again (simulating second device)
  const secondLoginRes = await client.auth.login.$post({
    json: {
      username: "multiuser",
      password: "password123",
    },
  })
  expect(secondLoginRes.status).toBe(200)
  const secondLoginBody = await secondLoginRes.json()
  if (!("refreshToken" in secondLoginBody)) {
    throw new Error("Expected refreshToken in response")
  }
  const { refreshToken: secondToken } = secondLoginBody

  // Both tokens should be different
  expect(firstToken).not.toBe(secondToken)

  // Both tokens should work for refresh
  const firstRefreshRes = await client.auth.refresh.$post({
    json: {
      refreshToken: firstToken,
    },
  })
  expect(firstRefreshRes.status).toBe(200)
  const firstRefreshBody = await firstRefreshRes.json()
  if (!("refreshToken" in firstRefreshBody)) {
    throw new Error("Expected refreshToken in response")
  }
  const { refreshToken: rotatedFirstToken } = firstRefreshBody

  const secondRefreshRes = await client.auth.refresh.$post({
    json: {
      refreshToken: secondToken,
    },
  })
  expect(secondRefreshRes.status).toBe(200)
  const secondRefreshBody = await secondRefreshRes.json()
  if (!("refreshToken" in secondRefreshBody)) {
    throw new Error("Expected refreshToken in response")
  }
  const { refreshToken: rotatedSecondToken } = secondRefreshBody

  // Logout first device using the rotated token
  const logoutRes = await client.auth.logout.$post({
    json: {
      refreshToken: rotatedFirstToken,
    },
  })
  expect(logoutRes.status).toBe(200)

  // First token should no longer work
  const firstRefreshAfterLogout = await client.auth.refresh.$post({
    json: {
      refreshToken: rotatedFirstToken,
    },
  })
  expect(firstRefreshAfterLogout.status).toBe(401)

  // Second token should still work
  const secondRefreshAfterFirstLogout = await client.auth.refresh.$post({
    json: {
      refreshToken: rotatedSecondToken,
    },
  })
  expect(secondRefreshAfterFirstLogout.status).toBe(200)
})

test("Token rotation on refresh", async () => {
  // Register and get initial tokens
  const registerRes = await client.auth.register.$post({
    json: {
      username: "rotationuser",
      password: "password123",
    },
  })
  expect(registerRes.status).toBe(201)
  const registerBody = await registerRes.json()
  if (!("refreshToken" in registerBody)) {
    throw new Error("Expected refreshToken in response")
  }
  const { refreshToken: originalToken } = registerBody

  // Refresh to get new tokens
  const refreshRes = await client.auth.refresh.$post({
    json: {
      refreshToken: originalToken,
    },
  })
  expect(refreshRes.status).toBe(200)
  const refreshBody = await refreshRes.json()
  if (!("refreshToken" in refreshBody)) {
    throw new Error("Expected refreshToken in response")
  }
  const { refreshToken: newToken } = refreshBody

  // New token should be different from original
  expect(newToken).not.toBe(originalToken)

  // Original token should no longer work
  const oldTokenRefreshRes = await client.auth.refresh.$post({
    json: {
      refreshToken: originalToken,
    },
  })
  expect(oldTokenRefreshRes.status).toBe(401)

  // New token should work
  const newTokenRefreshRes = await client.auth.refresh.$post({
    json: {
      refreshToken: newToken,
    },
  })
  expect(newTokenRefreshRes.status).toBe(200)
})
