"use client"

import RobotAvatar from "@/components/office/RobotAvatar"
import type { Agent, MissionStep, Sector } from "@/lib/game/types"

type MissionPreviewProps = {
  previewRoute: MissionStep[]
  agents: Agent[]
  sectors: Sector[]
  previewNeedsMedia: boolean
  mediaNeedsKey: boolean
  previewIpRisk: boolean
  mediaLabel: string
  aiProvider: string
  ipHint: string
  sectorNameById: (id: string, sectors: Sector[]) => string
}

export function MissionPreview({
  previewRoute,
  agents,
  sectors,
  previewNeedsMedia,
  mediaNeedsKey,
  previewIpRisk,
  mediaLabel,
  aiProvider,
  ipHint,
  sectorNameById,
}: MissionPreviewProps) {
  if (previewRoute.length === 0) return null

  return (
    <div className="mt-3 border-[3px] border-ink bg-paper p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink mb-2">
        Preview da rota
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {previewRoute.map((step, idx) => {
          const agent = agents.find(a => a.id === step.agentId)
          return (
            <div key={`${step.sectorId}-${idx}`} className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 border-2 border-ink bg-cream px-2 py-1">
                {agent && <RobotAvatar color={agent.color} size="sm" showBubble={false} />}
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-ink">
                    {idx + 1}. {sectorNameById(step.sectorId, sectors)}
                  </div>
                  <div className="text-[9px] text-muted-ink truncate max-w-[8rem]">
                    {agent?.name || "sem agente"}
                  </div>
                </div>
              </div>
              {idx < previewRoute.length - 1 && <span className="text-muted-ink text-xs">→</span>}
            </div>
          )
        })}
      </div>

      {previewNeedsMedia && (
        <div className="mt-2 border-2 border-coral bg-coral/10 px-2.5 py-2 text-[11px] text-ink leading-relaxed">
          <strong>{mediaLabel.charAt(0).toUpperCase() + mediaLabel.slice(1)}:</strong>{" "}
          gerada pelo provedor ativo ({aiProvider}) na etapa Design.
          {mediaNeedsKey && " Configure a API key no painel para sair da simulação."}
        </div>
      )}
      {previewIpRisk && (
        <div className="mt-2 border-2 border-amber-600 bg-amber-50 px-2.5 py-2 text-[11px] text-ink leading-relaxed">
          {ipHint}
        </div>
      )}
      <p className="text-[10px] text-muted-ink mt-2">
        Entre etapas o bastão leva só um <strong>resumo</strong>, não o texto inteiro.
      </p>
    </div>
  )
}
