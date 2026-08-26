import { Agent, Desk, AIProvider } from "@/lib/game/types"
import { BASE_SECTORS, STARTING_AGENTS } from "@/lib/game/constants"
import { generateLogEntry } from "@/lib/game/engine"
import { defaultModelForSector } from "@/lib/ai/remapModels"
import { fillMissingStartingAgents } from "@/store/officeBootstrap"
import { designBackgroundSlots } from "@/lib/ai/openRouterCatalog"

export type SectorSenior = {
  name: string
  role: string
  systemPrompt: string
}

/** Solo = 1 sênior/setor (OpenAI, Claude, Groq, NVIDIA, Google). OpenRouter = ensemble de 3. */
export function isSoloProvider(provider: AIProvider): boolean {
  return (
    provider === "openai" ||
    provider === "anthropic" ||
    provider === "groq" ||
    provider === "nvidia" ||
    provider === "google"
  )
}

/** OpenRouter: 3 modelos por setor em paralelo + síntese */
export function isEnsembleProvider(provider: AIProvider): boolean {
  return provider === "openrouter"
}

export function isTeamProvider(provider: AIProvider): boolean {
  return !isSoloProvider(provider)
}

/** Papéis complementares do trio (índice = slot do modelo em SECTOR_DEFAULTS) */
export const ENSEMBLE_SLOTS = [
  {
    key: "draft",
    nameSuffix: "Proposta",
    role: "Proposta",
    angle:
      "Seu foco: entregar a resposta principal completa e acionável do setor. Seja concreto.",
  },
  {
    key: "critique",
    nameSuffix: "Crítica",
    role: "Crítica",
    angle:
      "Seu foco: lacunas, riscos, trade-offs e o que a proposta pode ter perdido. Não reescreva tudo — complemente.",
  },
  {
    key: "fast",
    nameSuffix: "Rápido",
    role: "Ângulo rápido",
    angle:
      "Seu foco: versão curta em bullets — essência e próximo passo. Máximo de velocidade e clareza.",
  },
] as const


export const SECTOR_SENIORS: Record<string, SectorSenior> = {
  engineering: {
    name: "Eng Senior",
    role: "Staff Engineer",
    systemPrompt: [
      "Você é o Staff Engineer sênior do setor de Engenharia no Agent Office.",
      "Atue como líder técnico: arquitetura, código limpo, trade-offs, testes e entregáveis concretos.",
      "Responda em português do Brasil, de forma profissional e direta.",
      "Quando receber um bastão (resumo de outra etapa), avance sem repetir o que já foi feito.",
    ].join(" "),
  },
  design: {
    name: "Design Lead",
    role: "Design Lead",
    systemPrompt: [
      "Você é o Design Lead sênior do setor de Design no Agent Office.",
      "Atue com visão de produto: UX, UI, hierarquia visual, copy curto e especificação clara.",
      "Neste modo você trabalha com texto (descrições, specs, prompts visuais) — não assuma geração de imagem nativa.",
      "Responda em português do Brasil. Se receber bastão, continue a partir do resumo.",
    ].join(" "),
  },
  research: {
    name: "Research Lead",
    role: "Pesquisador Sênior",
    systemPrompt: [
      "Você é o pesquisador sênior do setor de Pesquisa no Agent Office.",
      "Faça análise crítica, compare opções, cite premissas e entregue conclusões acionáveis.",
      "Responda em português do Brasil. No bastão, não repita pesquisa já feita — aprofunde ou pivote.",
    ].join(" "),
  },
  data: {
    name: "Data Lead",
    role: "Cientista de Dados Sênior",
    systemPrompt: [
      "Você é o cientista de dados sênior do setor de Dados no Agent Office.",
      "Foque em métricas, modelos mentais de dados, SQL/ETL conceitual e insights claros.",
      "Responda em português do Brasil. Com bastão, use o contexto anterior sem reescrevê-lo inteiro.",
    ].join(" "),
  },
  devops: {
    name: "DevOps Lead",
    role: "SRE / Platform Lead",
    systemPrompt: [
      "Você é o SRE/Platform lead sênior do setor de DevOps no Agent Office.",
      "Foque em CI/CD, infraestrutura, observabilidade, segurança operacional e runbooks práticos.",
      "Responda em português do Brasil. No bastão, transforme o trabalho anterior em plano de deploy/ops.",
    ].join(" "),
  },
  growth: {
    name: "Growth Lead",
    role: "Growth Lead",
    systemPrompt: [
      "Você é o Growth Lead sênior do setor de Growth no Agent Office.",
      "Foque em posicionamento, funil, copy, experimentos e canais — com hipóteses e próximos passos.",
      "Responda em português do Brasil. No bastão, converta o material anterior em crescimento mensurável.",
    ].join(" "),
  },
}

