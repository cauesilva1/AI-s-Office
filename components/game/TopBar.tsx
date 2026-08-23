"use client"

import { useGameStore } from "@/store/gameStore"
import { Wifi, WifiOff, Users, Minimize2, Maximize2 } from "lucide-react"

export default function TopBar() {
  const { agents, aiProvider, toggleModal, layoutMode, setLayoutMode, activeMission } = useGameStore()
  const working = agents.filter(a => a.spriteState === "working").length
  const connected = aiProvider === "huggingface"

  return (
    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-gradient-to-b from-[#08101c]/95 to-transparent pointer-events-none">
      <div className="flex items-center gap-4 pointer-events-auto">
        <div className="flex items-center gap-2 bg-[#111d2e]/90 backdrop-blur-sm border border-cyan-400/15 rounded-full px-4 py-2 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
          <span className="text-cyan-300 font-display font-bold text-sm">★ AGENT OFFICE</span>
        </div>
      </div>

      <div className="flex items-center gap-3 pointer-events-auto">
        <button
          onClick={() => setLayoutMode(layoutMode === "wide" ? "compact" : "wide")}
          className="flex items-center gap-2 bg-[#111d2e]/90 backdrop-blur-sm border border-cyan-400/15 rounded-full px-4 py-2 text-cyan-100/70 hover:text-cyan-100 transition-colors"
          title={layoutMode === "wide" ? "Alternar para layout compacto" : "Alternar para layout amplo"}
        >
          {layoutMode === "wide" ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span className="text-xs font-bold">{layoutMode === "wide" ? "Amplo" : "Compacto"}</span>
        </button>

        <div className="flex items-center gap-2 bg-[#111d2e]/90 backdrop-blur-sm border border-cyan-400/15 rounded-full px-4 py-2">
          <Users className="w-4 h-4 text-cyan-100/50" />
          <span className="text-cyan-50 text-sm font-bold">{agents.length}</span>
          {working > 0 && (
            <span className="text-amber-300 text-xs">· {working} trabalhando</span>
          )}
        </div>

        {activeMission && (
          <div className="flex items-center gap-2 bg-violet-500/10 backdrop-blur-sm border border-violet-400/35 rounded-full px-4 py-2">
            <span className="text-violet-200 text-xs font-bold">Missão {activeMission.status}</span>
          </div>
        )}

        <button
          onClick={() => toggleModal("settings")}
          className={`flex items-center gap-2 backdrop-blur-sm border rounded-full px-4 py-2 transition-colors hover:scale-105 ${
            connected 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-[#111d2e]/90 border-cyan-400/15 text-cyan-100/50 hover:text-cyan-100/85"
          }`}
          title={connected ? "Conectado à Hugging Face" : "Clique para conectar sua conta Hugging Face"}
        >
          {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span className="text-xs font-bold">
            {connected ? "Hugging Face" : "Simulação"}
          </span>
        </button>
      </div>
    </div>
  )
}
