import { AIProvider, getProviderMeta } from "@/lib/ai/providers"
import { ROUTER_MODEL } from "@/lib/game/constants"

/** Free OR · reasoning/orchestration — ideal para classificar missões (text-only) */
export const ROUTER_MODEL_OPENROUTER = "nvidia/nemotron-3-ultra-550b-a55b:free"

/** Fallback HF quando não há key OpenRouter */
export const ROUTER_MODEL_HUGGINGFACE = ROUTER_MODEL

const VALID_SECTORS = new Set([
  "engineering",
  "design",
  "research",
  "data",
  "devops",
  "growth",
])

export type RouterBackend = {
  provider: Exclude<AIProvider, "mock">
  apiKey: string
  model: string
  label: string
}

export type ParsedRouterResponse = {
  sectorId: string
  pipeline: string[]
  confidence: number
  reason: string
}

/** Roteador usa só o provedor ativo — sem misturar keys de outros */
export function resolveRouterBackend(params: {
  activeProvider: AIProvider
  apiKey?: string
  serverHasKey?: boolean
}): RouterBackend | null {
  const { activeProvider } = params
  if (activeProvider === "mock") return null

  const clientKey = params.apiKey?.trim()
  if (!clientKey && !params.serverHasKey) return null

  return {
    provider: activeProvider,
    apiKey: clientKey || "",
    model: routerModelForProvider(activeProvider),
    label: getProviderMeta(activeProvider).label,
  }
}

export function routerModelForProvider(provider: AIProvider): string {
  if (provider === "openrouter") return ROUTER_MODEL_OPENROUTER
  if (provider === "huggingface") return ROUTER_MODEL_HUGGINGFACE
  if (provider === "openai") return "gpt-4o-mini"
  if (provider === "anthropic") return "claude-3-5-haiku-latest"
  if (provider === "groq") return "llama-3.3-70b-versatile"
  return ROUTER_MODEL_HUGGINGFACE
}

export function buildRouterPrompt(
  userPrompt: string,
  sectors: Array<{ id: string; name: string }>,
): string {
  const sectorList = sectors
    .map(s => `${s.id} (${s.name})`)
    .join(", ")

  return [
    "Você é o roteador de missões do Agent Office.",
    "Analise a intenção completa do usuário — não use listas fixas de palavras-chave.",
    `Setores válidos: ${sectorList}.`,
    "",
    "Guia de intenção:",
    "- design: UI/UX, identidade visual, brief de arte, pedidos de IMAGEM, FOTO, ILUSTRAÇÃO, VÍDEO, ÁUDIO",
    "- engineering: código, bugs, APIs, arquitetura, refatoração",
    "- research: pesquisa, comparar opções, benchmark, análise",
    "- data: métricas, SQL, dashboards, ETL, KPIs",
    "- devops: deploy, infra, Docker, CI/CD, observabilidade",
    "- growth: marketing, copy, funil, SEO, campanhas",
    "",
    "Retorne APENAS JSON válido (sem markdown):",
    '{"sectorId":"design","pipeline":["design"],"confidence":0.92,"reason":"pedido de imagem"}',
    "",
    "Regras do JSON:",
    "- sectorId: setor principal (primeiro da pipeline)",
    "- pipeline: array ordenado de 1 a 4 sectorIds para a missão",
    "- Para gerar imagem/arte/vídeo/áudio: pipeline [\"design\"] (só Design)",
    "- Para código: ex. [\"research\",\"engineering\",\"devops\"]",
    "",
    `Pedido do usuário: ${userPrompt}`,
  ].join("\n")
}

export function parseRouterResponse(raw: string): ParsedRouterResponse | null {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim()
    const firstBrace = cleaned.indexOf("{")
    const lastBrace = cleaned.lastIndexOf("}")
    const jsonSlice = firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned
    const parsed = JSON.parse(jsonSlice)

    const sectorId = String(parsed?.sectorId || "research")
    const safeSector = VALID_SECTORS.has(sectorId) ? sectorId : "research"

    let pipeline: string[] = []
    if (Array.isArray(parsed?.pipeline)) {
      pipeline = parsed.pipeline
        .map((s: unknown) => String(s))
        .filter((s: string) => VALID_SECTORS.has(s))
    }
    if (pipeline.length === 0) pipeline = [safeSector]

    return {
      sectorId: pipeline[0] || safeSector,
      pipeline,
      confidence: Math.max(0, Math.min(1, Number(parsed?.confidence || 0.6))),
      reason: String(parsed?.reason || "Classificação por IA."),
    }
  } catch {
    return null
  }
}
