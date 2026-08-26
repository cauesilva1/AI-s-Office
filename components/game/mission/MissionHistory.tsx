"use client"

import type { Mission } from "@/lib/game/types"

type MissionHistoryProps = {
  missions: Mission[]
  onSelect: (m: Mission) => void
}

export function MissionHistory({ missions, onSelect }: MissionHistoryProps) {
  if (missions.length === 0) return null

  return (
    <div className="mt-3 border-2 border-ink bg-cream p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink mb-2">
        Histórico recente
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {missions.slice(0, 8).map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m)}
            className="w-full text-left border-2 border-ink bg-paper px-2 py-1.5 hover:bg-cream-2"
          >
            <div className="flex items-center gap-2 text-[10px]">
              <span className={m.status === "completed" ? "text-grid font-bold" : "text-coral font-bold"}>
                {m.status === "completed" ? "OK" : "FALHOU"}
              </span>
              {m.imageUrl && <span className="text-coral">· imagem</span>}
            </div>
            <div className="text-[11px] text-ink line-clamp-2 mt-0.5">{m.prompt}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
