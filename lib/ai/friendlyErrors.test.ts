import { describe, expect, it } from "vitest"
import { formatFriendlyError, friendlyErrorLine } from "@/lib/ai/friendlyErrors"

describe("friendlyErrors", () => {
  it("orienta key inválida", () => {
    const f = formatFriendlyError("API key inválida ou expirada. Verifique em Config.")
    expect(f.hint.toLowerCase()).toMatch(/config|key/)
  })

  it("orienta quota 402", () => {
    const f = formatFriendlyError("Erro (402): insufficient credits")
    expect(f.hint.toLowerCase()).toMatch(/crédit|provedor|gemini|nvidia/)
  })

  it("monta linha com seta", () => {
    expect(friendlyErrorLine("429 rate limit")).toContain("→")
  })
})
