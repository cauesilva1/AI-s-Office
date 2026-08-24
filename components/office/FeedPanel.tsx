"use client"

import { useGameStore } from "@/store/gameStore"
import { ArrowRightLeft, Copy } from "lucide-react"
import RobotAvatar from "@/components/office/RobotAvatar"

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return "agora"
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function FeedPanel({ onPickAgent }: { onPickAgent?: () => void }) {
  const { agents, teamFeed, selectAgent, missionHistory, showToast } = useGameStore()

  const copyMissionResult = async (result: string) => {
    try {
      await navigator.clipboard.writeText(result)
      showToast("Resultado copiado")
    } catch {
      showToast("Não foi possível copiar")
    }
  }

  return (
    <div className="theme-cream max-h-[70vh] flex flex-col">
      <div className="p-3 border-b-2 border-ink">
        <h3 className="text-sm font-bold text-ink">Atividade</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[8rem]">
        {teamFeed.length === 0 && (
          <p className="text-muted-ink text-xs text-center py-6">
            Nada ainda. Lance uma missão ou fale com um agente.
          </p>
        )}
        {teamFeed.slice(0, 40).map(item => {
          const agent = agents.find(a => a.id === item.agentId)
          if (!agent) return null
          return (
            <div key={item.id} className="flex gap-2">
              <button
                type="button"
                onClick={() => { selectAgent(agent.id); onPickAgent?.() }}
                className="flex-shrink-0"
              >
                <RobotAvatar
                  color={agent.color}
                  working={agent.spriteState === "working"}
                  size="sm"
                  showBubble={item.kind === "handoff"}
                  bubbleText={item.kind === "handoff" ? "!" : undefined}
                />
              </button>
              <div className="min-w-0">
                <div className="text-[10px] text-muted-ink mb-0.5">
                  <span className="font-bold text-ink">{agent.name}</span> · {timeAgo(item.timestamp)}
                  {typeof item.stage === "number" && <span className="text-coral"> · etapa {item.stage}</span>}
                </div>
                <div className={`border-2 border-ink px-2 py-1.5 text-[11px] leading-snug flex gap-1.5 ${
                  item.kind === "handoff" ? "bg-coral/15" : "bg-cream"
                }`}>
                  {item.kind === "handoff" && <ArrowRightLeft className="w-3 h-3 flex-shrink-0 mt-0.5" />}
                  {item.text}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {missionHistory.length > 0 && (
        <div className="border-t-2 border-ink p-3 bg-cream-2 max-h-36 overflow-y-auto">
          <h4 className="text-[10px] font-bold text-ink mb-2 uppercase tracking-wide">Histórico</h4>
          <div className="space-y-1.5">
            {missionHistory.slice(0, 6).map(mission => (
              <details key={mission.id} className="text-[11px] bg-paper border-2 border-ink px-2 py-1.5">
                <summary className="cursor-pointer list-none">
                  <span className={mission.status === "completed" ? "text-grid font-bold" : "text-coral font-bold"}>
                    {mission.status === "completed" ? "OK" : "FALHOU"}
                  </span>
                  <span className="text-muted-ink"> · {timeAgo(mission.createdAt)}</span>
                  <div className="line-clamp-1 text-ink mt-0.5">{mission.prompt}</div>
                </summary>
                {mission.finalResult && (
                  <div className="mt-1.5 pt-1.5 border-t border-ink/15">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); copyMissionResult(mission.finalResult!) }}
                      className="flex items-center gap-1 text-[10px] text-muted-ink hover:text-ink mb-1"
                    >
                      <Copy className="w-3 h-3" /> Copiar
                    </button>
                    <div className="max-h-20 overflow-y-auto whitespace-pre-wrap text-muted-ink text-[10px]">
                      {mission.finalResult}
                    </div>
                  </div>
                )}
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
