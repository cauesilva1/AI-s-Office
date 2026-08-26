/** Detecta pedidos que costumam ser bloqueados por filtro de IP (imagem preta) */
export function looksLikeIpSensitiveRequest(text: string): boolean {
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  return (
    /\b(homem[-\s]?aranha|spiderman|spider[-\s]?man)\b/.test(t) ||
    /\b(batman|superman|wonder\s*woman|mulher[-\s]?maravilha)\b/.test(t) ||
    /\b(mickey|minnie|disney|marvel|dc\s*comics|harry\s*potter)\b/.test(t) ||
    /\b(pokemon|pikachu|mario|luigi|sonic|elsa|frozen)\b/.test(t) ||
    /\b(star\s*wars|darth\s*vader|yoda|goku|naruto)\b/.test(t)
  )
}

export const IP_SENSITIVE_HINT =
  "Este briefing cita personagem/marca protegida. FLUX (HF) pode devolver imagem preta. Descreva o visual sem o nome oficial, ou troque para Google Gemini (imagem criativa)."
