"use client"

import { useGameStore } from "@/store/gameStore"
import { MessageSquare, Settings, Map, Plus } from "lucide-react"

export default function Sidebar() {
  const { toggleModal, agents, teamFeed } = useGameStore()

  return (
    <div className="absolute left-4 top-20 z-50 flex flex-col gap-2">
      <button 
        onClick={() => toggleModal("chat")}
        className="flex items-center gap-2 bg-[#16241a]/90 backdrop-blur-sm border border-white/5 text-[#eee6cf] rounded-full px-4 py-2.5 font-display font-bold text-xs uppercase tracking-wider hover:bg-[#1c2e21] hover:scale-105 transition-all shadow-lg group"
      >
        <MessageSquare className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
        TEAM CHAT
        {teamFeed.length > 0 && (
          <span className="bg-[#e2536b] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {Math.min(teamFeed.length, 99)}
          </span>
        )}
      </button>

      <button 
        onClick={() => toggleModal("hire")}
        className="flex items-center gap-2 bg-[#16241a]/90 backdrop-blur-sm border border-white/5 text-[#eee6cf] rounded-full px-4 py-2.5 font-display font-bold text-xs uppercase tracking-wider hover:bg-[#1c2e21] hover:scale-105 transition-all shadow-lg group"
      >
        <Plus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
        ADICIONAR IA
      </button>

      <button 
        onClick={() => toggleModal("sectorMap")}
        className="flex items-center gap-2 bg-[#16241a]/90 backdrop-blur-sm border border-white/5 text-[#eee6cf] rounded-full px-4 py-2.5 font-display font-bold text-xs uppercase tracking-wider hover:bg-[#1c2e21] hover:scale-105 transition-all shadow-lg group"
      >
        <Map className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
        SETORES
      </button>

      <button 
        onClick={() => toggleModal("settings")}
        className="flex items-center gap-2 bg-[#16241a]/90 backdrop-blur-sm border border-white/5 text-[#eee6cf] rounded-full px-4 py-2.5 font-display font-bold text-xs uppercase tracking-wider hover:bg-[#1c2e21] hover:scale-105 transition-all shadow-lg group"
      >
        <Settings className="w-4 h-4 text-gray-400 group-hover:scale-110 transition-transform" />
        CONFIG
      </button>
    </div>
  )
}
