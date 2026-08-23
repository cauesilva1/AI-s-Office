"use client"

import { useMemo, useRef, useState } from "react"
import { useGameStore } from "@/store/gameStore"
import { Check, Copy, Loader2, Send, Settings2, Sparkles, X } from "lucide-react"
import { autoRoute, buildPipeline, RouteDecision } from "@/lib/orchestrator/hybridRouter"
import { dispatchStep } from "@/lib/orchestrator/dispatch"
import { MissionStep } from "@/lib/game/types"

function sectorNameById(id: string, sectors: { id: string; name: string }[]): string {
  return sectors.find(s => s.id === id)?.name || id
}

type StepPhase = "pending" | "running" | "done"

export default function MissionComposer() {
  const {
    sectors,
    agents,
    aiProvider,
    hfToken,
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
    toggleModal,
  } = useGameStore()

  const [prompt, setPrompt] = useState("")
  const [decision, setDecision] = useState<RouteDecision | null>(null)
  const [liveRoute, setLiveRoute] = useState<MissionStep[]>([])
  const [stepIndex, setStepIndex] = useState(-1)
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [showAdjust, setShowAdjust] = useState(false)
  const [manualSectorId, setManualSectorId] = useState(sectors[0]?.id || "engineering")
  const [manualRoute, setManualRoute] = useState<MissionStep[]>([])
  const cancelRef = useRef(false)

  const missionBusy = Boolean(activeMission) || running
  const needsToken = aiProvider !== "huggingface" || !hfToken

  const routeSummary = useMemo(
    () => manualRoute.map(step => sectorNameById(step.sectorId, sectors)).join(" → "),
    [manualRoute, sectors]
  )

  const stepPhase = (idx: number): StepPhase => {
    if (idx < stepIndex) return "done"
    if (idx === stepIndex && running) return "running"
    return "pending"
  }

  const executeMission = async (content: string, route: MissionStep[], routeDecision: RouteDecision | null) => {
    const validRoute = route.filter(step => step.agentId)
    if (validRoute.length === 0) {
      showToast("Nenhum agente disponível para essa rota")
      return
    }

    cancelRef.current = false
    setLiveRoute(validRoute)
    setStepIndex(0)
    setLastResult(null)

    const mission = createMission({
      prompt: content,
      strategy: routeDecision?.strategy || "manual_override",
      primarySectorId: validRoute[0]?.sectorId || "research",
      route: validRoute,
    })
    updateActiveMission({ status: "running", startedAt: Date.now() })

    let previousResult = ""
    let consolidated = ""

    try {
      for (let i = 0; i < validRoute.length; i++) {
        if (cancelRef.current) throw new Error("Missão cancelada pelo usuário")
        setStepIndex(i)
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
        let result: { text: string; imageUrl?: string }
        try {
          result = await dispatchStep({
            step,
            agent,
            sectorName,
            missionPrompt: content,
            previousResult,
            provider: aiProvider,
            hfToken,
          })
        } finally {
          setAgentState(agent.id, "idle")
        }
        if (cancelRef.current) throw new Error("Missão cancelada pelo usuário")
        addChatMessage(agent.id, {
          role: "assistant",
          content: result.text,
          timestamp: Date.now(),
          imageUrl: result.imageUrl,
        })
        addAgentLog(agent.id, `Etapa ${i + 1} da missão concluída`)
        addFeedItem({
          missionId: mission.id,
          stage: i + 1,
          agentId: agent.id,
          kind: "message",
          text: `Concluiu etapa ${i + 1}: ${sectorName}`,
        })
        previousResult = result.imageUrl ? `${result.text}\n\n[imagem gerada pelo Design]` : result.text
        consolidated += `\n\n[Etapa ${i + 1} - ${sectorName}]\n${result.text}`
      }

      setStepIndex(validRoute.length)
      const finalText = consolidated.trim()
      completeActiveMission(finalText)
      setLastResult(finalText)
      showToast("Missão concluída com sucesso")
      setPrompt("")
      setDecision(null)
      setManualRoute([])
      setShowAdjust(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha na execução da missão"
      failActiveMission(message)
      showToast(message)
      setStepIndex(-1)
      setLiveRoute([])
    }
  }

  // Fluxo principal: um clique roteia automaticamente e já executa
  const submitMission = async () => {
    const content = prompt.trim()
    if (!content || missionBusy) return

    setRunning(true)
    try {
      let route: MissionStep[]
      let routeDecision: RouteDecision | null = null

      if (showAdjust && manualRoute.filter(s => s.agentId).length > 0) {
        route = manualRoute
      } else {
        routeDecision = await autoRoute({ prompt: content, sectors, hfToken })
        route = buildPipeline(routeDecision.primarySectorId, agents)
        setDecision(routeDecision)
        showToast(`Rota automática: ${route.map(s => sectorNameById(s.sectorId, sectors)).join(" → ")}`)
      }

      await executeMission(content, route, routeDecision)
    } finally {
      setRunning(false)
    }
  }

  const cancelMission = () => {
    cancelRef.current = true
    showToast("Cancelando missão...")
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submitMission()
    }
  }

  const addManualStep = () => {
    const agent = agents.find(a => a.sectorId === manualSectorId) || null
    setManualRoute(current => [...current, { sectorId: manualSectorId, agentId: agent?.id || null, note: "Etapa definida manualmente" }])
  }

  const removeManualStep = (idx: number) => setManualRoute(current => current.filter((_, i) => i !== idx))

  const copyResult = async () => {
    if (!lastResult) return
    try {
      await navigator.clipboard.writeText(lastResult)
      showToast("Resultado copiado")
    } catch {
      showToast("Não foi possível copiar")
    }
  }

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-4 z-50 w-[min(920px,95vw)] bg-panel/95 backdrop-blur-md border border-line rounded-2xl p-3.5 shadow-[0_15px_45px_rgba(8,12,20,0.65)]">
      {needsToken && (
        <button
          onClick={() => toggleModal("settings")}
          className="w-full mb-2.5 flex items-center gap-2 bg-amber-500/10 border border-amber-400/25 rounded-xl px-3 py-2 text-left hover:bg-amber-500/15 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-[11px] text-amber-200/90">
            Modo simulação ativo — configure seu token gratuito da Hugging Face para usar IAs reais. Clique aqui para abrir a Config.
          </span>
        </button>
      )}

      <div className="flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-amber-400 mt-2" />
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-widest text-dim font-bold mb-2 block">
            Missão global — o escritório roteia e executa sozinho
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            disabled={missionBusy}
            placeholder="Descreva o que você quer. Enter envia; o escritório decide quem executa e em que ordem..."
            className="w-full bg-field border border-line rounded-xl p-3 text-bright text-sm placeholder:text-faint focus:outline-none focus:border-accent resize-none disabled:opacity-50"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!missionBusy ? (
          <button
            onClick={submitMission}
            disabled={!prompt.trim()}
            className="inline-flex items-center gap-1.5 bg-violet-500/85 hover:bg-violet-400 text-white text-xs font-bold rounded-full px-4 py-2 disabled:opacity-40 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Executar
          </button>
        ) : (
          <button
            onClick={cancelMission}
            className="inline-flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold rounded-full px-4 py-2 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancelar
          </button>
        )}

        <button
          onClick={() => setShowAdjust(v => !v)}
          disabled={missionBusy}
          className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-2 transition-colors disabled:opacity-40 ${
            showAdjust ? "bg-cyan-500/20 text-cyan-100" : "bg-white/5 hover:bg-white/10 text-dim"
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          Ajustar rota
        </button>

        {decision && !running && (
          <span className="text-[11px] text-dim">
            Roteado por {decision.strategy === "rules" ? "regras" : "IA"} ({Math.round(decision.confidence * 100)}%)
          </span>
        )}
      </div>

      {/* Progresso da missão em tempo real */}
      {running && liveRoute.length > 0 && (
        <div className="mt-3 rounded-xl bg-field border border-line p-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {liveRoute.map((step, idx) => {
              const phase = stepPhase(idx)
              return (
                <div key={`${step.sectorId}-${idx}`} className="flex items-center gap-1.5">
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] border transition-colors ${
                      phase === "done"
                        ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/25"
                        : phase === "running"
                          ? "bg-amber-500/15 text-amber-200 border-amber-400/35"
                          : "bg-white/5 text-faint border-white/10"
                    }`}
                  >
                    {phase === "done" && <Check className="w-3 h-3" />}
                    {phase === "running" && <Loader2 className="w-3 h-3 animate-spin" />}
                    {sectorNameById(step.sectorId, sectors)}
                  </div>
                  {idx < liveRoute.length - 1 && <span className="text-faint text-[10px]">→</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Resultado da última missão */}
      {lastResult && !running && (
        <div className="mt-3 rounded-xl bg-field border border-line p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-widest text-dim font-bold">Resultado da missão</span>
            <div className="flex items-center gap-1">
              <button onClick={copyResult} className="p-1.5 rounded-lg hover:bg-white/10 text-dim hover:text-white transition-colors" title="Copiar resultado">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setLastResult(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-dim hover:text-white transition-colors" title="Fechar">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto text-xs text-bright/85 whitespace-pre-wrap leading-relaxed">
            {lastResult}
          </div>
        </div>
      )}

      {/* Ajuste manual de rota (opcional) */}
      {showAdjust && !missionBusy && (
        <div className="mt-3 rounded-xl bg-field border border-line p-2.5">
          <div className="text-[11px] text-dim mb-2">
            Monte a rota manualmente. Se ficar vazia, o roteamento automático decide por você.
          </div>

          {manualRoute.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {manualRoute.map((step, idx) => (
                <div key={`${step.sectorId}-${idx}`} className="inline-flex items-center gap-1 bg-cyan-400/10 text-cyan-100/90 rounded-full px-2 py-1 text-[11px] border border-cyan-300/10">
                  <span>{idx + 1}. {sectorNameById(step.sectorId, sectors)}</span>
                  <button onClick={() => removeManualStep(idx)} className="text-white/50 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <select
              value={manualSectorId}
              onChange={(e) => setManualSectorId(e.target.value)}
              className="bg-field border border-line rounded-lg px-2 py-1 text-xs text-bright"
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
            <span className="text-[11px] text-faint truncate">{routeSummary ? `Fluxo: ${routeSummary}` : "Rota automática ativa"}</span>
          </div>
        </div>
      )}
    </div>
  )
}
