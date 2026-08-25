import { describe, expect, it } from "vitest"
import { detectMediaModality, isMediaModality, looksLikeImageRequest } from "@/lib/ai/mediaModality"

describe("detectMediaModality", () => {
  it("detects image intents", () => {
    expect(detectMediaModality("crie uma imagem de uma flor na tempestade")).toBe("image")
    expect(detectMediaModality("gerar foto do produto")).toBe("image")
  })

  it("detects video intents", () => {
    expect(detectMediaModality("faça um vídeo de um carro na estrada")).toBe("video")
    expect(detectMediaModality("clip animado para tiktok")).toBe("video")
  })

  it("detects audio intents", () => {
    expect(detectMediaModality("gerar trilha sonora épica")).toBe("audio")
    expect(detectMediaModality("narração em português")).toBe("audio")
  })

  it("defaults to text for code tasks", () => {
    expect(detectMediaModality("refatore o endpoint de auth")).toBe("text")
  })
})

describe("isMediaModality", () => {
  it("flags non-text modalities", () => {
    expect(isMediaModality("image")).toBe(true)
    expect(isMediaModality("text")).toBe(false)
  })
})

describe("looksLikeImageRequest", () => {
  it("remains compatible alias", () => {
    expect(looksLikeImageRequest("quero uma imagem de flor")).toBe(true)
    expect(looksLikeImageRequest("faça um vídeo")).toBe(false)
  })
})
