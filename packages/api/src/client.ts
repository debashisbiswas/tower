import { hc } from "hono/client"
import type { AppType } from "./index"

export const createClient = (baseUrl: string) => {
  return hc<AppType>(baseUrl)
}

export type ApiClient = ReturnType<typeof createClient>
