"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ArrowRightLeft, Cpu, Loader2, Send, Trash2, X } from "lucide-react"
import { useGameStore } from "@/store/gameStore"
import RobotAvatar from "@/components/office/RobotAvatar"
import { HF_IMAGE_MODELS, modelsForSector } from "@/lib/game/constants"
import { Agent } from "@/lib/game/types"
import { activeApiKey, modelsForProvider } from "@/lib/ai/providers"
import { isProviderAuthError } from "@/lib/ai/remapModels"
import { friendlyErrorLine } from "@/lib/ai/friendlyErrors"
import { detectMediaModality, isMediaModality } from "@/lib/ai/mediaModality"
import { catalogForProvider, roleLabel } from "@/lib/ai/sectorModelCatalog"

async function callAgent(agent: Agent, prompt: string, sectorName: string): Promise<{
  text: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
}> {
  const { aiProvider, apiKeys, hfToken, setProviderError } = useGameStore.getState()
  const apiKey = activeApiKey(aiProvider, apiKeys, hfToken)
  const modality = detectMediaModality(prompt)
  const useMedia = agent.sectorId === "design" && isMediaModality(modality)
  const res = await fetch(useMedia ? "/api/media" : "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentName: agent.name,
      agentRole: agent.role,
      sectorName,
      sectorId: agent.sectorId,
      prompt,
      history: (agent.chatHistory || []).map(m => ({ role: m.role, content: m.content })),
      provider: aiProvider,
      apiKey,
      hfToken: apiKey,
      model: agent.model,
      customSystemPrompt: agent.systemPrompt,
      ...(useMedia ? { mediaModality: modality } : {}),
    }),
  })
  const data = await res.json()
  if (data?.error) {
    const msg = friendlyErrorLine(String(data.error))
    if (isProviderAuthError(String(data.error))) setProviderError(msg)
    throw new Error(msg)
  }
  return {
    text: data.text || "(sem resposta)",
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
    videoUrl: typeof data.videoUrl === "string" ? data.videoUrl : undefined,
    audioUrl: typeof data.audioUrl === "string" ? data.audioUrl : undefined,
  }
}

