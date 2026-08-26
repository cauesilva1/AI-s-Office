/** Builders de prompt de imagem — separados de generateMedia */

/** Enriquece brief de publicidade e evita bloqueio de IP (imagem preta) */
export function enrichImagePrompt(raw: string): string {
  let p = raw.trim()
  // Personagens protegidos → descrição original (FLUX/fal costuma devolver preto)
  p = p
    .replace(/\bhomem[-\s]?aranha\b/gi, "original red-and-blue spider-themed superhero in athletic suit")
    .replace(/\bspider[-\s]?man\b/gi, "original red-and-blue spider-themed superhero in athletic suit")
    .replace(/\bdesing\b/gi, "design")

  const looksAd = /\b(publicidade|anuncio|propaganda|fanta|garrafa|banner|cartaz)\b/i.test(p)
  if (looksAd) {
    return [
      "Professional advertising key visual, photorealistic, vibrant commercial photography,",
      "soft studio lighting, sharp product focus, high detail, 4k look.",
      p,
      "Orange soda bottle clearly visible in hand, energetic summer mood, clean composition.",
    ].join(" ")
  }
  return `High quality detailed image. ${p}`
}

/** Pares de modelos Design para comparação A/B (mesmo provedor) */
export function compareImageModels(provider: string): [string, string] | null {
  if (provider === "huggingface") {
    return ["black-forest-labs/FLUX.1-schnell", "black-forest-labs/FLUX.1-dev"]
  }
  // OpenRouter: dois slots de imagem do catálogo curado (quando disponíveis)
  if (provider === "openrouter") {
    return ["bytedance-seed/seedream-5-0-lite", "alibaba/wan-3.0"]
  }
  return null
}