export function getSectorSenior(sectorId: string): SectorSenior {
  return SECTOR_SENIORS[sectorId] || {
    name: "Lead",
    role: "Especialista Sênior",
    systemPrompt:
      "Você é um especialista sênior no Agent Office. Responda em português do Brasil, de forma profissional e direta.",
  }
}

/** System prompt — solo: sênior do setor; ensemble: sênior + ângulo do slot; time: papel do agente */
export function buildAgentSystemPrompt(params: {
  provider: AIProvider
  sectorId?: string
  sectorName?: string
  agentName: string
  agentRole: string
  ensembleSlot?: number
}): string {
  const { provider, sectorId, sectorName, agentName, agentRole, ensembleSlot } = params
  if (isSoloProvider(provider) && sectorId) {
    return getSectorSenior(sectorId).systemPrompt
  }
  if (isEnsembleProvider(provider) && sectorId) {
    const senior = getSectorSenior(sectorId)
    const slot = ENSEMBLE_SLOTS[ensembleSlot ?? 0] || ENSEMBLE_SLOTS[0]
    return [
      senior.systemPrompt,
      `Você faz parte de um trio paralelo neste setor (papel: ${slot.role}).`,
      slot.angle,
      "Outros modelos do trio respondem ao mesmo tempo; foque no seu ângulo sem tentar cobrir tudo sozinho.",
    ].join(" ")
  }
  return [
    `Você é ${agentName}, ${agentRole} do setor ${sectorName || "Geral"} no Agent Office`,
    "— um escritório virtual onde várias IAs trabalham em conjunto.",
    "Responda em português do Brasil, de forma profissional e direta.",
    'Quando receber um "bastão" (contexto vindo de outro agente), continue o trabalho a partir dele sem repetir o que já foi feito.',
  ].join(" ")
}

export type RosterResult = {
  agents: Agent[]
  desks: Desk[]
  removed: number
  added: number
}

/** 1 sênior por setor; libera mesas dos extras */
export function collapseToSoloSeniors(
  agents: Agent[],
  desks: Desk[],
  provider: AIProvider
): RosterResult {
  const nextDesks = desks.map(d => ({ ...d, agentId: null as string | null }))
  const kept: Agent[] = []
  let removed = 0

  for (const sector of BASE_SECTORS) {
    const inSector = agents.filter(a => a.sectorId === sector.id)
    const senior = getSectorSenior(sector.id)
    const model = defaultModelForSector(provider, sector.id, 0)
    const base = inSector[0]
    removed += Math.max(0, inSector.length - 1)

    const id = base?.id || `solo_${sector.id}`
    const desk = nextDesks.find(d => d.sectorId === sector.id && !d.agentId)
    if (desk) desk.agentId = id

    kept.push({
      id,
      name: senior.name,
      role: senior.role,
      sectorId: sector.id,
      color: base?.color || sector.color,
      model,
      log: base?.log?.length ? base.log : [generateLogEntry("Modo solo · sênior do setor")],
      chatHistory: base?.chatHistory || [],
      spriteState: "idle",
      position: desk
        ? { x: desk.position.x, y: desk.position.y }
        : base?.position || { x: 0, y: 0 },
    })
  }

  return { agents: kept, desks: nextDesks, removed, added: 0 }
}

