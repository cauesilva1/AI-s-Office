/** Mensagens de erro com próximo passo — uso pessoal */

export type FriendlyError = {
  message: string
  hint: string
}

export function formatFriendlyError(raw: string): FriendlyError {
  const m = String(raw || "").toLowerCase()

  if (
    m.includes("api key") ||
    m.includes("inválid") ||
    m.includes("invalid") ||
    m.includes("401") ||
    m.includes("unauthorized") ||
    m.includes("403")
  ) {
    return {
      message: "API key inválida ou sem permissão.",
      hint: "Abra Config, cole a key do provedor ativo (ou use .env.local) e salve de novo.",
    }
  }

  if (m.includes("402") || m.includes("crédito") || m.includes("quota") || m.includes("credit")) {
    return {
      message: "Créditos ou quota esgotados neste provedor.",
      hint: "Recarregue créditos no provedor ou troque para outro (ex. Gemini, NVIDIA, HF).",
    }
  }

  if (m.includes("429") || m.includes("limite de requisi") || m.includes("rate limit")) {
    return {
      message: "Limite de requisições atingido.",
      hint: "Aguarde ~1 minuto e tente de novo, ou use outro provedor.",
    }
  }

  if (m.includes("404") || m.includes("não disponível") || m.includes("not found")) {
    return {
      message: "Modelo indisponível neste provedor.",
      hint: "No Hire/+IA, troque o modelo do agente para um do catálogo do provedor ativo.",
    }
  }

  if (
    m.includes("preta") ||
    m.includes("ip") ||
    m.includes("nsfw") ||
    m.includes("content policy") ||
    m.includes("safety") ||
    m.includes("blocked")
  ) {
    return {
      message: "Imagem bloqueada ou filtrada (IP/marca ou política).",
      hint: "Descreva o visual sem nomes de heróis/marcas, ou troque para Google Gemini.",
    }
  }

  if (m.includes("sem suporte") || m.includes("não suporta") || m.includes("não retornou imagem")) {
    return {
      message: "Este provedor/modelo não gerou a mídia pedida.",
      hint: "Use HF (FLUX), OpenRouter com modelo de imagem, OpenAI ou Gemini para Design.",
    }
  }

  if (m.includes("configure") && m.includes("key")) {
    return {
      message: "Sem API key configurada.",
      hint: "Em Config, escolha o provedor e cole a key (nvapi-, AIza…, hf_…, etc.).",
    }
  }

  const message = String(raw || "Erro desconhecido").slice(0, 280)
  return {
    message,
    hint: "Confira a key em Config e se o modelo do agente serve para este provedor.",
  }
}

export function friendlyErrorLine(raw: string): string {
  const { message, hint } = formatFriendlyError(raw)
  return `${message} → ${hint}`
}
