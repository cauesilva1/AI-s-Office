"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useGameStore } from "@/store/gameStore"
import RobotAvatar from "@/components/office/RobotAvatar"

const PHRASES = ["trabalhando…", "pensando…", "gerando…", "quase lá…"]

/** Faixa viva no topo do office: quem está working com bala */
export default function WorkingStrip() {
  const agents = useGameStore(s => s.agents)
  const working = agents.filter(a => a.spriteState === "working")

  return (
    <AnimatePresence>
      {working.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden border-b-2 border-ink bg-navy text-cream flex-shrink-0"
        >
          <div className="px-3 py-2 flex items-center gap-3 overflow-x-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-coral flex-shrink-0">
              Ao vivo
            </span>
            <div className="flex items-center gap-4">
              {working.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 flex-shrink-0"
                >
                  <RobotAvatar
                    color={agent.color}
                    working
                    size="sm"
                    bubbleText={PHRASES[i % PHRASES.length]}
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold truncate max-w-[7rem]">{agent.name}</div>
                    <motion.div
                      className="h-1 mt-1 bg-cream/20 overflow-hidden w-20 border border-cream/30"
                    >
                      <motion.div
                        className="h-full bg-coral"
                        initial={{ width: "8%" }}
                        animate={{ width: ["12%", "88%", "40%", "95%"] }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
