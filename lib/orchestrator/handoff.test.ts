import { describe, expect, it } from "vitest"
import { summarizeForHandoff, routeIncludesDesign } from "@/lib/orchestrator/handoff"

describe("handoff", () => {
  it("não corta textos curtos", () => {
    const text = "Entrega: login pronto."
    expect(summarizeForHandoff(text)).toBe(text)
  })

  it("resume textos longos", () => {
    const long = "A".repeat(2000)
    const out = summarizeForHandoff(long, 700)
    expect(out.length).toBeLessThan(long.length)
    expect(out).toContain("[…]")
  })

  it("detecta design na rota", () => {
    expect(routeIncludesDesign([{ sectorId: "engineering" }, { sectorId: "design" }])).toBe(true)
    expect(routeIncludesDesign([{ sectorId: "data" }])).toBe(false)
  })
})
