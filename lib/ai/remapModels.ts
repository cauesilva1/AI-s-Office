import { Agent } from "@/lib/game/types"
import { SECTOR_MODELS, isImageModel } from "@/lib/game/constants"
import { AIProvider, modelsForProvider } from "@/lib/ai/providers"

/** Defaults por setor quando o provedor não é HF */
export const SECTOR_DEFAULTS: Record<Exclude<AIProvider, "huggingface" | "mock">, Record<string, string[]>> = {
  openai: {
    engineering: ["gpt-4.1", "gpt-4o", "gpt-4o-mini"],
    design: ["gpt-4o", "gpt-4.1-mini", "gpt-4o-mini"],
    research: ["gpt-4.1", "gpt-4o", "gpt-4o-mini"],
    data: ["gpt-4o", "gpt-4.1-mini", "gpt-4o-mini"],
    devops: ["gpt-4.1-mini", "gpt-4o-mini", "gpt-4o"],
    growth: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  },
  anthropic: {
    engineering: ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-3-5-haiku-latest"],
    design: ["claude-sonnet-4-20250514", "claude-3-5-haiku-latest", "claude-opus-4-20250514"],
    research: ["claude-opus-4-20250514", "claude-sonnet-4-20250514", "claude-3-5-haiku-latest"],
    data: ["claude-sonnet-4-20250514", "claude-3-5-haiku-latest", "claude-opus-4-20250514"],
    devops: ["claude-3-5-haiku-latest", "claude-sonnet-4-20250514", "claude-opus-4-20250514"],
    growth: ["claude-3-5-haiku-latest", "claude-sonnet-4-20250514", "claude-opus-4-20250514"],
  },
  groq: {
    engineering: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "meta-llama/llama-4-scout-17b-16e-instruct"],
    design: ["llama-3.3-70b-versatile", "meta-llama/llama-4-scout-17b-16e-instruct", "openai/gpt-oss-120b"],
    research: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "meta-llama/llama-4-scout-17b-16e-instruct"],
    data: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "meta-llama/llama-4-scout-17b-16e-instruct"],
    devops: ["meta-llama/llama-4-scout-17b-16e-instruct", "llama-3.3-70b-versatile", "openai/gpt-oss-120b"],
    growth: ["llama-3.3-70b-versatile", "meta-llama/llama-4-scout-17b-16e-instruct", "openai/gpt-oss-120b"],
  },
  // Free tier OpenRouter (max_price=0) — ver https://openrouter.ai/models?max_price=0
  openrouter: {
    engineering: [
      "poolside/laguna-s-2.1:free",
      "stealth/ox-alpha",
      "cohere/north-mini-code:free",
    ],
    design: [
      "google/gemma-4-31b-it:free",
      "bytedance-seed/seedream-5-0-lite",
      "alibaba/wan-3.0",
    ],
    research: [
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "z-ai/glm-5.2:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
    ],
    data: [
      "z-ai/glm-5.2:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "liquid/lfm-2.5-2.6b:free",
    ],
    devops: [
      "poolside/laguna-xs-2.1:free",
      "cohere/north-mini-code:free",
      "nvidia/nemotron-3.5-lightning:free",
    ],
    growth: [
      "google/gemma-4-26b-a4b-it:free",
      "thinkingmachines/inkling-small:free",
      "dots-studio/dots-3-note-preview:free",
    ],
  },
}

function catalogFor(provider: AIProvider): Set<string> {
  if (provider === "huggingface" || provider === "mock") {
    return new Set([
      ...Object.values(SECTOR_MODELS).flat(),
      ...modelsForProvider("huggingface"),
    ])
  }
  return new Set(modelsForProvider(provider))
}

export function defaultModelForSector(provider: AIProvider, sectorId: string, slot = 0): string {
  return defaultForSector(provider, sectorId, slot)
}

function defaultForSector(provider: AIProvider, sectorId: string, slot: number): string {
  if (provider === "huggingface" || provider === "mock") {
    const list = SECTOR_MODELS[sectorId] || modelsForProvider("huggingface")
    return list[slot % list.length] || list[0]
  }
  const list = SECTOR_DEFAULTS[provider][sectorId] || modelsForProvider(provider)
  return list[slot % list.length] || list[0]
}

export function isModelValidForProvider(model: string, provider: AIProvider): boolean {
  if (provider === "mock") return true
  if (provider === "huggingface") {
    return catalogFor(provider).has(model) || isImageModel(model) || model.includes("/")
  }
  // OpenAI etc.: só aceita o catálogo (ou custom sem parecer HF org/name de imagem)
  if (catalogFor(provider).has(model)) return true
  if (provider === "openai") return !model.includes("/") && (model.startsWith("gpt") || model.startsWith("o"))
  if (provider === "anthropic") return model.startsWith("claude")
  return false
}

/** Remapeia agentes cujo modelo não serve para o provedor ativo */
export function remapAgentsForProvider(
  agents: Agent[],
  provider: AIProvider
): { agents: Agent[]; changed: number } {
  const slots = new Map<string, number>()
  let changed = 0

  const next = agents.map(agent => {
    if (isModelValidForProvider(agent.model, provider)) return agent

    const slot = slots.get(agent.sectorId) || 0
    slots.set(agent.sectorId, slot + 1)
    const model = defaultForSector(provider, agent.sectorId, slot)
    changed += 1
    return { ...agent, model }
  })

  return { agents: next, changed }
}

/** Detecta erros de key / cota nas mensagens da API */
export function isProviderAuthError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes("api key") ||
    m.includes("token") ||
    m.includes("inválid") ||
    m.includes("invalid") ||
    m.includes("401") ||
    m.includes("unauthorized") ||
    m.includes("crédito") ||
    m.includes("quota") ||
    m.includes("402") ||
    m.includes("429") ||
    m.includes("limite de requisi")
  )
}
