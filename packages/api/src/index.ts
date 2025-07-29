import { Hono } from "hono"

const app = new Hono()

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() })
})

const port = process.env.PORT || 3000

export default {
  port,
  fetch: app.fetch,
}
