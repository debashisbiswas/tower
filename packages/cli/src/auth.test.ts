import { test, expect, beforeEach, afterEach } from "bun:test"
import { join } from "path"
import { tmpdir } from "os"

// Create a test-specific auth module that we can control
const createTestAuthDir = () => join(tmpdir(), "tower-auth-test", Math.random().toString(36))

// Simple auth functions for testing (without the namespace)
const createTestAuth = (testDir: string) => {
  const getAuthDir = () => join(testDir, ".tower", ".auth")
  const getAuthFilePath = () => join(getAuthDir(), "tokens.json")

  return {
    async getStoredAuth() {
      try {
        const authFile = Bun.file(getAuthFilePath())
        const exists = await authFile.exists()
        if (!exists) {
          return null
        }

        const content = await authFile.text()
        return JSON.parse(content)
      } catch (error) {
        return null
      }
    },

    async storeAuth(tokens: { accessToken: string; refreshToken: string }, username: string) {
      const authDir = getAuthDir()
      const authFilePath = getAuthFilePath()

      // Create auth directory if it doesn't exist
      const dirExists = await Bun.file(authDir).exists()
      if (!dirExists) {
        Bun.spawnSync(["mkdir", "-p", authDir])
      }

      const authData = {
        ...tokens,
        username,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      }

      // Write auth data to file
      await Bun.write(authFilePath, JSON.stringify(authData, null, 2))

      // Set file permissions to 600 (owner read/write only)
      Bun.spawnSync(["chmod", "600", authFilePath])
    },

    async clearAuth() {
      try {
        const authFilePath = getAuthFilePath()
        const exists = await Bun.file(authFilePath).exists()
        if (exists) {
          Bun.spawnSync(["rm", authFilePath])
        }
      } catch (error) {
        // Ignore errors when clearing auth
      }
    },

    async isLoggedIn() {
      const auth = await this.getStoredAuth()
      if (!auth) return false

      // Check if access token is expired
      const expiresAt = new Date(auth.expiresAt)
      return expiresAt > new Date()
    },

    async getCurrentUser() {
      const auth = await this.getStoredAuth()
      return auth?.username || null
    },
  }
}

let testDir: string
let testAuth: ReturnType<typeof createTestAuth>

beforeEach(() => {
  testDir = createTestAuthDir()
  testAuth = createTestAuth(testDir)
})

afterEach(() => {
  // Clean up test directory
  try {
    Bun.spawnSync(["rm", "-rf", testDir])
  } catch (error) {
    // Ignore cleanup errors
  }
})

// Storage tests
test("getStoredAuth returns null when no auth file exists", async () => {
  const auth = await testAuth.getStoredAuth()
  expect(auth).toBeNull()
})

test("storeAuth creates auth file with correct data", async () => {
  const tokens = {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
  }
  const username = "testuser"

  await testAuth.storeAuth(tokens, username)

  const storedAuth = await testAuth.getStoredAuth()
  expect(storedAuth).not.toBeNull()
  expect(storedAuth?.accessToken).toBe(tokens.accessToken)
  expect(storedAuth?.refreshToken).toBe(tokens.refreshToken)
  expect(storedAuth?.username).toBe(username)
  expect(storedAuth?.expiresAt).toBeDefined()
})

test("storeAuth creates auth directory if it doesn't exist", async () => {
  const tokens = {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
  }

  await testAuth.storeAuth(tokens, "testuser")

  const authFile = join(testDir, ".tower", ".auth", "tokens.json")
  const fileExists = await Bun.file(authFile).exists()
  expect(fileExists).toBe(true)
})

test("clearAuth removes auth file", async () => {
  const tokens = {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
  }

  await testAuth.storeAuth(tokens, "testuser")
  expect(await testAuth.getStoredAuth()).not.toBeNull()

  await testAuth.clearAuth()
  expect(await testAuth.getStoredAuth()).toBeNull()
})

test("clearAuth handles missing file gracefully", async () => {
  // Should not throw when no auth file exists
  expect(async () => await testAuth.clearAuth()).not.toThrow()
})

// State tests
test("isLoggedIn returns false when not authenticated", async () => {
  const loggedIn = await testAuth.isLoggedIn()
  expect(loggedIn).toBe(false)
})

test("isLoggedIn returns true when authenticated with valid token", async () => {
  const tokens = {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
  }

  await testAuth.storeAuth(tokens, "testuser")
  const loggedIn = await testAuth.isLoggedIn()
  expect(loggedIn).toBe(true)
})

test("isLoggedIn returns false when token is expired", async () => {
  // Create auth directory first
  const authDir = join(testDir, ".tower", ".auth")
  const authFile = join(authDir, "tokens.json")
  Bun.spawnSync(["mkdir", "-p", authDir])

  // Create expired auth data directly
  const expiredAuthData = {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    username: "testuser",
    expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
  }

  await Bun.write(authFile, JSON.stringify(expiredAuthData, null, 2))

  const loggedIn = await testAuth.isLoggedIn()
  expect(loggedIn).toBe(false)
})

test("getCurrentUser returns null when not authenticated", async () => {
  const user = await testAuth.getCurrentUser()
  expect(user).toBeNull()
})

test("getCurrentUser returns stored username when authenticated", async () => {
  const tokens = {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
  }
  const username = "testuser"

  await testAuth.storeAuth(tokens, username)
  const user = await testAuth.getCurrentUser()
  expect(user).toBe(username)
})

// Error handling tests
test("getStoredAuth handles corrupted auth file gracefully", async () => {
  const authDir = join(testDir, ".tower", ".auth")
  const authFile = join(authDir, "tokens.json")

  // Create directory and write invalid JSON
  Bun.spawnSync(["mkdir", "-p", authDir])
  await Bun.write(authFile, "invalid json content")

  const auth = await testAuth.getStoredAuth()
  expect(auth).toBeNull()
})

test("getCurrentUser handles corrupted auth file gracefully", async () => {
  const authDir = join(testDir, ".tower", ".auth")
  const authFile = join(authDir, "tokens.json")

  // Create directory and write invalid JSON
  Bun.spawnSync(["mkdir", "-p", authDir])
  await Bun.write(authFile, "invalid json content")

  const user = await testAuth.getCurrentUser()
  expect(user).toBeNull()
})

test("isLoggedIn handles corrupted auth file gracefully", async () => {
  const authDir = join(testDir, ".tower", ".auth")
  const authFile = join(authDir, "tokens.json")

  // Create directory and write invalid JSON
  Bun.spawnSync(["mkdir", "-p", authDir])
  await Bun.write(authFile, "invalid json content")

  const loggedIn = await testAuth.isLoggedIn()
  expect(loggedIn).toBe(false)
})
