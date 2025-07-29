import { Hono } from "hono"
import { authRoutes } from "./auth"
import { authMiddleware, type AuthContext } from "./auth"

const app = new Hono()
  .get("/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() })
  })
  .route("/auth", authRoutes)
  .get("/protected", authMiddleware, (c: AuthContext) => {
    return c.json({ message: "Protected route accessed", user: c.user })
  })

const port = process.env.PORT || 3000

export default {
  port,
  fetch: app.fetch,
}

export type AppType = typeof app
