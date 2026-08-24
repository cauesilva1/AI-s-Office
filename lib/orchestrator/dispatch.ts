import { Agent, Message, MissionStep, AIProvider } from "@/lib/game/types"
import { summarizeForHandoff } from "@/lib/orchestrator/handoff"
import { ensembleSlotOf } from "@/lib/ai/officeMode"

interface DispatchParams {
  step: MissionStep
  agent: Agent
  sectorName: string
  missionPrompt: string
  previousResult: string
  provider: AIProvider
  apiKey: string
  signal?: AbortSignal
  ensembleSlot?: number
  angleNote?: string
}

export interface DispatchResult {
  text: string
  imageUrl?: string
}

function buildMissionPrompt(params: {
  missionPrompt: string
  previousResult: string
  sectorName: string
  stepNote: string
  angleNote?: string
}): string {
  const handoffSummary = params.previousResult
    ? summarizeForHandoff(params.previousResult)
    : ""

  const handoffContext = handoffSummary
    ? `Resumo da etapa anterior (bastão):\n${handoffSummary}\n\n`
    : ""

  return [
    `Missão principal: ${params.missionPrompt}`,
    handoffContext,
    `Tarefa desta etapa (${params.sectorName}):`,
    params.stepNote,
    params.angleNote || "",
    "Responda de forma objetiva com ações e entrega da sua etapa.",
    "Não repita o trabalho já feito — avance a partir do resumo.",
  ].filter(Boolean).join("\n\n")
}

export async function dispatchStep(params: DispatchParams): Promise<DispatchResult> {
  const {
    step, agent, sectorName, missionPrompt, previousResult, provider, apiKey, signal,
    ensembleSlot, angleNote,
  } = params

  const prompt = buildMissionPrompt({
    missionPrompt,
    previousResult,
    sectorName,
    stepNote: step.note,
    angleNote,
  })

  const history: Message[] = [
    ...agent.chatHistory.slice(-6),
    { role: "user", content: prompt, timestamp: Date.now() },
  ]

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      agentName: agent.name,
      agentRole: agent.role,
      sectorName,
      sectorId: agent.sectorId,
      prompt,
      history: history.map(m => ({ role: m.role, content: m.content })),
      provider,
      apiKey,
      hfToken: apiKey,
      model: agent.model,
      ensembleSlot,
    }),
  })

  if (signal?.aborted) {
    throw new Error("Missão cancelada pelo usuário")
  }

  const data = await res.json()
  if (data?.error) {
    throw new Error(String(data.error))
  }
  return {
    text: data.text || "(sem resposta)",
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
  }
}

export interface EnsembleDispatchResult extends DispatchResult {
  parts: Array<{ agentId: string; model: string; text: string }>
}

/** Dispara os 3 modelos do setor em paralelo e sintetiza numa resposta única */
export async function dispatchSectorEnsemble(params: {
  step: MissionStep
  sectorAgents: Agent[]
  sectorName: string
  missionPrompt: string
  previousResult: string
  provider: AIProvider
  apiKey: string
  signal?: AbortSignal
}): Promise<EnsembleDispatchResult> {
  const { sectorAgents, step, sectorName, missionPrompt, previousResult, provider, apiKey, signal } = params
  const team = sectorAgents.slice(0, 3)
  if (team.length === 0) {
    throw new Error("Nenhum agente no setor para ensemble")
  }

  const parts = await Promise.all(
    team.map(async (agent) => {
      const slot = ensembleSlotOf(agent, team)
      const result = await dispatchStep({
        step,
        agent,
        sectorName,
        missionPrompt,
        previousResult,
        provider,
        apiKey,
        signal,
        ensembleSlot: slot,
      })
      return { agentId: agent.id, model: agent.model, text: result.text, imageUrl: result.imageUrl }
    }),
  )

  if (signal?.aborted) {
    throw new Error("Missão cancelada pelo usuário")
  }

  const lead = team[0]
  const synthesisPrompt = [
    `Missão: ${missionPrompt}`,
    `Setor: ${sectorName}`,
    "Três modelos responderam em paralelo. Sintetize UMA resposta final do setor:",
    "- Una o melhor de cada ângulo (proposta, crítica, versão rápida).",
    "- Sem repetição; entregável claro e próximos passos.",
    "- Português do Brasil.",
    "",
    ...parts.map((p, i) => `--- Modelo ${i + 1} (${p.model.split("/").pop()}) ---\n${p.text}`),
  ].join("\n")

  const synRes = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      agentName: `${lead.name} (síntese)`,
      agentRole: "Síntese do trio",
      sectorName,
      sectorId: lead.sectorId,
      prompt: synthesisPrompt,
      history: [],
      provider,
      apiKey,
      hfToken: apiKey,
      model: lead.model,
      ensembleSlot: 0,
    }),
  })

  if (signal?.aborted) {
    throw new Error("Missão cancelada pelo usuário")
  }

  const synData = await synRes.json()
  if (synData?.error) {
    return {
      text: parts.map((p, i) => `[${i + 1}] ${p.text}`).join("\n\n"),
      imageUrl: parts.find(p => p.imageUrl)?.imageUrl,
      parts: parts.map(({ agentId, model, text }) => ({ agentId, model, text })),
    }
  }

  return {
    text: synData.text || parts.map(p => p.text).join("\n\n"),
    imageUrl: parts.find(p => p.imageUrl)?.imageUrl,
    parts: parts.map(({ agentId, model, text }) => ({ agentId, model, text })),
  }
}
