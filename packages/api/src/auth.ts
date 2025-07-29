import { Hono } from "hono"
import type { Context, Next } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { sign, verify } from "jsonwebtoken"
import { hash, compare } from "bcryptjs"
import { db } from "./db"
import { users } from "./db/schema"
import { eq } from "drizzle-orm"
import { JWT_SECRET } from "./config"

export interface AuthContext extends Context {
  user?: {
    userId: number
    username: string
  }
}

export const authMiddleware = async (c: AuthContext, next: Next) => {
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

export const createAuthRoutes = (database = db) =>
  new Hono()
    .post(
      "/register",
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
          const existingUser = await database.select().from(users).where(eq(users.username, username)).limit(1)
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
          const [user] = await database
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

        let token: string
        try {
          token = sign({ userId: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: "7d" })
        } catch (error) {
          return c.json({ error: "Token generation failed" }, 500)
        }

        const { passwordHash: _, ...userWithoutPassword } = newUser
        return c.json({ user: userWithoutPassword, token }, 201)
      },
    )
    .post(
      "/login",
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
          const [foundUser] = await database.select().from(users).where(eq(users.username, username)).limit(1)
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

        let token: string
        try {
          token = sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" })
        } catch (error) {
          return c.json({ error: "Token generation failed" }, 500)
        }

        const { passwordHash: _, ...userWithoutPassword } = user
        return c.json({ user: userWithoutPassword, token })
      },
    )

export const authRoutes = createAuthRoutes()

export type AuthRoutes = typeof authRoutes
