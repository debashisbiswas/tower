import { join } from "path"
import { homedir } from "os"
import { createClient, type ApiClient } from "@tower/api/src/client"

interface AuthData {
  accessToken: string
  refreshToken: string
  username: string
  expiresAt: string
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

const getAuthDir = () => join(homedir(), ".tower", ".auth")
const getAuthFilePath = () => join(getAuthDir(), "tokens.json")

export namespace Auth {
  export const getStoredAuth = async (): Promise<AuthData | null> => {
    try {
      const authFile = Bun.file(getAuthFilePath())
      const exists = await authFile.exists()
      if (!exists) {
        return null
      }

      const content = await authFile.text()
      return JSON.parse(content) as AuthData
    } catch (error) {
      return null
    }
  }

  export const storeAuth = async (tokens: AuthTokens, username: string): Promise<void> => {
    const authDir = getAuthDir()
    const authFilePath = getAuthFilePath()

    // Create auth directory if it doesn't exist
    const dirExists = await Bun.file(authDir).exists()
    if (!dirExists) {
      Bun.spawnSync(["mkdir", "-p", authDir])
    }

    const authData: AuthData = {
      ...tokens,
      username,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
    }

    // Write auth data to file
    await Bun.write(authFilePath, JSON.stringify(authData, null, 2))

    // Set file permissions to 600 (owner read/write only)
    Bun.spawnSync(["chmod", "600", authFilePath])
  }

  export const clearAuth = async (): Promise<void> => {
    try {
      const authFilePath = getAuthFilePath()
      const exists = await Bun.file(authFilePath).exists()
      if (exists) {
        Bun.spawnSync(["rm", authFilePath])
      }
    } catch (error) {
      // Ignore errors when clearing auth
    }
  }

  export const isLoggedIn = async (): Promise<boolean> => {
    const auth = await getStoredAuth()
    if (!auth) return false

    // Check if access token is expired
    const expiresAt = new Date(auth.expiresAt)
    return expiresAt > new Date()
  }

  export const getCurrentUser = async (): Promise<string | null> => {
    const auth = await getStoredAuth()
    return auth?.username || null
  }

  export const login = async (username: string, password: string): Promise<void> => {
    try {
      const apiClient: ApiClient = createClient("http://localhost:3000")

      const response = await apiClient.auth.login.$post({
        json: { username, password },
      })

      if (!response.ok) {
        try {
          const error = await response.json()
          throw new Error("error" in error ? error.error : "Login failed")
        } catch {
          throw new Error(`Login failed with status ${response.status}`)
        }
      }

      const data = await response.json()
      if (!("accessToken" in data)) {
        throw new Error("Invalid response from server")
      }

      await storeAuth(
        {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        },
        username,
      )
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error("Network error - is the API server running?")
    }
  }

  export const register = async (username: string, password: string): Promise<void> => {
    try {
      const apiClient: ApiClient = createClient("http://localhost:3000")

      const response = await apiClient.auth.register.$post({
        json: { username, password },
      })

      if (!response.ok) {
        try {
          const error = await response.json()
          throw new Error("error" in error ? error.error : "Registration failed")
        } catch {
          throw new Error(`Registration failed with status ${response.status}`)
        }
      }

      const data = await response.json()
      if (!("accessToken" in data)) {
        throw new Error("Invalid response from server")
      }

      await storeAuth(
        {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        },
        username,
      )
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error("Network error - is the API server running?")
    }
  }

  export const logout = async (): Promise<void> => {
    const auth = await getStoredAuth()
    if (!auth) {
      return // Already logged out
    }

    try {
      const apiClient: ApiClient = createClient("http://localhost:3000")
      await apiClient.auth.logout.$post({
        json: { refreshToken: auth.refreshToken },
      })
    } catch (error) {
      // Continue with local logout even if API call fails
    }

    await clearAuth()
  }
}
