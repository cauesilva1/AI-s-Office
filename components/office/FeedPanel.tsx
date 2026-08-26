"use client"

import { useGameStore } from "@/store/gameStore"
import { ArrowRightLeft, Copy, ImageIcon } from "lucide-react"
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
    <div
      className="theme-cream max-h-[min(70vh,36rem)] flex flex-col"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="p-3 border-b-2 border-ink">
        <h3 className="text-sm font-bold text-ink">Atividade</h3>
        <p className="text-[10px] text-muted-ink mt-0.5">Feed ao vivo e histórico de missões</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[8rem]">
        {teamFeed.length === 0 && (
          <p className="text-muted-ink text-xs text-center py-6">
            Nada ainda. Lance uma missão ou fale com um agente.
          </p>
        )}
        {teamFeed.slice(0, 40).map(item => {
          const agent = agents.find(a => a.id === item.agentId)
          return (
            <div key={item.id} className="flex gap-2">
              {agent ? (
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
              ) : (
                <div className="w-8 h-8 flex-shrink-0 border-2 border-ink bg-cream-2" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-muted-ink mb-0.5">
                  <span className="font-bold text-ink">{agent?.name || "Sistema"}</span>
                  {" · "}{timeAgo(item.timestamp)}
                  {typeof item.stage === "number" && <span className="text-coral"> · etapa {item.stage}</span>}
                </div>
                <div className={`border-2 border-ink px-2 py-1.5 text-[11px] leading-snug flex gap-1.5 ${
                  item.kind === "handoff" ? "bg-coral/15" : "bg-cream"
                }`}>
                  {item.kind === "handoff" && <ArrowRightLeft className="w-3 h-3 flex-shrink-0 mt-0.5" />}
                  <span className="break-words">{item.text}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t-2 border-ink p-3 bg-cream-2 max-h-48 overflow-y-auto">
        <h4 className="text-[10px] font-bold text-ink mb-2 uppercase tracking-wide">Histórico de missões</h4>
        {missionHistory.length === 0 ? (
          <p className="text-[11px] text-muted-ink">Nenhuma missão concluída ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {missionHistory.slice(0, 10).map(mission => (
              <details key={mission.id} className="text-[11px] bg-paper border-2 border-ink px-2 py-1.5">
                <summary className="cursor-pointer list-none">
                  <span className={mission.status === "completed" ? "text-grid font-bold" : "text-coral font-bold"}>
                    {mission.status === "completed" ? "OK" : "FALHOU"}
                  </span>
                  <span className="text-muted-ink"> · {timeAgo(mission.createdAt)}</span>
                  {mission.imageUrl && (
                    <span className="inline-flex items-center gap-0.5 text-coral ml-1">
                      <ImageIcon className="w-3 h-3" /> img
                    </span>
                  )}
                  <div className="line-clamp-2 text-ink mt-0.5">{mission.prompt}</div>
                </summary>
                <div className="mt-1.5 pt-1.5 border-t border-ink/15 space-y-1.5">
                  {mission.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mission.imageUrl}
                      alt=""
                      className="border border-ink max-h-28 max-w-full object-contain bg-cream"
                    />
                  )}
                  {mission.finalResult && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); copyMissionResult(mission.finalResult!) }}
                        className="flex items-center gap-1 text-[10px] text-muted-ink hover:text-ink"
                      >
                        <Copy className="w-3 h-3" /> Copiar
                      </button>
                      <div className="max-h-20 overflow-y-auto whitespace-pre-wrap text-muted-ink text-[10px]">
                        {mission.finalResult}
                      </div>
                    </>
                  )}
                  {mission.error && (
                    <div className="text-coral text-[10px]">{mission.error}</div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
