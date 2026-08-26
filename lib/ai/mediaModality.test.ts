import { describe, expect, it } from "vitest"
import {
  detectMediaModality,
  isMediaModality,
  looksLikeImageRequest,
  looksLikeVisualCreativeRequest,
} from "@/lib/ai/mediaModality"

const FANTA_AD =
  "Crie um desing para uma publicidade da fanta que irei fazer com o homem aranha com uma garafa na mao"

describe("detectMediaModality", () => {
  it("detects image intents", () => {
    expect(detectMediaModality("crie uma imagem de uma flor na tempestade")).toBe("image")
    expect(detectMediaModality("gerar foto do produto")).toBe("image")
  })

  it("detects design/publicidade as image deliverable", () => {
    expect(detectMediaModality(FANTA_AD)).toBe("image")
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

describe("looksLikeVisualCreativeRequest", () => {
  it("flags Fanta Spider-Man ad as design", () => {
    expect(looksLikeVisualCreativeRequest(FANTA_AD)).toBe(true)
  })

  it("ignores pure engineering", () => {
    expect(looksLikeVisualCreativeRequest("refatore o endpoint de auth")).toBe(false)
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
