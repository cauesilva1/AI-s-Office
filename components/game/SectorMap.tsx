"use client"

import { useGameStore } from "@/store/gameStore"
import { motion, AnimatePresence } from "framer-motion"
import { X, Cpu } from "lucide-react"
import { initials } from "@/lib/game/engine"

export default function SectorMap() {
  const { showSectorMap, sectors, agents, desks, toggleModal, selectAgent } = useGameStore()

  if (!showSectorMap) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => toggleModal("sectorMap")}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#16241a] border border-white/5 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-5 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#16241a]">
            <h2 className="font-display font-bold text-white text-lg">Setores e Equipe</h2>
            <button onClick={() => toggleModal("sectorMap")} className="text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 grid grid-cols-2 gap-3">
            {sectors.map(sector => {
              const sectorAgents = agents.filter(a => a.sectorId === sector.id)
              const freeDesks = desks.filter(d => d.sectorId === sector.id && !d.agentId).length

              return (
                <div 
                  key={sector.id} 
                  className="rounded-xl p-4 border bg-white/5 border-white/10"
                  style={{ borderLeftColor: sector.color, borderLeftWidth: 3 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold" style={{ color: sector.color }}>
                      {sector.name}
                    </h3>
                    <span className="text-white/30 text-[10px]">{freeDesks} mesa{freeDesks !== 1 ? "s" : ""} livre{freeDesks !== 1 ? "s" : ""}</span>
                  </div>

                  {sectorAgents.length === 0 && (
                    <p className="text-white/30 text-xs">Nenhuma IA neste setor ainda.</p>
                  )}

                  <div className="flex flex-col gap-2">
                    {sectorAgents.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => { toggleModal("sectorMap"); selectAgent(agent.id) }}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors text-left"
                      >
                        <div 
                          className="w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-[10px] flex-shrink-0"
                          style={{ backgroundColor: agent.color, color: "#0c140d" }}
                        >
                          {initials(agent.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white/90 text-xs font-bold">{agent.name}</div>
                          <div className="text-white/40 text-[10px] flex items-center gap-1">
                            <Cpu className="w-2.5 h-2.5" />
                            {agent.model.split("/").pop()}
                          </div>
                        </div>
                        <div 
                          className={`ml-auto w-2 h-2 rounded-full flex-shrink-0 ${agent.spriteState === "working" ? "bg-amber-400" : "bg-emerald-400"}`}
                          title={agent.spriteState === "working" ? "Trabalhando" : "Disponível"}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
