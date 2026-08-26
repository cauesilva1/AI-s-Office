import { describe, expect, it } from "vitest"
import { resolveMediaModel, enrichImagePrompt } from "@/lib/ai/mediaGenerate"

describe("resolveMediaModel", () => {
  it("HF usa FLUX quando o agente ainda tem modelo OpenRouter", async () => {
    const model = await resolveMediaModel(
      "huggingface",
      "image",
      "bytedance-seed/seedream-5-0-lite",
    )
    expect(model).toBe("black-forest-labs/FLUX.1-schnell")
  })

  it("HF respeita FLUX explícito", async () => {
    const model = await resolveMediaModel(
      "huggingface",
      "image",
      "black-forest-labs/FLUX.1-dev",
    )
    expect(model).toBe("black-forest-labs/FLUX.1-dev")
  })
})

describe("enrichImagePrompt", () => {
  it("reescreve Homem-Aranha para evitar imagem preta por IP", () => {
    const out = enrichImagePrompt(
      "Crie um desing para uma publicidade da fanta com o homem aranha com uma garafa na mao",
    )
    expect(out.toLowerCase()).not.toMatch(/homem[- ]?aranha|spiderman/)
    expect(out.toLowerCase()).toMatch(/spider-themed|advertising/)
  })
})
