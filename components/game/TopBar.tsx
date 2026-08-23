"use client"

import { useGameStore } from "@/store/gameStore"
import { Wifi, WifiOff, Users } from "lucide-react"

export default function TopBar() {
  const { agents, aiProvider, toggleModal } = useGameStore()
  const working = agents.filter(a => a.spriteState === "working").length
  const connected = aiProvider === "huggingface"

  return (
    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-gradient-to-b from-[#0c140d]/90 to-transparent pointer-events-none">
      <div className="flex items-center gap-4 pointer-events-auto">
        <div className="flex items-center gap-2 bg-[#16241a]/80 backdrop-blur-sm border border-white/5 rounded-full px-4 py-2">
          <span className="text-[#e9b65f] font-display font-bold text-sm">★ AGENT OFFICE</span>
        </div>
      </div>

      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-2 bg-[#16241a]/80 backdrop-blur-sm border border-white/5 rounded-full px-4 py-2">
          <Users className="w-4 h-4 text-white/50" />
          <span className="text-white/80 text-sm font-bold">{agents.length}</span>
          {working > 0 && (
            <span className="text-amber-400 text-xs">· {working} trabalhando</span>
          )}
        </div>

        <button
          onClick={() => toggleModal("settings")}
          className={`flex items-center gap-2 backdrop-blur-sm border rounded-full px-4 py-2 transition-colors hover:scale-105 ${
            connected 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-[#16241a]/80 border-white/5 text-white/50 hover:text-white/80"
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
