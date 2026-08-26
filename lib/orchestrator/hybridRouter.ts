import { Agent, MissionStep, Sector } from "@/lib/game/types"
import { AIProvider } from "@/lib/ai/providers"
import { resolveRouterBackend, type RouterBackend } from "@/lib/ai/routerConfig"
import { looksLikeVisualCreativeRequest } from "@/lib/ai/mediaModality"

export interface RouteDecision {
  primarySectorId: string
  pipeline: string[]
  strategy: "llm" | "fallback"
  confidence: number
  reason: string
  routerProvider?: string
  routerModel?: string
}

const DEFAULT_TEMPLATES: Record<string, string[]> = {
  engineering: ["research", "engineering", "devops"],
  design: ["design"],
  research: ["research", "engineering"],
  data: ["research", "data", "engineering"],
  devops: ["engineering", "devops"],
  growth: ["research", "growth", "design"],
}

function designOnlyDecision(reason: string, base?: Partial<RouteDecision>): RouteDecision {
  return {
    primarySectorId: "design",
    pipeline: ["design"],
    strategy: base?.strategy || "llm",
    confidence: Math.max(base?.confidence || 0.85, 0.85),
    reason,
    routerProvider: base?.routerProvider,
    routerModel: base?.routerModel,
  }
}

/** Corrige rotas ruins quando o pedido é claramente visual/publicitário */
export function correctRouteForVisualCreative(
  prompt: string,
  decision: RouteDecision,
): RouteDecision {
  if (!looksLikeVisualCreativeRequest(prompt)) return decision

  const hasDesign = decision.pipeline.includes("design")
  const isWeakFallback =
    decision.strategy === "fallback" ||
    decision.confidence < 0.65 ||
    (decision.pipeline[0] === "research" && decision.pipeline.includes("engineering") && !hasDesign)

  if (!hasDesign || isWeakFallback) {
    return designOnlyDecision(
      `Pedido visual/publicitário → Design` +
        (decision.reason ? ` (roteador: ${decision.reason})` : ""),
      decision,
    )
  }

  // Já tem design, mas pipeline misturou setores desnecessários
  if (decision.pipeline.length > 1 && decision.pipeline[0] !== "design") {
    return designOnlyDecision(`Priorizando Design para entrega visual · ${decision.reason}`, decision)
  }

  return decision
}

async function routeByLlm(params: {
  prompt: string
  sectors: Sector[]
  backend: RouterBackend
}): Promise<RouteDecision> {
  const { prompt, sectors, backend } = params

  try {
    const response = await fetch("/api/router", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        sectors: sectors.map(s => ({ id: s.id, name: s.name })),
        provider: backend.provider,
        apiKey: backend.apiKey,
        hfToken: backend.provider === "huggingface" ? backend.apiKey : undefined,
        model: backend.model,
      }),
    })
    const data = await response.json()

    if (data?.error) {
      return fallbackDecision(`Roteador: ${String(data.error)}`)
    }

    const sectorId = String(data?.sectorId || "research")
    const pipeline = Array.isArray(data?.pipeline) && data.pipeline.length > 0
      ? data.pipeline.map(String)
      : [sectorId]
    const confidence = Math.max(0, Math.min(1, Number(data?.confidence || 0.6)))
    const reason = String(data?.reason || "Classificação por IA.")
    const exists = sectors.some(s => s.id === sectorId)

    return {
      primarySectorId: exists ? sectorId : pipeline[0] || "research",
      pipeline: exists ? pipeline : [pipeline[0] || "research"],
      strategy: "llm",
      confidence,
      reason: `${reason} · via ${backend.label}`,
      routerProvider: backend.provider,
      routerModel: backend.model,
    }
  } catch {
    return fallbackDecision("Falha de rede no roteador IA.")
  }
}

function fallbackDecision(reason: string): RouteDecision {
  return {
    primarySectorId: "research",
    pipeline: ["research", "engineering"],
    strategy: "fallback",
    confidence: 0.45,
    reason,
  }
}

/** Roteamento 100% por IA — usa só o provedor ativo */
export async function autoRoute(params: {
  prompt: string
  sectors: Sector[]
  activeProvider: AIProvider
  apiKey?: string
  serverHasKey?: boolean
}): Promise<RouteDecision> {
  const backend = resolveRouterBackend({
    activeProvider: params.activeProvider,
    apiKey: params.apiKey,
    serverHasKey: params.serverHasKey,
  })

  if (!backend) {
    const empty = {
      ...fallbackDecision("Sem API key do provedor ativo para o roteador."),
      pipeline: ["research"] as string[],
    }
    return correctRouteForVisualCreative(params.prompt, empty)
  }

  const decision = await routeByLlm({
    prompt: params.prompt,
    sectors: params.sectors,
    backend,
  })
  return correctRouteForVisualCreative(params.prompt, decision)
}

export function buildPipeline(decision: RouteDecision, agents: Agent[]): MissionStep[] {
  const sectorChain = decision.pipeline?.length
    ? decision.pipeline
    : DEFAULT_TEMPLATES[decision.primarySectorId] || [decision.primarySectorId]

  return sectorChain.map((sectorId, index) => {
    const sectorAgent = agents.find(a => a.sectorId === sectorId) || null
    return {
      sectorId,
      agentId: sectorAgent?.id || null,
      note: index === 0 ? "Início da missão (IA roteadora)" : "Continuação automática",
    }
  })
}
