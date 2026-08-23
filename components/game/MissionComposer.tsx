"use client"

import { useMemo, useState } from "react"
import { useGameStore } from "@/store/gameStore"
import { ArrowRight, Loader2, Route, Sparkles, X } from "lucide-react"
import { buildPipeline, routeByLlm, routeByRules, RouteDecision } from "@/lib/orchestrator/hybridRouter"
import { dispatchStep } from "@/lib/orchestrator/dispatch"
import { MissionStep } from "@/lib/game/types"

function sectorNameById(id: string, sectors: { id: string; name: string }[]): string {
  return sectors.find(s => s.id === id)?.name || id
}

export default function MissionComposer() {
  const {
    sectors,
    agents,
    aiProvider,
    hfToken,
    hfModel,
    activeMission,
    createMission,
    updateActiveMission,
    completeActiveMission,
    failActiveMission,
    addFeedItem,
    addChatMessage,
    setAgentState,
    addAgentLog,
    showToast,
  } = useGameStore()

  const [prompt, setPrompt] = useState("")
  const [decision, setDecision] = useState<RouteDecision | null>(null)
  const [routeDraft, setRouteDraft] = useState<MissionStep[]>([])
  const [routing, setRouting] = useState(false)
  const [running, setRunning] = useState(false)
  const [manualSectorId, setManualSectorId] = useState(sectors[0]?.id || "engineering")

  const validRoute = routeDraft.filter(step => step.agentId)
  const missionBusy = Boolean(activeMission) || running

  const routeSummary = useMemo(
    () => validRoute.map(step => sectorNameById(step.sectorId, sectors)).join(" → "),
    [validRoute, sectors]
  )

  const suggestRoute = async () => {
    const content = prompt.trim()
    if (!content) return
    setRouting(true)
    setDecision(null)
    try {
      const byRules = routeByRules(content)
      const finalDecision = byRules && byRules.confidence >= 0.75
        ? byRules
        : await routeByLlm({ prompt: content, sectors, hfToken, model: hfModel })
      const pipeline = buildPipeline(finalDecision.primarySectorId, agents)
      setDecision(finalDecision)
      setRouteDraft(pipeline)
      showToast(`Rota sugerida: ${sectorNameById(finalDecision.primarySectorId, sectors)}`)
    } finally {
      setRouting(false)
    }
  }

  const removeStep = (idx: number) => setRouteDraft(current => current.filter((_, i) => i !== idx))

  const addManualStep = () => {
    const agent = agents.find(a => a.sectorId === manualSectorId) || null
    setRouteDraft(current => [...current, { sectorId: manualSectorId, agentId: agent?.id || null, note: "Etapa adicionada manualmente" }])
  }

  const runMission = async () => {
    const content = prompt.trim()
    if (!content || validRoute.length === 0 || missionBusy) return

    setRunning(true)
    const mission = createMission({
      prompt: content,
      strategy: decision?.strategy || "manual_override",
      primarySectorId: routeDraft[0]?.sectorId || "research",
      route: routeDraft,
    })
    updateActiveMission({ status: "running", startedAt: Date.now() })
    let previousResult = ""
    let consolidated = ""

    try {
      for (let i = 0; i < validRoute.length; i++) {
        const step = validRoute[i]
        const agent = agents.find(a => a.id === step.agentId)
        if (!agent) continue
        const sectorName = sectorNameById(step.sectorId, sectors)
        const stepPrompt = i === 0
          ? content
          : `[Bastão automático da etapa anterior]\n${previousResult}`

        addFeedItem({
          missionId: mission.id,
          stage: i + 1,
          agentId: agent.id,
          kind: i === 0 ? "info" : "handoff",
          text: i === 0
            ? `Iniciou missão no setor ${sectorName}`
            : `Recebeu bastão para etapa ${i + 1} (${sectorName})`,
        })

        addChatMessage(agent.id, {
          role: "user",
          content: i === 0 ? content : stepPrompt,
          timestamp: Date.now(),
          handoffFrom: i === 0 ? undefined : "Pipeline automático",
        })
        setAgentState(agent.id, "working")
        const response = await dispatchStep({
          step,
          agent,
          sectorName,
          missionPrompt: content,
          previousResult,
          provider: aiProvider,
          hfToken,
        })
        setAgentState(agent.id, "idle")
        addChatMessage(agent.id, { role: "assistant", content: response, timestamp: Date.now() })
        addAgentLog(agent.id, `Etapa ${i + 1} da missão concluída`)
        addFeedItem({
          missionId: mission.id,
          stage: i + 1,
          agentId: agent.id,
          kind: "message",
          text: `Concluiu etapa ${i + 1}: ${sectorName}`,
        })
        previousResult = response
        consolidated += `\n\n[Etapa ${i + 1} - ${sectorName}]\n${response}`
      }

      completeActiveMission(consolidated.trim())
      showToast("Missão concluída com sucesso")
      setPrompt("")
      setDecision(null)
      setRouteDraft([])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha na execução da missão"
      failActiveMission(message)
      showToast(`Falha na missão: ${message}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-4 z-50 w-[min(920px,95vw)] bg-[#101a29]/95 backdrop-blur-md border border-cyan-400/15 rounded-2xl p-3.5 shadow-[0_15px_45px_rgba(8,12,20,0.65)]">
      <div className="flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-amber-400 mt-2" />
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 block">
            Missão global (auto-roteamento por setor)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="Descreva o que você quer e o escritório decide quem executa e em que ordem..."
            className="w-full bg-[#0f1724] border border-cyan-400/15 rounded-xl p-3 text-cyan-50 text-sm placeholder:text-cyan-100/25 focus:outline-none focus:border-cyan-300/45 resize-none"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={suggestRoute}
          disabled={!prompt.trim() || routing || missionBusy}
          className="inline-flex items-center gap-1.5 bg-cyan-500/12 hover:bg-cyan-400/18 text-cyan-100 text-xs font-bold rounded-full px-3 py-2 disabled:opacity-40"
        >
          {routing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Route className="w-3.5 h-3.5" />}
          Auto-rotear
        </button>
        <button
          onClick={runMission}
          disabled={!prompt.trim() || validRoute.length === 0 || missionBusy}
          className="inline-flex items-center gap-1.5 bg-violet-500/85 hover:bg-violet-400 text-white text-xs font-bold rounded-full px-3 py-2 disabled:opacity-40"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          Executar missão
        </button>
        {activeMission && (
          <span className="text-[11px] text-amber-300/90">Missão em execução: {activeMission.status}</span>
        )}
      </div>

      {(decision || routeDraft.length > 0) && (
          <div className="mt-3 rounded-xl bg-[#0f1724]/95 border border-cyan-400/12 p-2.5">
          <div className="text-[11px] text-white/50 mb-2">
            {decision
              ? `Rota sugerida por ${decision.strategy === "rules" ? "regras" : "IA"} (${Math.round(decision.confidence * 100)}%): ${decision.reason}`
              : "Rota editada manualmente"}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {routeDraft.map((step, idx) => (
              <div key={`${step.sectorId}-${idx}`} className="inline-flex items-center gap-1 bg-cyan-400/10 text-cyan-100/90 rounded-full px-2 py-1 text-[11px] border border-cyan-300/10">
                <span>{idx + 1}. {sectorNameById(step.sectorId, sectors)}</span>
                <button onClick={() => removeStep(idx)} className="text-white/50 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={manualSectorId}
              onChange={(e) => setManualSectorId(e.target.value)}
              className="bg-[#0c1420] border border-cyan-400/15 rounded-lg px-2 py-1 text-xs text-cyan-50/90"
            >
              {sectors.map(sector => (
                <option key={sector.id} value={sector.id}>{sector.name}</option>
              ))}
            </select>
            <button
              onClick={addManualStep}
              className="bg-cyan-400/12 hover:bg-cyan-300/18 text-cyan-100 text-xs font-bold rounded-full px-3 py-1.5"
            >
              Adicionar etapa
            </button>
            <span className="text-[11px] text-white/40 truncate">Fluxo: {routeSummary || "sem etapas válidas"}</span>
          </div>
        </div>
      )}
    </div>
  )
}
