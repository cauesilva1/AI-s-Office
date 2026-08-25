import { describe, expect, it } from "vitest"
import { parseRouterResponse, resolveRouterBackend } from "@/lib/ai/routerConfig"

describe("routerConfig", () => {
  it("resolve server key flag", () => {
    const b = resolveRouterBackend({ activeProvider: "openrouter", serverHasKey: true })
    expect(b?.provider).toBe("openrouter")
  })

  it("parseia JSON com markdown", () => {
    const raw = '```json\n{"sectorId":"engineering","pipeline":["research","engineering"],"confidence":0.8,"reason":"codigo"}\n```'
    const p = parseRouterResponse(raw)
    expect(p?.pipeline).toEqual(["research", "engineering"])
  })
})