/** Chat do agente embutido na coluna direita (sem overlay fullscreen) */
export default function AgentChatPane() {
  const {
    selectedAgentId, agents, sectors, selectAgent, addAgentLog,
    addChatMessage, clearChatHistory, setAgentModel, setAgentState, addFeedItem, showToast,
    aiProvider,
    requestOpenSettings,
    providerError,
  } = useGameStore()
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [handoffLoading, setHandoffLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const agent = agents.find(a => a.id === selectedAgentId)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [agent?.chatHistory?.length, loading])

  useEffect(() => {
    setInput("")
    setHandoffOpen(false)
  }, [selectedAgentId])

  useEffect(() => {
    if (!selectedAgentId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") selectAgent(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedAgentId, selectAgent])

  if (!agent) return null

  const sector = sectors.find(s => s.id === agent.sectorId)
  const history = agent.chatHistory || []
  const lastAssistant = [...history].reverse().find(m => m.role === "assistant")
  const otherAgents = agents.filter(a => a.id !== agent.id)

  const handleSend = async () => {
    const prompt = input.trim()
    if (!prompt || loading) return
    setInput("")
    setLoading(true)
    addChatMessage(agent.id, { role: "user", content: prompt, timestamp: Date.now() })
    setAgentState(agent.id, "working")
    try {
      const result = await callAgent(agent, prompt, sector?.name || "")
      addChatMessage(agent.id, {
        role: "assistant",
        content: result.text,
        timestamp: Date.now(),
        imageUrl: result.imageUrl,
        videoUrl: result.videoUrl,
        audioUrl: result.audioUrl,
      })
      addAgentLog(agent.id, `Respondeu: ${prompt.slice(0, 40)}${prompt.length > 40 ? "…" : ""}`)
      addFeedItem({ agentId: agent.id, kind: "message", text: `respondeu: "${prompt.slice(0, 60)}${prompt.length > 60 ? "…" : ""}"` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro na conexão. Verifique internet e a API key."
      addChatMessage(agent.id, {
        role: "assistant",
        content: msg,
        timestamp: Date.now(),
      })
      if (isProviderAuthError(msg)) showToast("Problema com a API key")
    } finally {
      setAgentState(agent.id, "idle")
      setLoading(false)
    }
  }

  const handleHandoff = async (target: Agent) => {
    if (!lastAssistant || handoffLoading) return
    setHandoffOpen(false)
    setHandoffLoading(true)
    const targetSector = sectors.find(s => s.id === target.sectorId)
    const batonPrompt = `[Bastão recebido de ${agent.name} (${sector?.name || "Geral"})]\n\nTrabalho feito até aqui:\n${lastAssistant.content}\n\nContinue este trabalho a partir da perspectiva do seu setor (${targetSector?.name || "Geral"}).`

    addChatMessage(target.id, { role: "user", content: batonPrompt, timestamp: Date.now(), handoffFrom: agent.name })
    addFeedItem({ agentId: agent.id, targetAgentId: target.id, kind: "handoff", text: `passou o bastão para ${target.name}` })
    addAgentLog(agent.id, `Passou o bastão para ${target.name}`)
    showToast(`Bastão para ${target.name}`)
    selectAgent(target.id)
    setAgentState(target.id, "working")

    try {
      const result = await callAgent({ ...target, chatHistory: [...(target.chatHistory || [])] }, batonPrompt, targetSector?.name || "")
      addChatMessage(target.id, {
        role: "assistant",
        content: result.text,
        timestamp: Date.now(),
        imageUrl: result.imageUrl,
        videoUrl: result.videoUrl,
        audioUrl: result.audioUrl,
      })
      addAgentLog(target.id, `Recebeu bastão de ${agent.name}`)
      addFeedItem({ agentId: target.id, kind: "message", text: `entregou sua parte do bastão de ${agent.name}` })
    } catch {
      addChatMessage(target.id, { role: "assistant", content: "Erro ao processar o bastão.", timestamp: Date.now() })
    } finally {
      setAgentState(target.id, "idle")
      setHandoffLoading(false)
    }
  }

  return (
    <motion.div
      key={agent.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.18 }}
      className="h-full flex flex-col min-h-0 bg-cream"
    >
      {providerError && (
        <div className="flex-shrink-0 border-b-2 border-ink bg-coral/15 px-3 py-2 flex items-center gap-2">
          <p className="flex-1 text-[10px] text-ink line-clamp-2">{providerError}</p>
          <button
            type="button"
            onClick={() => requestOpenSettings()}
            className="text-[10px] font-bold border-2 border-ink px-2 py-0.5 bg-paper flex-shrink-0"
          >
            Abrir API
          </button>
        </div>
      )}
      <div className="p-3 border-b-2 border-ink bg-paper flex items-start gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => selectAgent(null)}
          className="border-2 border-ink p-1 hover:bg-cream-2 mt-0.5"
          title="Voltar aos times"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <RobotAvatar
          color={agent.color}
          working={agent.spriteState === "working" || loading || handoffLoading}
          size="lg"
          bubbleText={loading || handoffLoading || agent.spriteState === "working" ? "…" : undefined}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-ink truncate">{agent.name}</h3>
          <p className="text-[10px] text-muted-ink truncate">
            {agent.role} · {sector?.name}
            {agent.specialistId ? " · especialista" : ""}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Cpu className="w-3 h-3 text-muted-ink flex-shrink-0" />
            <select
              value={agent.model}
              onChange={(e) => setAgentModel(agent.id, e.target.value)}
              className="bg-cream border border-ink text-[10px] text-ink px-1 py-0.5 max-w-full truncate focus:outline-none"
            >
              {(() => {
                const curated = catalogForProvider(aiProvider, agent.sectorId)
                if (curated.length > 0) {
                  const listed = curated.some(c => c.id === agent.model)
                  return (
                    <>
                      {!listed && <option value={agent.model}>{agent.model}</option>}
                      {curated.map(c => (
                        <option key={c.id} value={c.id}>
                          [{roleLabel(c.role)}] {c.label}
                        </option>
                      ))}
                    </>
                  )
                }
                if (aiProvider === "huggingface" || aiProvider === "mock") {
                  const sectorModels = modelsForSector(agent.sectorId)
                  const extras = HF_IMAGE_MODELS.filter(m => !sectorModels.includes(m))
                  const listed = sectorModels.includes(agent.model) || extras.includes(agent.model)
                  return (
                    <>
                      {!listed && <option value={agent.model}>{agent.model}</option>}
                      <optgroup label="Do setor">
                        {sectorModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </optgroup>
                      {extras.length > 0 && (
                        <optgroup label="Imagem">
                          {extras.map(m => <option key={m} value={m}>{m}</option>)}
                        </optgroup>
                      )}
                    </>
                  )
                }
                const catalog = modelsForProvider(aiProvider)
                return (
                  <>
                    {!catalog.includes(agent.model) && <option value={agent.model}>{agent.model}</option>}
                    {catalog.map(m => <option key={m} value={m}>{m}</option>)}
                  </>
                )
              })()}
            </select>
          </div>
        </div>
        <button type="button" onClick={() => selectAgent(null)} className="border-2 border-ink p-1 hover:bg-coral hover:text-cream">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
        {history.length === 0 && (
          <p className="text-muted-ink text-xs text-center mt-6 px-2">
            Dê uma tarefa. Depois passe o bastão se quiser.
          </p>
        )}
        {history.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            {msg.handoffFrom && (
              <div className="flex items-center gap-1 text-[10px] text-coral mb-0.5">
                <ArrowRightLeft className="w-3 h-3" />
                Bastão de {msg.handoffFrom}
              </div>
            )}
            <div
              className={`max-w-[92%] border-2 border-ink px-2.5 py-1.5 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? msg.handoffFrom ? "bg-coral/15 text-ink" : "bg-navy text-cream"
                  : "bg-paper text-ink"
              }`}
            >
              {msg.content}
              {msg.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={msg.imageUrl} alt="Gerada" className="mt-2 border border-ink max-w-full" />
              )}
              {msg.videoUrl && (
                <video src={msg.videoUrl} controls className="mt-2 border border-ink max-w-full" />
              )}
              {msg.audioUrl && (
                <audio src={msg.audioUrl} controls className="mt-2 w-full" />
              )}
            </div>
          </div>
        ))}
        {(loading || handoffLoading) && (
          <div className="flex items-center gap-2 text-muted-ink text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {agent.name} trabalhando…
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {lastAssistant && otherAgents.length > 0 && (
        <div className="px-3 pb-2 relative flex-shrink-0">
          <AnimatePresence>
            {handoffOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute bottom-full left-3 right-3 mb-1 bg-paper border-2 border-ink z-10 max-h-40 overflow-y-auto shadow-pixel-sm"
              >
                {otherAgents.map(t => {
                  const tSector = sectors.find(s => s.id === t.sectorId)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleHandoff(t)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-cream border-b border-ink/15 last:border-0 text-left"
                    >
                      <RobotAvatar color={t.color} size="sm" showBubble={false} />
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-ink">{t.name}</div>
                        <div className="text-[10px] text-muted-ink">{tSector?.name}</div>
                      </div>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setHandoffOpen(o => !o)}
            disabled={handoffLoading}
            className="w-full text-[11px] font-bold flex items-center justify-center gap-1.5 bg-paper border-2 border-ink py-1.5 disabled:opacity-50"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Passar bastão
          </button>
        </div>
      )}

      <div className="p-3 border-t-2 border-ink bg-paper flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={`Tarefa para ${agent.name}…`}
            rows={2}
            className="flex-1 bg-cream border-2 border-ink p-2 text-ink text-xs placeholder:text-muted-ink focus:outline-none focus:border-coral resize-none"
          />
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="bg-coral border-2 border-ink text-cream p-2 disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => clearChatHistory(agent.id)}
              disabled={history.length === 0}
              className="bg-cream border-2 border-ink text-ink p-2 disabled:opacity-30"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
