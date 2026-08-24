"use client"

import { useMemo, useRef, useState } from "react"
import { useGameStore } from "@/store/gameStore"
import { Check, Copy, Loader2, Send, Sparkles, X, Route, Play } from "lucide-react"
import { autoRoute, buildPipeline, RouteDecision } from "@/lib/orchestrator/hybridRouter"
import { dispatchSectorEnsemble, dispatchStep } from "@/lib/orchestrator/dispatch"
import { routeIncludesDesign, summarizeForHandoff } from "@/lib/orchestrator/handoff"
import { MissionStep } from "@/lib/game/types"
import RobotAvatar from "@/components/office/RobotAvatar"
import { activeApiKey, providerNeedsKey } from "@/lib/ai/providers"
import { isProviderAuthError } from "@/lib/ai/remapModels"
import { isImageModel } from "@/lib/game/constants"
import { isEnsembleProvider } from "@/lib/ai/officeMode"

function sectorNameById(id: string, sectors: { id: string; name: string }[]): string {
  return sectors.find(s => s.id === id)?.name || id
}

type StepPhase = "pending" | "running" | "done"
type Phase = "idle" | "planning" | "preview" | "running"

export default function MissionComposer({ compact = false }: { compact?: boolean }) {
  const {
    sectors,
    agents,
    aiProvider,
    apiKeys,
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
    setProviderError,
    requestOpenSettings,
    serverProviders,
  } = useGameStore()

  const [prompt, setPrompt] = useState("")
  const [decision, setDecision] = useState<RouteDecision | null>(null)
  const [previewRoute, setPreviewRoute] = useState<MissionStep[]>([])
  const [liveRoute, setLiveRoute] = useState<MissionStep[]>([])
  const [stepIndex, setStepIndex] = useState(-1)
  const [phase, setPhase] = useState<Phase>("idle")
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [showAdjust, setShowAdjust] = useState(false)
  const [manualSectorId, setManualSectorId] = useState(sectors[0]?.id || "engineering")
  const [manualRoute, setManualRoute] = useState<MissionStep[]>([])
  const cancelRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const workingIdsRef = useRef<Set<string>>(new Set())

  const missionBusy = phase === "planning" || phase === "running" || Boolean(activeMission)
  const apiKey = activeApiKey(aiProvider, apiKeys, hfToken)
  const hasServerKey = aiProvider !== "mock" && serverProviders.includes(aiProvider)
  const needsToken = providerNeedsKey(aiProvider, apiKeys, hfToken) && !hasServerKey
  const hfKey = activeApiKey("huggingface", apiKeys, hfToken) || (serverProviders.includes("huggingface") ? "server" : "")

  const routeSummary = useMemo(
    () => manualRoute.map(step => sectorNameById(step.sectorId, sectors)).join(" → "),
    [manualRoute, sectors]
  )

  const previewHasDesign = routeIncludesDesign(previewRoute)
  const designNeedsHf =
    previewHasDesign &&
    (aiProvider !== "huggingface" || !hfKey) &&
    previewRoute.some(step => {
      const agent = agents.find(a => a.id === step.agentId)
      return agent && (step.sectorId === "design" || isImageModel(agent.model))
    })

  const stepPhase = (idx: number): StepPhase => {
    if (idx < stepIndex) return "done"
    if (idx === stepIndex && phase === "running") return "running"
    return "pending"
  }

  const markWorking = (agentId: string) => {
    workingIdsRef.current.add(agentId)
    setAgentState(agentId, "working")
  }

  const markIdle = (agentId: string) => {
    workingIdsRef.current.delete(agentId)
    setAgentState(agentId, "idle")
  }

  const forceAllIdle = () => {
    workingIdsRef.current.forEach(id => setAgentState(id, "idle"))
    workingIdsRef.current.clear()
    // Também limpa qualquer agente stuck no store
    useGameStore.getState().agents.forEach(a => {
      if (a.spriteState === "working") setAgentState(a.id, "idle")
    })
  }

  const executeMission = async (content: string, route: MissionStep[], routeDecision: RouteDecision | null) => {
    const validRoute = route.filter(step => step.agentId)
    if (validRoute.length === 0) {
      showToast("Nenhum agente disponível para essa rota")
      setPhase("idle")
      return
    }

    cancelRef.current = false
    abortRef.current = new AbortController()
    setLiveRoute(validRoute)
    setStepIndex(0)
    setLastResult(null)
    setPhase("running")
    setPreviewRoute([])

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

        const handoffNote = i === 0
          ? content
          : `[Bastão · resumo]\n${summarizeForHandoff(previousResult)}`

        addFeedItem({
          missionId: mission.id,
          stage: i + 1,
          agentId: agent.id,
          kind: i === 0 ? "info" : "handoff",
          text: i === 0
            ? `Iniciou missão no setor ${sectorName}`
            : `Recebeu bastão (resumo) · etapa ${i + 1} (${sectorName})`,
        })

        addChatMessage(agent.id, {
          role: "user",
          content: handoffNote,
          timestamp: Date.now(),
          handoffFrom: i === 0 ? undefined : "Pipeline automático",
        })

        const sectorTeam = isEnsembleProvider(aiProvider)
          ? agents.filter(a => a.sectorId === step.sectorId)
          : [agent]

        sectorTeam.forEach(a => markWorking(a.id))
        let result: { text: string; imageUrl?: string; parts?: Array<{ agentId: string; model: string; text: string }> }
        try {
          if (isEnsembleProvider(aiProvider) && sectorTeam.length > 1) {
            addFeedItem({
              missionId: mission.id,
              stage: i + 1,
              agentId: agent.id,
              kind: "info",
              text: `Trio em paralelo · ${sectorTeam.length} modelos (${sectorName})`,
            })
            result = await dispatchSectorEnsemble({
              step,
              sectorAgents: sectorTeam,
              sectorName,
              missionPrompt: content,
              previousResult,
              provider: aiProvider,
              apiKey,
              signal: abortRef.current?.signal,
            })
          } else {
            result = await dispatchStep({
              step,
              agent,
              sectorName,
              missionPrompt: content,
              previousResult,
              provider: aiProvider,
              apiKey,
              signal: abortRef.current?.signal,
            })
          }
        } finally {
          sectorTeam.forEach(a => markIdle(a.id))
        }

        if (cancelRef.current) throw new Error("Missão cancelada pelo usuário")

        if (result.parts) {
          for (const part of result.parts) {
            addChatMessage(part.agentId, {
              role: "assistant",
              content: part.text,
              timestamp: Date.now(),
            })
            addAgentLog(part.agentId, `Etapa ${i + 1} · ângulo paralelo`)
          }
          addChatMessage(agent.id, {
            role: "assistant",
            content: `【Síntese do trio】\n${result.text}`,
            timestamp: Date.now(),
            imageUrl: result.imageUrl,
          })
        } else {
          addChatMessage(agent.id, {
            role: "assistant",
            content: result.text,
            timestamp: Date.now(),
            imageUrl: result.imageUrl,
          })
        }
        addAgentLog(agent.id, `Etapa ${i + 1} da missão concluída`)
        addFeedItem({
          missionId: mission.id,
          stage: i + 1,
          agentId: agent.id,
          kind: "message",
          text: isEnsembleProvider(aiProvider)
            ? `Síntese do trio · etapa ${i + 1}: ${sectorName}`
            : `Concluiu etapa ${i + 1}: ${sectorName}`,
        })
        previousResult = result.imageUrl
          ? `${result.text}\n\n[imagem gerada pelo Design]`
          : result.text
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
      setPhase("idle")
    } catch (error) {
      forceAllIdle()
      const aborted =
        (error instanceof Error && error.name === "AbortError") ||
        (error instanceof Error && /cancelad/i.test(error.message))
      const message = aborted
        ? "Missão cancelada pelo usuário"
        : error instanceof Error
          ? error.message
          : "Falha na execução da missão"
      failActiveMission(message)
      showToast(message)
      if (!aborted && isProviderAuthError(message)) setProviderError(message)
      setStepIndex(-1)
      setLiveRoute([])
      setPhase("idle")
    } finally {
      abortRef.current = null
      forceAllIdle()
    }
  }

  /** Monta preview — não executa ainda */
  const planMission = async () => {
    const content = prompt.trim()
    if (!content || missionBusy) return

    setPhase("planning")
    setLastResult(null)
    try {
      let route: MissionStep[]
      let routeDecision: RouteDecision | null = null

      if (showAdjust && manualRoute.filter(s => s.agentId).length > 0) {
        route = manualRoute
      } else {
        routeDecision = await autoRoute({
          prompt: content,
          sectors,
          provider: aiProvider,
          apiKey,
        })
        route = buildPipeline(routeDecision.primarySectorId, agents)
        setDecision(routeDecision)
      }

      const valid = route.filter(s => s.agentId)
      if (valid.length === 0) {
        showToast("Nenhum agente disponível para essa rota")
        setPhase("idle")
        return
      }

      setPreviewRoute(valid)
      setPhase("preview")
      showToast(`Rota pronta: ${valid.map(s => sectorNameById(s.sectorId, sectors)).join(" → ")}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao montar rota"
      showToast(message)
      setPhase("idle")
    }
  }

  const confirmPreview = async () => {
    const content = prompt.trim()
    if (!content || previewRoute.length === 0) return
    await executeMission(content, previewRoute, decision)
  }

  const discardPreview = () => {
    setPreviewRoute([])
    setDecision(null)
    setPhase("idle")
  }

  const cancelMission = () => {
    cancelRef.current = true
    abortRef.current?.abort()
    forceAllIdle()
    showToast("Cancelando missão...")
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (phase === "preview") confirmPreview()
      else if (!missionBusy) planMission()
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
    <div id="missao" className={compact ? "h-full flex flex-col" : "bg-paper border-[3px] border-ink shadow-pixel p-4 sm:p-5"}>
      {needsToken && (
        <div className="w-full mb-3 flex items-start gap-2 bg-amber-50 border-2 border-ink px-3 py-2">
          <Sparkles className="w-3.5 h-3.5 text-coral flex-shrink-0 mt-0.5" />
          <span className="flex-1 text-[11px] text-ink leading-relaxed">
            Sem API key — respostas em simulação.
          </span>
          <button
            type="button"
            onClick={() => requestOpenSettings()}
            className="text-[10px] font-bold border-2 border-ink px-2 py-1 bg-paper hover:bg-coral hover:text-cream flex-shrink-0"
          >
            Abrir API
          </button>
        </div>
      )}

      <label className="text-sm font-bold text-ink mb-2 block">Missão</label>
      <p className="text-[11px] text-muted-ink mb-2">
        Descreva o briefing. Você vê a rota antes de executar.
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={onKeyDown}
        rows={compact ? 4 : 3}
        disabled={missionBusy && phase !== "preview"}
        placeholder="Ex.: Crie um landing page copy e um plano de deploy…"
        className="w-full bg-paper border-[3px] border-ink p-3 text-ink text-sm placeholder:text-muted-ink focus:outline-none focus:border-coral resize-none disabled:opacity-50"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {phase === "idle" || phase === "planning" ? (
          <button
            onClick={planMission}
            disabled={!prompt.trim() || phase === "planning"}
            className="text-xs font-bold inline-flex items-center gap-1.5 bg-coral text-cream border-[3px] border-ink shadow-pixel-sm px-4 py-2 disabled:opacity-40"
          >
            {phase === "planning" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Route className="w-3.5 h-3.5" />
            )}
            {phase === "planning" ? "Montando rota…" : "Montar rota"}
          </button>
        ) : phase === "preview" ? (
          <>
            <button
              onClick={confirmPreview}
              className="text-xs font-bold inline-flex items-center gap-1.5 bg-coral text-cream border-[3px] border-ink shadow-pixel-sm px-4 py-2"
            >
              <Play className="w-3.5 h-3.5" />
              Confirmar e executar
            </button>
            <button
              onClick={discardPreview}
              className="text-xs font-bold inline-flex items-center gap-1.5 bg-paper text-ink border-2 border-ink px-3 py-2"
            >
              Descartar
            </button>
          </>
        ) : (
          <button
            onClick={cancelMission}
            className="text-xs font-bold inline-flex items-center gap-1.5 bg-ink text-cream border-[3px] border-ink px-4 py-2"
          >
            <X className="w-3.5 h-3.5" />
            Cancelar
          </button>
        )}

        <button
          onClick={() => setShowAdjust(v => !v)}
          disabled={missionBusy}
          className={`text-xs font-bold border-2 border-ink px-3 py-2 disabled:opacity-40 ${
            showAdjust ? "bg-navy text-cream" : "bg-paper text-ink"
          }`}
        >
          Ajustar rota
        </button>

        {decision && phase === "preview" && (
          <span className="text-[11px] text-muted-ink">
            via {decision.strategy === "rules" ? "regras" : "IA"} ({Math.round(decision.confidence * 100)}%)
          </span>
        )}
      </div>

      {/* Preview da rota */}
      {phase === "preview" && previewRoute.length > 0 && (
        <div className="mt-3 border-[3px] border-ink bg-paper p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink mb-2">
            Preview da rota
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {previewRoute.map((step, idx) => {
              const agent = agents.find(a => a.id === step.agentId)
              return (
                <div key={`${step.sectorId}-${idx}`} className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 border-2 border-ink bg-cream px-2 py-1">
                    {agent && <RobotAvatar color={agent.color} size="sm" showBubble={false} />}
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-ink">
                        {idx + 1}. {sectorNameById(step.sectorId, sectors)}
                      </div>
                      <div className="text-[9px] text-muted-ink truncate max-w-[8rem]">
                        {agent?.name || "sem agente"}
                      </div>
                    </div>
                  </div>
                  {idx < previewRoute.length - 1 && <span className="text-muted-ink text-xs">→</span>}
                </div>
              )
            })}
          </div>

          {designNeedsHf && (
            <div className="mt-2 border-2 border-coral bg-coral/10 px-2.5 py-2 text-[11px] text-ink leading-relaxed">
              <strong>Design / FLUX:</strong> a rota inclui Design, mas o provedor ativo não é Hugging Face
              {hfKey ? "" : " (ou falta o token HF)"}. A imagem pode sair em <em>simulação</em>.
              Para FLUX real, salve um token HF em API ou troque o modelo do agente de Design para texto.
            </div>
          )}

          <p className="text-[10px] text-muted-ink mt-2">
            Entre etapas o bastão leva só um <strong>resumo</strong>, não o texto inteiro.
          </p>
        </div>
      )}

      {/* Pipeline ao vivo */}
      {phase === "running" && liveRoute.length > 0 && (
        <div className="mt-3 border-[3px] border-ink bg-navy text-cream p-3 overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(45,143,111,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(45,143,111,0.5) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
          <div className="relative text-[10px] font-bold uppercase tracking-wider text-coral mb-2">
            Pipeline ao vivo
          </div>
          <div className="relative flex items-end gap-2 flex-wrap">
            {liveRoute.map((step, idx) => {
              const sp = stepPhase(idx)
              const agent = agents.find(a => a.id === step.agentId)
              return (
                <div key={`${step.sectorId}-${idx}`} className="flex items-end gap-2">
                  <div className="flex flex-col items-center gap-1.5">
                    {agent ? (
                      <RobotAvatar
                        color={agent.color}
                        working={sp === "running"}
                        size="md"
                        bubbleText={
                          sp === "running" ? "trabalhando…" :
                          sp === "done" ? "ok!" :
                          undefined
                        }
                        showBubble={sp !== "pending"}
                      />
                    ) : (
                      <div className="w-9 h-9 border-2 border-cream/40" />
                    )}
                    <div
                      className={`inline-flex items-center gap-1 border-2 border-ink px-2 py-0.5 text-[10px] font-bold ${
                        sp === "done"
                          ? "bg-grid text-ink"
                          : sp === "running"
                            ? "bg-coral text-cream"
                            : "bg-paper text-ink"
                      }`}
                    >
                      {sp === "done" && <Check className="w-3 h-3" />}
                      {sp === "running" && <Loader2 className="w-3 h-3 animate-spin" />}
                      {sectorNameById(step.sectorId, sectors)}
                    </div>
                    {sp === "running" && (
                      <div className="w-16 h-1 bg-cream/20 overflow-hidden border border-cream/30">
                        <div className="h-full bg-coral animate-pulse" style={{ width: "70%" }} />
                      </div>
                    )}
                  </div>
                  {idx < liveRoute.length - 1 && (
                    <span className="text-cream/50 text-xs mb-6">→</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {lastResult && phase === "idle" && (
        <div className="mt-3 border-2 border-ink bg-cream p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-[11px] text-ink">Resultado</span>
            <div className="flex items-center gap-1">
              <button onClick={copyResult} className="p-1.5 border border-ink hover:bg-paper" title="Copiar">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setLastResult(null)} className="p-1.5 border border-ink hover:bg-paper" title="Fechar">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto text-xs text-ink whitespace-pre-wrap leading-relaxed">
            {lastResult}
          </div>
        </div>
      )}

      {showAdjust && !missionBusy && (
        <div className="mt-3 border-2 border-ink bg-cream p-2.5">
          <div className="text-[11px] text-muted-ink mb-2">
            Monte a rota manualmente. Vazia = roteamento automático no “Montar rota”.
          </div>
          {manualRoute.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {manualRoute.map((step, idx) => (
                <div key={`${step.sectorId}-${idx}`} className="inline-flex items-center gap-1 bg-paper border-2 border-ink px-2 py-1 text-[11px]">
                  <span>{idx + 1}. {sectorNameById(step.sectorId, sectors)}</span>
                  <button onClick={() => removeManualStep(idx)} className="text-coral">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={manualSectorId}
              onChange={(e) => setManualSectorId(e.target.value)}
              className="bg-paper border-2 border-ink px-2 py-1 text-xs text-ink"
            >
              {sectors.map(sector => (
                <option key={sector.id} value={sector.id}>{sector.name}</option>
              ))}
            </select>
            <button
              onClick={addManualStep}
              className="text-[11px] font-bold bg-navy text-cream border-2 border-ink px-3 py-1.5"
            >
              + Etapa
            </button>
            <span className="text-[11px] text-muted-ink truncate">{routeSummary || "Rota automática"}</span>
          </div>
        </div>
      )}
    </div>
  )
}
