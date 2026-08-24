/** Resume o resultado de uma etapa para o próximo agente (menos contexto bruto). */
export function summarizeForHandoff(text: string, maxChars = 700): string {
  const cleaned = text
    .replace(/\[simulação[^\]]*\]\s*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  if (cleaned.length <= maxChars) return cleaned

  // Preferir primeiros blocos / bullets
  const paragraphs = cleaned.split(/\n+/).filter(Boolean)
  let out = ""
  for (const p of paragraphs) {
    const next = out ? `${out}\n${p}` : p
    if (next.length > maxChars) break
    out = next
  }

  if (!out) out = cleaned.slice(0, maxChars)
  return `${out.trim()}\n\n[…] resumo da etapa anterior (${cleaned.length} chars → ${Math.min(out.length, maxChars)})`
}

export function routeIncludesDesign(route: { sectorId: string }[]): boolean {
  return route.some(s => s.sectorId === "design")
}

/** Pedidos que esperam pixel/arte, não só brief de design */
export function looksLikeImageRequest(text: string): boolean {
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  return (
    /\b(imagem|image|foto|ilustra|desenho|pintura|wallpaper|banner|mockup|flux)\b/.test(t) ||
    /\b(gerar|crie|cria|faca|faz).{0,40}\b(img|arte|visual)\b/.test(t) ||
    /\b(png|jpg|jpeg|webp)\b/.test(t)
  )
}
