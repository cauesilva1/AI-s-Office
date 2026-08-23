"use client"

import { useEffect } from "react"
import { useGameStore } from "@/store/gameStore"
import { motion, AnimatePresence } from "framer-motion"
import { X, MessageSquare, ArrowRightLeft, Copy } from "lucide-react"
import { initials } from "@/lib/game/engine"

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return "agora"
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return `${Math.floor(diff / 86400)}d atrás`
}

export default function ChatModal() {
  const { showChat, agents, teamFeed, toggleModal, selectAgent, missionHistory, showToast } = useGameStore()

  useEffect(() => {
    if (!showChat) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleModal("chat")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [showChat, toggleModal])

  if (!showChat) return null

  const copyMissionResult = async (result: string) => {
    try {
      await navigator.clipboard.writeText(result)
      showToast("Resultado copiado")
    } catch {
      showToast("Não foi possível copiar")
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => toggleModal("chat")}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#101a29] border border-cyan-400/15 rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-display font-bold text-white text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              Team Chat
            </h2>
            <button onClick={() => toggleModal("chat")} className="text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {teamFeed.length === 0 && (
              <p className="text-white/30 text-sm text-center py-8">
                Nenhuma atividade ainda. Clique em um agente, dê uma tarefa, e o que acontecer aparece aqui.
              </p>
            )}
            {teamFeed.map(item => {
              const agent = agents.find(a => a.id === item.agentId)
              if (!agent) return null
              return (
                <div key={item.id} className="flex gap-3">
                  <button
                    onClick={() => { toggleModal("chat"); selectAgent(agent.id) }}
                    className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-xs flex-shrink-0 hover:scale-110 transition-transform"
                    style={{ backgroundColor: agent.color, color: "#0c140d" }}
                    title={`Abrir ${agent.name}`}
                  >
                    {initials(agent.name)}
                  </button>
                  <div className="min-w-0">
                    <div className="text-white/50 text-[10px] font-bold mb-0.5 flex items-center gap-1.5">
                      {agent.name}
                      <span className="text-white/25 font-normal">{timeAgo(item.timestamp)}</span>
                      {typeof item.stage === "number" && (
                        <span className="text-amber-300/80 font-normal">• etapa {item.stage}</span>
                      )}
                    </div>
                    <div className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${
                      item.kind === "handoff" 
                        ? "bg-amber-500/10 border border-amber-400/25 text-amber-200/90" 
                        : "bg-cyan-500/8 border border-cyan-400/10 text-cyan-50/85"
                    }`}>
                      {item.kind === "handoff" && <ArrowRightLeft className="w-3.5 h-3.5 flex-shrink-0" />}
                      {item.text}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {missionHistory.length > 0 && (
            <div className="border-t border-white/5 p-4 bg-white/[0.02]">
              <h3 className="text-[11px] uppercase tracking-wider text-white/40 font-bold mb-2">Histórico de missões</h3>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {missionHistory.slice(0, 8).map((mission) => (
                  <details key={mission.id} className="text-xs text-white/70 bg-white/5 rounded-lg px-2.5 py-2 group">
                    <summary className="cursor-pointer list-none">
                      <div className="text-[10px] mb-1 flex items-center gap-1.5">
                        <span className={mission.status === "completed" ? "text-emerald-400/80" : "text-red-400/80"}>
                          {mission.status === "completed" ? "CONCLUÍDA" : "FALHOU"}
                        </span>
                        <span className="text-white/30">· {timeAgo(mission.createdAt)}</span>
                      </div>
                      <div className="line-clamp-2">{mission.prompt}</div>
                    </summary>
                    {mission.finalResult && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <button
                          onClick={(e) => { e.preventDefault(); copyMissionResult(mission.finalResult!) }}
                          className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white mb-1.5"
                        >
                          <Copy className="w-3 h-3" /> Copiar resultado
                        </button>
                        <div className="max-h-32 overflow-y-auto whitespace-pre-wrap text-white/60 text-[11px] leading-relaxed">
                          {mission.finalResult}
                        </div>
                      </div>
                    )}
                    {mission.error && (
                      <div className="mt-2 pt-2 border-t border-white/10 text-red-300/70 text-[11px]">{mission.error}</div>
                    )}
                  </details>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
