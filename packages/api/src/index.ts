import { Hono, type Context, type Next } from "hono"
import { zValidator } from "@hono/zod-validator"
import z from "zod"
import { users, refreshTokens } from "./db/schema"
import { eq } from "drizzle-orm"
import { hash, compare } from "bcryptjs"
import { randomUUID } from "crypto"
import { sign } from "jsonwebtoken"
import { db } from "./db"
import { JWT_SECRET } from "./config"
import { verify } from "jsonwebtoken"

const generateRefreshToken = () => randomUUID()

const generateTokens = (userId: number, username: string, clock = () => new Date()) => {
  const accessToken = sign({ userId, username }, JWT_SECRET, { expiresIn: "15m" })
  const refreshToken = generateRefreshToken()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  const refreshTokenExpiresAt = new Date(clock().getTime() + sevenDays)
  return { accessToken, refreshToken, refreshTokenExpiresAt }
}

interface AuthContext extends Context {
  user?: {
    userId: number
    username: string
  }
}

const authMiddleware = async (c: AuthContext, next: Next) => {
  const authHeader = c.req.header("Authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Authorization token required" }, 401)
  }

  const token = authHeader.substring(7)

  try {
    const decoded = verify(token, JWT_SECRET) as { userId: number; username: string }
    c.user = decoded
    await next()
  } catch (error) {
    return c.json({ error: "Invalid or expired token" }, 401)
  }
}

const app = new Hono()
  .get("/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() })
  })
  .post(
    "/auth/register",
    zValidator(
      "json",
      z.object({
        username: z.string().min(3).max(50),
        password: z.string().min(6),
      }),
    ),
    async (c) => {
      const { username, password } = c.req.valid("json")

      try {
        const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1)
        if (existingUser.length > 0) {
          return c.json({ error: "Username already exists" }, 400)
        }
      } catch (error) {
        return c.json({ error: "Database error" }, 500)
      }

      let passwordHash: string
      try {
        passwordHash = await hash(password, 10)
      } catch (error) {
        return c.json({ error: "Password hashing failed" }, 500)
      }

      let newUser
      try {
        const [user] = await db
          .insert(users)
          .values({
            username,
            passwordHash,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning()
        newUser = user
      } catch (error) {
        return c.json({ error: "Failed to create user" }, 500)
      }

      if (!newUser) {
        return c.json({ error: "Failed to create user" }, 500)
      }

      let tokens
      try {
        tokens = generateTokens(newUser.id, newUser.username)
      } catch (error) {
        return c.json({ error: "Token generation failed" }, 500)
      }

      // Store refresh token in database
      try {
        await db.insert(refreshTokens).values({
          userId: newUser.id,
          token: tokens.refreshToken,
          expiresAt: tokens.refreshTokenExpiresAt,
        })
      } catch (error) {
        return c.json({ error: "Failed to store refresh token" }, 500)
      }

      return c.json(
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        201,
      )
    },
  )
  .post(
    "/auth/login",
    zValidator(
      "json",
      z.object({
        username: z.string().min(3).max(50),
        password: z.string().min(1),
      }),
    ),
    async (c) => {
      const { username, password } = c.req.valid("json")

      let user
      try {
        const [foundUser] = await db.select().from(users).where(eq(users.username, username)).limit(1)
        user = foundUser
      } catch (error) {
        return c.json({ error: "Database error" }, 500)
      }

      if (!user) {
        return c.json({ error: "Invalid credentials" }, 401)
      }

      let isValidPassword: boolean
      try {
        isValidPassword = await compare(password, user.passwordHash)
      } catch (error) {
        return c.json({ error: "Password verification failed" }, 500)
      }

      if (!isValidPassword) {
        return c.json({ error: "Invalid credentials" }, 401)
      }

      let tokens
      try {
        tokens = generateTokens(user.id, user.username)
      } catch (error) {
        return c.json({ error: "Token generation failed" }, 500)
      }

      // Store refresh token in database
      try {
        await db.insert(refreshTokens).values({
          userId: user.id,
          token: tokens.refreshToken,
          expiresAt: tokens.refreshTokenExpiresAt,
        })
      } catch (error) {
        return c.json({ error: "Failed to store refresh token" }, 500)
      }

      return c.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      })
    },
  )
  .post(
    "/auth/refresh",
    zValidator(
      "json",
      z.object({
        refreshToken: z.string(),
      }),
    ),
    async (c) => {
      const { refreshToken } = c.req.valid("json")

      // Find refresh token in database
      let tokenRecord
      try {
        const [foundToken] = await db
          .select({
            id: refreshTokens.id,
            userId: refreshTokens.userId,
            expiresAt: refreshTokens.expiresAt,
            username: users.username,
          })
          .from(refreshTokens)
          .innerJoin(users, eq(refreshTokens.userId, users.id))
          .where(eq(refreshTokens.token, refreshToken))
          .limit(1)
        tokenRecord = foundToken
      } catch (error) {
        return c.json({ error: "Database error" }, 500)
      }

      if (!tokenRecord) {
        return c.json({ error: "Invalid refresh token" }, 401)
      }

      // Check if refresh token is expired
      if (tokenRecord.expiresAt < new Date()) {
        return c.json({ error: "Refresh token expired" }, 401)
      }

      // Generate new tokens
      let tokens
      try {
        tokens = generateTokens(tokenRecord.userId, tokenRecord.username)
      } catch (error) {
        return c.json({ error: "Token generation failed" }, 500)
      }

      // Replace old refresh token with new one
      try {
        await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id))
        await db.insert(refreshTokens).values({
          userId: tokenRecord.userId,
          token: tokens.refreshToken,
          expiresAt: tokens.refreshTokenExpiresAt,
        })
      } catch (error) {
        return c.json({ error: "Failed to update refresh token" }, 500)
      }

      return c.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      })
    },
  )
  .post(
    "/auth/logout",
    zValidator(
      "json",
      z.object({
        refreshToken: z.string(),
      }),
    ),
    async (c) => {
      const { refreshToken } = c.req.valid("json")

      try {
        await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken))
      } catch (error) {
        return c.json({ error: "Database error" }, 500)
      }

      return c.json({ message: "Logged out successfully" })
    },
  )
  .get("/protected", authMiddleware, (c: AuthContext) => {
    return c.json({ message: "Protected route accessed", user: c.user })
  })

export default app

export type AppType = typeof app

export { generateTokens }
