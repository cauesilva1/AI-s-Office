import { Agent, MissionStep, Sector } from "@/lib/game/types"
import { ROUTER_MODEL } from "@/lib/game/constants"

export interface RouteDecision {
  primarySectorId: string
  strategy: "rules" | "llm"
  confidence: number
  reason: string
}

const KEYWORD_RULES: Array<{ sectorId: string; keywords: string[] }> = [
  { sectorId: "engineering", keywords: ["codigo", "code", "bug", "api", "backend", "frontend", "refator", "typescript"] },
  { sectorId: "design", keywords: ["design", "layout", "ui", "ux", "figma", "prototipo", "visual"] },
  { sectorId: "research", keywords: ["pesquisa", "estudo", "benchmark", "analise", "resumo", "comparar"] },
  { sectorId: "data", keywords: ["dados", "sql", "dashboard", "metrica", "kpi", "grafico", "etl"] },
  { sectorId: "devops", keywords: ["deploy", "infra", "docker", "kubernetes", "ci", "cd", "pipeline"] },
  { sectorId: "growth", keywords: ["marketing", "copy", "campanha", "seo", "funil", "conversao", "ads"] },
]

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function routeByRules(prompt: string): RouteDecision | null {
  const text = normalize(prompt)
  const score = new Map<string, number>()

  KEYWORD_RULES.forEach(rule => {
    const hits = rule.keywords.reduce((acc, keyword) => acc + (text.includes(keyword) ? 1 : 0), 0)
    if (hits > 0) score.set(rule.sectorId, hits)
  })

  if (score.size === 0) return null
  const ordered = [...score.entries()].sort((a, b) => b[1] - a[1])
  const [winner, points] = ordered[0]
  const confidence = points >= 2 ? 0.82 : 0.65
  return {
    primarySectorId: winner,
    strategy: "rules",
    confidence,
    reason: `Regras encontraram ${points} correspondência(s) no setor ${winner}.`,
  }
}

export async function routeByLlm(params: {
  prompt: string
  sectors: Sector[]
  provider?: string
  apiKey?: string
  /** @deprecated */
  hfToken?: string
}): Promise<RouteDecision> {
  const { prompt, sectors } = params
  const apiKey = params.apiKey || params.hfToken || ""
  const provider = params.provider || (apiKey ? "huggingface" : "mock")

  if (!apiKey || provider === "mock") {
    return {
      primarySectorId: "research",
      strategy: "llm",
      confidence: 0.45,
      reason: "Sem API key; fallback padrão para Pesquisa.",
    }
  }

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskType: "router",
        prompt,
        sectors: sectors.map(s => ({ id: s.id, name: s.name })),
        provider,
        apiKey,
        hfToken: apiKey,
        model: provider === "huggingface" ? ROUTER_MODEL : undefined,
      }),
    })
    const data = await response.json()
    if (data?.error) {
      return {
        primarySectorId: "research",
        strategy: "llm",
        confidence: 0.5,
        reason: String(data.error),
      }
    }
    const sectorId = String(data?.sectorId || "research")
    const confidence = Math.max(0, Math.min(1, Number(data?.confidence || 0.6)))
    const reason = String(data?.reason || "Classificação por IA.")

    const exists = sectors.some(s => s.id === sectorId)
    return {
      primarySectorId: exists ? sectorId : "research",
      strategy: "llm",
      confidence,
      reason,
    }
  } catch {
    return {
      primarySectorId: "research",
      strategy: "llm",
      confidence: 0.5,
      reason: "Fallback por falha no classificador IA.",
    }
  }
}

// Roteamento totalmente automático: regras rápidas primeiro, IA como fallback
export async function autoRoute(params: {
  prompt: string
  sectors: Sector[]
  provider?: string
  apiKey?: string
  hfToken?: string
}): Promise<RouteDecision> {
  const byRules = routeByRules(params.prompt)
  if (byRules && byRules.confidence >= 0.75) return byRules
  const byLlm = await routeByLlm(params)
  // Se a IA falhou/ficou insegura mas as regras tinham um palpite, prefere as regras
  if (byRules && byLlm.confidence <= byRules.confidence) return byRules
  return byLlm
}

export function buildPipeline(primarySectorId: string, agents: Agent[]): MissionStep[] {
  const templates: Record<string, string[]> = {
    engineering: ["research", "engineering", "devops"],
    design: ["research", "design", "growth"],
    research: ["research", "engineering"],
    data: ["research", "data", "engineering"],
    devops: ["engineering", "devops"],
    growth: ["research", "growth", "design"],
  }

  const sectorChain = templates[primarySectorId] || [primarySectorId]
  return sectorChain.map((sectorId, index) => {
    const sectorAgent = agents.find(a => a.sectorId === sectorId) || null
    return {
      sectorId,
      agentId: sectorAgent?.id || null,
      note: index === 0 ? "Início da missão" : "Continuação automática",
    }
  })
}
