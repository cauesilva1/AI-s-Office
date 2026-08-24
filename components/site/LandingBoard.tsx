"use client"

import { motion } from "framer-motion"
import { BASE_SECTORS } from "@/lib/game/constants"

const SQUAD = [
  { color: "#2dd4bf", name: "Coder", sector: "Engenharia" },
  { color: "#a78bfa", name: "Flux", sector: "Design" },
  { color: "#fbbf24", name: "Seek", sector: "Pesquisa" },
  { color: "#60a5fa", name: "Data", sector: "Dados" },
  { color: "#22d3ee", name: "Ops", sector: "DevOps" },
  { color: "#f87171", name: "Growth", sector: "Growth" },
]

function MiniBot({ color, delay }: { color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="flex flex-col items-center gap-2"
    >
      <div
        className="w-14 h-14 sm:w-16 sm:h-16 border-[3px] border-ink shadow-pixel-sm flex items-center justify-center bg-paper"
        style={{ boxShadow: `3px 3px 0 ${color}` }}
      >
        <svg width="40" height="40" viewBox="0 0 32 32" aria-hidden>
          <circle cx="16" cy="3" r="1.5" fill="#1a1a1a" />
          <rect x="15" y="4" width="2" height="3" fill="#1a1a1a" />
          <rect x="7" y="7" width="18" height="14" fill="#fffdf8" stroke="#1a1a1a" strokeWidth="2" />
          <rect x="11" y="11" width="3" height="3" fill="#1a1a1a" />
          <rect x="18" y="11" width="3" height="3" fill="#1a1a1a" />
          <rect x="12" y="17" width="8" height="2" fill="#1a1a1a" />
          <rect x="10" y="21" width="12" height="7" fill="#0b1a2b" stroke="#1a1a1a" strokeWidth="1.5" />
          <rect x="13" y="23" width="6" height="3" fill={color} stroke="#1a1a1a" strokeWidth="1" />
        </svg>
      </div>
    </motion.div>
  )
}

/** Quadro claro: roster + barra de missão (gamificado, clean) */
export default function LandingBoard() {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="border-[3px] border-ink bg-paper shadow-pixel overflow-hidden">
        {/* HUD */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-[3px] border-ink bg-cream-2/80">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-ink">Missão</span>
            <span className="text-xs font-bold text-ink truncate">Squad · 6 setores</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-bold text-coral border-2 border-coral px-1.5 py-0.5">LVL 1</span>
            <span className="hidden sm:inline text-[10px] font-bold text-ink border-2 border-ink px-1.5 py-0.5 bg-paper">
              HF OPEN
            </span>
          </div>
        </div>

        {/* Roster */}
        <div className="px-4 sm:px-6 py-6 sm:py-8 bg-[linear-gradient(180deg,#fffdf8_0%,#f3efe4_100%)]">
          <div className="flex justify-between gap-2 sm:gap-3">
            {SQUAD.map((bot, i) => (
              <div key={bot.name} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                <MiniBot color={bot.color} delay={0.15 + i * 0.07} />
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.07 }}
                  className="text-[9px] sm:text-[10px] font-bold text-ink truncate max-w-full"
                >
                  {bot.name}
                </motion.span>
                <span className="hidden sm:block text-[8px] text-muted-ink truncate max-w-full">{bot.sector}</span>
              </div>
            ))}
          </div>

          {/* XP / mission path */}
          <div className="mt-7 sm:mt-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-ink">Rota automática</span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-[10px] font-bold text-grid"
              >
                pronta
              </motion.span>
            </div>
            <div className="h-3 border-2 border-ink bg-cream overflow-hidden">
              <motion.div
                className="h-full bg-coral"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.6, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-1">
              {BASE_SECTORS.slice(0, 4).map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.85 + i * 0.1 }}
                  className="flex items-center gap-1.5 min-w-0"
                >
                  <span className="w-2.5 h-2.5 border-2 border-ink flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-[9px] font-bold text-ink truncate hidden sm:inline">{s.name}</span>
                  {i < 3 && <span className="text-muted-ink text-[10px] mx-0.5">→</span>}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
