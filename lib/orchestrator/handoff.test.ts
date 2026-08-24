import { describe, expect, it } from "vitest"
import { looksLikeImageRequest, routeIncludesDesign, summarizeForHandoff } from "@/lib/orchestrator/handoff"

describe("summarizeForHandoff", () => {
  it("preserves short text", () => {
    expect(summarizeForHandoff("oi")).toBe("oi")
  })

  it("truncates long text with marker", () => {
    const long = "a".repeat(2000)
    const out = summarizeForHandoff(long, 100)
    expect(out.length).toBeLessThan(long.length)
    expect(out).toContain("[…]")
  })
})

describe("routeIncludesDesign", () => {
  it("detects design in route", () => {
    expect(routeIncludesDesign([{ sectorId: "engineering" }, { sectorId: "design" }])).toBe(true)
    expect(routeIncludesDesign([{ sectorId: "data" }])).toBe(false)
  })
})

describe("looksLikeImageRequest", () => {
  it("detects image intents", () => {
    expect(looksLikeImageRequest("quero que voce crie uma imagem de uma flor")).toBe(true)
    expect(looksLikeImageRequest("refatore o endpoint de auth")).toBe(false)
  })
})
