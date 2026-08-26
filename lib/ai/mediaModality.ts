export type MediaModality = "text" | "image" | "video" | "audio"

function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

/**
 * Pedido criativo/visual → setor Design (rede de segurança quando o LLM roteador falha).
 * Não substitui o roteador; só corrige fallbacks óbvios.
 */
export function looksLikeVisualCreativeRequest(text: string): boolean {
  const t = norm(text)
  if (detectMediaModality(text) !== "text") return true

  const asksCreate =
    /\b(crie|cria|criar|faca|faz|gerar|gere|monte|fazer|preciso|quero)\b/.test(t) ||
    /\b(design|desing|arte|visual|layout|mockup)\b/.test(t)

  const visualBrief =
    /\b(design|desing|publicidade|anuncio|propaganda|peca grafica|identidade visual|banner|cartaz|poster|flyer|capa|story|stories)\b/.test(t) ||
    /\b(personagem|mascote|heroi|homem[- ]?aranha|spiderman).{0,60}\b(garrafa|produto|lata|latao)\b/.test(t) ||
    /\b(garrafa|produto|lata).{0,60}\b(mao|maos)\b/.test(t)

  return asksCreate && visualBrief
}

/** Detecta o tipo de entrega pedida pelo usuário */
export function detectMediaModality(text: string): MediaModality {
  const t = norm(text)

  if (
    /\b(video|filme|clip|animacao|animação|mp4|reels|tiktok)\b/.test(t) ||
    /\b(gerar|crie|cria|faca|faz).{0,40}\b(video|clip)\b/.test(t)
  ) {
    return "video"
  }

  if (
    /\b(audio|som|musica|música|trilha|narracao|narração|tts|fala|voz|speech)\b/.test(t) ||
    /\b(gerar|crie).{0,40}\b(audio|som|musica)\b/.test(t)
  ) {
    return "audio"
  }

  if (
    /\b(imagem|image|foto|ilustra|desenho|pintura|wallpaper|banner|mockup|flux|pixel)\b/.test(t) ||
    /\b(gerar|crie|cria|faca|faz).{0,40}\b(img|arte|visual|foto)\b/.test(t) ||
    /\b(png|jpg|jpeg|webp)\b/.test(t) ||
    // Peça publicitária visual sem dizer "imagem" explicitamente
    (/\b(design|desing|publicidade|anuncio|propaganda|cartaz|poster)\b/.test(t) &&
      /\b(crie|cria|criar|faca|faz|gerar|gere|monte)\b/.test(t))
  ) {
    return "image"
  }

  return "text"
}

/** @deprecated use detectMediaModality */
export function looksLikeImageRequest(text: string): boolean {
  return detectMediaModality(text) === "image"
}

export function isMediaModality(mod: MediaModality): boolean {
  return mod !== "text"
}
