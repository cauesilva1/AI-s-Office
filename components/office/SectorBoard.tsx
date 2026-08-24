"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useGameStore } from "@/store/gameStore"
import RobotAvatar from "@/components/office/RobotAvatar"
import { cn } from "@/lib/utils"
import { isEnsembleProvider, isSoloProvider } from "@/lib/ai/officeMode"

export default function SectorBoard() {
  const { sectors, agents, desks, selectedAgentId, selectAgent, aiProvider } = useGameStore()
  const [openId, setOpenId] = useState<string | null>(sectors[0]?.id ?? null)
  const solo = isSoloProvider(aiProvider)
  const ensemble = isEnsembleProvider(aiProvider)

  return (
    <div className="h-full flex flex-col min-h-0 bg-[linear-gradient(180deg,#fffdf8_0%,#f3efe4_100%)]">
      <div className="px-3 py-2.5 border-b-2 border-ink bg-paper flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">Times</h2>
          <span className="text-[9px] font-bold border-2 border-ink px-1.5 py-0.5 bg-cream">
            {solo ? "Solo · 6 sêniores" : ensemble ? "OR · trio/setor" : "HF · time"}
          </span>
        </div>
        <p className="text-[11px] text-muted-ink">
          {solo
            ? "1 sênior por setor · clique para abrir o chat"
            : ensemble
              ? "3 modelos em paralelo · síntese na missão"
              : "Setor → robô → chat"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {sectors.map((sector, si) => {
          const sectorAgents = agents.filter(a => a.sectorId === sector.id)
          const free = desks.filter(d => d.sectorId === sector.id && !d.agentId).length
          const open = openId === sector.id
          const busy = sectorAgents.some(a => a.spriteState === "working")

          return (
            <motion.div
              key={sector.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.04 }}
              className="border-b-2 border-ink"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : sector.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-cream-2 transition-colors"
              >
                <span className="w-2.5 h-2.5 border-2 border-ink flex-shrink-0" style={{ background: sector.color }} />
                <span className="flex-1 text-xs font-bold text-ink">{sector.name}</span>
                {busy && (
                  <motion.span
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="text-[9px] font-bold text-coral border border-coral px-1"
                  >
                    LIVE
                  </motion.span>
                )}
                <span className="text-[10px] text-muted-ink">
                  {solo
                    ? (sectorAgents.length ? "sênior" : "—")
                    : ensemble
                      ? `${sectorAgents.length}/3`
                      : `${free} livres`}
                </span>
                <div className="flex -space-x-1.5 mr-1">
                  {sectorAgents.slice(0, 3).map(a => (
                    <div key={a.id} className="scale-75 origin-center">
                      <RobotAvatar color={a.color} working={a.spriteState === "working"} size="sm" showBubble={false} />
                    </div>
                  ))}
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 text-muted-ink transition-transform", open && "rotate-180")} />
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden bg-cream"
                  >
                    <div className="px-2 pb-2 space-y-1.5">
                      {sectorAgents.length === 0 ? (
                        <li className="text-[11px] text-muted-ink px-2 py-2 list-none">
                          {solo
                            ? "Sem sênior neste setor"
                            : ensemble
                              ? "Sem trio neste setor"
                              : `Vazio · ${free} mesas livres`}
                        </li>
                      ) : (
                        sectorAgents.map(agent => {
                          const isWorking = agent.spriteState === "working"
                          return (
                            <li key={agent.id} className="list-none">
                              <motion.button
                                type="button"
                                layout
                                whileHover={{ x: 2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => selectAgent(agent.id)}
                                className={cn(
                                  "w-full flex items-center gap-2.5 border-2 border-ink px-2 py-2 text-left transition-colors relative",
                                  selectedAgentId === agent.id
                                    ? "bg-navy text-cream"
                                    : isWorking
                                      ? "bg-coral/10 hover:bg-coral/15"
                                      : "bg-paper hover:bg-cream-2"
                                )}
                              >
                                <RobotAvatar
                                  color={agent.color}
                                  working={isWorking}
                                  size="md"
                                  bubbleText={isWorking ? "…" : undefined}
                                />
                                <span className="min-w-0 flex-1 pt-0.5">
                                  <span className="block text-[11px] font-bold truncate">{agent.name}</span>
                                  <span className={cn(
                                    "block text-[10px] truncate",
                                    selectedAgentId === agent.id ? "text-cream/70" : "text-muted-ink"
                                  )}>
                                    {isWorking ? "resolvendo tarefa…" : agent.model.split("/").pop()}
                                  </span>
                                  {isWorking && (
                                    <span className="mt-1 block h-1 w-full max-w-[6rem] bg-ink/10 overflow-hidden border border-ink/20">
                                      <motion.span
                                        className="block h-full bg-coral"
                                        animate={{ width: ["15%", "90%", "45%"] }}
                                        transition={{ duration: 2.4, repeat: Infinity }}
                                      />
                                    </span>
                                  )}
                                </span>
                              </motion.button>
                            </li>
                          )
                        })
                      )}
                    </div>
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