/** 3 agentes/setor — um por modelo do catálogo OpenRouter (slots iguais, sem “default”) */
export function ensureEnsembleRoster(
  agents: Agent[],
  desks: Desk[],
  provider: AIProvider = "openrouter"
): RosterResult {
  const before = agents.length
  const nextDesks = desks.map(d => ({ ...d, agentId: null as string | null }))
  const kept: Agent[] = []
  const senior = (sectorId: string) => getSectorSenior(sectorId)

  for (const sector of BASE_SECTORS) {
    const existing = agents.filter(a => a.sectorId === sector.id)
    const baseSenior = senior(sector.id)
    const slots =
      provider === "openrouter" && sector.id === "design"
        ? designBackgroundSlots()
        : ENSEMBLE_SLOTS.map((meta, slot) => ({
            slot,
            modality: "text" as const,
            role: meta.role,
            nameSuffix: meta.nameSuffix,
            fallbackModel: defaultModelForSector(provider, sector.id, slot),
          }))

    for (const slotDef of slots) {
      const model =
        provider === "openrouter" && sector.id === "design"
          ? slotDef.fallbackModel
          : defaultModelForSector(provider, sector.id, slotDef.slot)
      const prev = existing[slotDef.slot]
      const id = prev?.id || `ensemble_${sector.id}_${slotDef.slot}`
      const desk = nextDesks.find(d => d.sectorId === sector.id && !d.agentId)
      if (desk) desk.agentId = id

      kept.push({
        id,
        name: `${baseSenior.name} · ${slotDef.nameSuffix}`,
        role: slotDef.role,
        sectorId: sector.id,
        color: prev?.color || sector.color,
        model,
        log: prev?.log?.length
          ? prev.log
          : [generateLogEntry(`Ensemble · ${slotDef.role} · ${model.split("/").pop()}`)],
        chatHistory: prev?.chatHistory || [],
        spriteState: "idle",
        position: desk
          ? { x: desk.position.x, y: desk.position.y }
          : prev?.position || { x: 0, y: 0 },
      })
    }
  }

  return {
    agents: kept,
    desks: nextDesks,
    removed: Math.max(0, before - kept.length),
    added: Math.max(0, kept.length - before),
  }
}

/** Índice do slot no trio (0–2) a partir do id ou da ordem no setor */
export function ensembleSlotOf(agent: Agent, sectorAgents: Agent[]): number {
  const fromId = agent.id.match(/_(\d+)$/)
  if (fromId) {
    const n = Number(fromId[1])
    if (n >= 0 && n < ENSEMBLE_SLOTS.length) return n
  }
  const idx = sectorAgents.findIndex(a => a.id === agent.id)
  return idx >= 0 ? idx % ENSEMBLE_SLOTS.length : 0
}

/** Garante o time inicial HF quando volta do solo */
export function ensureHfRoster(agents: Agent[], desks: Desk[]): RosterResult {
  const before = agents.length
  const filled = fillMissingStartingAgents(agents, desks)
  // Se estiver em modo solo (6 agentes), recria a partir do starting set
  const bySector = new Map<string, number>()
  filled.agents.forEach(a => bySector.set(a.sectorId, (bySector.get(a.sectorId) || 0) + 1))
  const needsFullTeam = BASE_SECTORS.some(s => (bySector.get(s.id) || 0) < 2)

  if (!needsFullTeam) {
    return {
      agents: filled.agents,
      desks: filled.desks,
      removed: 0,
      added: filled.agents.length - before,
    }
  }

  // Rebuild desks occupancy from STARTING_AGENTS when coming from solo
  const nextDesks = desks.map(d => ({ ...d, agentId: null as string | null }))
  const nextAgents: Agent[] = []
  STARTING_AGENTS.forEach(base => {
    const existing = filled.agents.find(a => a.id === base.id)
    const desk = nextDesks.find(d => d.sectorId === base.sectorId && !d.agentId)
    if (!desk) return
    desk.agentId = base.id
    nextAgents.push({
      id: base.id,
      name: base.name,
      role: base.role,
      sectorId: base.sectorId,
      color: base.color,
      model: base.model,
      log: existing?.log?.length ? existing.log : [generateLogEntry("Time HF restaurado")],
      chatHistory: existing?.chatHistory || [],
      spriteState: "idle",
      position: { x: desk.position.x, y: desk.position.y },
    })
  })

  return {
    agents: nextAgents,
    desks: nextDesks,
    removed: Math.max(0, before - nextAgents.length),
    added: Math.max(0, nextAgents.length - before),
  }
}
