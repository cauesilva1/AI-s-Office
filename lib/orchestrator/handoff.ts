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

export { detectMediaModality, looksLikeImageRequest, looksLikeVisualCreativeRequest, isMediaModality } from "@/lib/ai/mediaModality"
export type { MediaModality } from "@/lib/ai/mediaModality"
