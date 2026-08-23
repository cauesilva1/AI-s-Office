import { Agent, Message, MissionStep, Sector } from "@/lib/game/types"

interface DispatchParams {
  step: MissionStep
  agent: Agent
  sectorName: string
  missionPrompt: string
  previousResult: string
  provider: "huggingface" | "mock"
  hfToken: string
}

export async function dispatchStep(params: DispatchParams): Promise<string> {
  const { step, agent, sectorName, missionPrompt, previousResult, provider, hfToken } = params
  const handoffContext = previousResult
    ? `Contexto recebido da etapa anterior:\n${previousResult}\n\n`
    : ""

  const prompt = [
    `Missão principal: ${missionPrompt}`,
    handoffContext,
    `Tarefa desta etapa (${sectorName}):`,
    step.note,
    "Responda de forma objetiva com ações e entrega da sua etapa.",
  ].join("\n\n")

  const history: Message[] = [
    ...agent.chatHistory.slice(-8),
    { role: "user", content: prompt, timestamp: Date.now() },
  ]

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentName: agent.name,
      agentRole: agent.role,
      sectorName,
      prompt,
      history: history.map(m => ({ role: m.role, content: m.content })),
      provider,
      hfToken,
      model: agent.model,
    }),
  })

  const data = await res.json()
  return data.text || data.error || "(sem resposta)"
}
