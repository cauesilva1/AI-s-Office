"use client"

import { useEffect, useRef, useState } from "react"
import { useGameStore } from "@/store/gameStore"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Loader2, Cpu, Trash2, ArrowRightLeft } from "lucide-react"
import { initials } from "@/lib/game/engine"
import { HF_MODELS, HF_IMAGE_MODELS } from "@/lib/game/constants"
import { Agent } from "@/lib/game/types"

async function callAgent(agent: Agent, prompt: string, sectorName: string): Promise<{ text: string; imageUrl?: string }> {
  const { aiProvider, hfToken } = useGameStore.getState()
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentName: agent.name,
      agentRole: agent.role,
      sectorName,
      prompt,
      history: (agent.chatHistory || []).map(m => ({ role: m.role, content: m.content })),
      provider: aiProvider,
      hfToken,
      model: agent.model,
    }),
  })
  const data = await res.json()
  return {
    text: data.text || data.error || "(sem resposta)",
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
  }
}

export default function AgentPanel() {
  const { 
    selectedAgentId, agents, sectors, selectAgent, addAgentLog, 
    addChatMessage, clearChatHistory, setAgentModel, setAgentState, addFeedItem, showToast 
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

  const handleSend = async () => {
    const prompt = input.trim()
    if (!prompt || loading) return
    setInput("")
    setLoading(true)
    addChatMessage(agent.id, { role: "user", content: prompt, timestamp: Date.now() })
    setAgentState(agent.id, "working")

    try {
      const result = await callAgent(agent, prompt, sector?.name || "")
      addChatMessage(agent.id, { role: "assistant", content: result.text, timestamp: Date.now(), imageUrl: result.imageUrl })
      addAgentLog(agent.id, `Respondeu: ${prompt.slice(0, 40)}${prompt.length > 40 ? "…" : ""}`)
      addFeedItem({ agentId: agent.id, kind: "message", text: `respondeu uma tarefa: "${prompt.slice(0, 60)}${prompt.length > 60 ? "…" : ""}"` })
    } catch {
      addChatMessage(agent.id, { role: "assistant", content: "Erro na conexão. Verifique sua internet e o token nas configurações.", timestamp: Date.now() })
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
    const batonPrompt = `[Bastão recebido de ${agent.name} (${sector?.name || "Geral"})]\n\nTrabalho feito até aqui:\n${lastAssistant.content}\n\nContinue este trabalho a partir da perspectiva do seu setor (${targetSector?.name || "Geral"}). Aponte melhorias, próximos passos e entregue sua parte.`

    addChatMessage(target.id, { role: "user", content: batonPrompt, timestamp: Date.now(), handoffFrom: agent.name })
    addFeedItem({ agentId: agent.id, targetAgentId: target.id, kind: "handoff", text: `passou o bastão para ${target.name}` })
    addAgentLog(agent.id, `Passou o bastão para ${target.name}`)
    showToast(`Bastão passado para ${target.name} 🏃`)
    selectAgent(target.id)
    setAgentState(target.id, "working")

    try {
      const result = await callAgent({ ...target, chatHistory: [...(target.chatHistory || [])] }, batonPrompt, targetSector?.name || "")
      addChatMessage(target.id, { role: "assistant", content: result.text, timestamp: Date.now(), imageUrl: result.imageUrl })
      addAgentLog(target.id, `Recebeu o bastão de ${agent.name} e trabalhou em cima`)
      addFeedItem({ agentId: target.id, kind: "message", text: `entregou sua parte do bastão de ${agent.name}` })
    } catch {
      addChatMessage(target.id, { role: "assistant", content: "Erro ao processar o bastão. Tente reenviar.", timestamp: Date.now() })
    } finally {
      setAgentState(target.id, "idle")
      setHandoffLoading(false)
    }
  }

  const otherAgents = agents.filter(a => a.id !== agent.id)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="absolute top-0 right-0 z-50 w-[420px] h-full bg-[#101a29] border-l border-cyan-400/15 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-start gap-3">
          <div 
            className="w-12 h-12 rounded-full bg-field border-2 flex items-center justify-center font-display font-bold text-lg text-white flex-shrink-0"
            style={{ borderColor: agent.color }}
          >
            {initials(agent.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-white text-lg leading-tight">{agent.name}</h3>
            <p className="text-white/50 text-xs">{agent.role} · {sector?.name}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Cpu className="w-3 h-3 text-white/30 flex-shrink-0" />
              <select
                value={agent.model}
                onChange={(e) => setAgentModel(agent.id, e.target.value)}
                className="bg-cyan-500/8 border border-cyan-400/20 rounded-md text-[10px] text-cyan-100/80 px-1.5 py-0.5 max-w-[240px] focus:outline-none focus:border-cyan-300/45"
              >
                {!HF_MODELS.includes(agent.model) && !HF_IMAGE_MODELS.includes(agent.model) && (
                  <option value={agent.model}>{agent.model}</option>
                )}
                <optgroup label="Chat">
                  {HF_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </optgroup>
                <optgroup label="Imagem (Design)">
                  {HF_IMAGE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </optgroup>
              </select>
            </div>
          </div>
          <button 
            onClick={() => selectAgent(null)}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {history.length === 0 && (
            <div className="text-white/30 text-sm text-center mt-8 px-6">
              Dê uma tarefa para {agent.name}. Depois você pode passar a resposta para outro agente continuar.
            </div>
          )}
          {history.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {msg.handoffFrom && (
                <div className="flex items-center gap-1 text-[10px] text-amber-400/80 mb-0.5">
                  <ArrowRightLeft className="w-3 h-3" />
                  Bastão de {msg.handoffFrom}
                </div>
              )}
              <div 
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user" 
                    ? msg.handoffFrom 
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-100/80 rounded-br-sm" 
                      : "bg-violet-500/90 text-white rounded-br-sm"
                    : "bg-cyan-500/8 border border-cyan-400/10 text-cyan-50/90 rounded-bl-sm"
                }`}
              >
                {msg.content}
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Imagem gerada"
                    className="mt-2 rounded-xl border border-white/10 max-w-full"
                  />
                )}
              </div>
            </div>
          ))}
          {(loading || handoffLoading) && (
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              {agent.name} está trabalhando…
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Handoff */}
        {lastAssistant && otherAgents.length > 0 && (
          <div className="px-4 pb-2 relative">
            {handoffOpen && (
              <div className="absolute bottom-full left-4 right-4 mb-1 bg-panel border border-line rounded-xl overflow-hidden shadow-xl z-10">
                {otherAgents.map(t => {
                  const tSector = sectors.find(s => s.id === t.sectorId)
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleHandoff(t)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                    >
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-[10px] flex-shrink-0"
                        style={{ backgroundColor: t.color, color: "#0c140d" }}
                      >
                        {initials(t.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white/90 text-xs font-bold">{t.name}</div>
                        <div className="text-white/40 text-[10px]">{t.role} · {tSector?.name}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            <button
              onClick={() => setHandoffOpen(o => !o)}
              disabled={handoffLoading}
              className="w-full flex items-center justify-center gap-2 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-400/30 text-violet-200 font-display font-bold text-xs uppercase tracking-wider rounded-full py-2 transition-colors disabled:opacity-50"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Passar o bastão
            </button>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-white/5">
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
              className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 resize-none"
            />
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full p-2.5 transition-all active:scale-95"
                title="Enviar"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
              <button
                onClick={() => clearChatHistory(agent.id)}
                disabled={history.length === 0}
                className="bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white/50 rounded-full p-2.5 transition-colors"
                title="Limpar conversa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
