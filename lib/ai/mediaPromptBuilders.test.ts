import { describe, expect, it } from "vitest"
import { compareImageModels, enrichImagePrompt } from "@/lib/ai/mediaPromptBuilders"

describe("mediaPromptBuilders", () => {
  it("reescreve homem-aranha no prompt", () => {
    expect(enrichImagePrompt("anúncio Fanta com homem-aranha")).not.toMatch(/homem-aranha/i)
  })

  it("retorna pares de compare por provedor", () => {
    expect(compareImageModels("huggingface")?.[0]).toContain("FLUX")
    expect(compareImageModels("openrouter")).toHaveLength(2)
    expect(compareImageModels("nvidia")).toBeNull()
  })
})
