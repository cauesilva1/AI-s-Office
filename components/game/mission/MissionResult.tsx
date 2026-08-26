"use client"

import { Copy, Download, X } from "lucide-react"

export type CompareCandidate = {
  model: string
  imageUrl: string
  durationMs?: number
}

type MissionResultProps = {
  lastResult: string
  lastPrompt: string | null
  lastMedia: {
    imageUrl?: string
    videoUrl?: string
    audioUrl?: string
  } | null
  compareCandidates: CompareCandidate[] | null
  onPickCompare: (c: CompareCandidate) => void
  onCopy: () => void
  onDownload: () => void
  onClose: () => void
}

export function MissionResult({
  lastResult,
  lastPrompt,
  lastMedia,
  compareCandidates,
  onPickCompare,
  onCopy,
  onDownload,
  onClose,
}: MissionResultProps) {
  return (
    <div className="mt-3 border-[3px] border-ink bg-paper overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-navy text-cream border-b-[3px] border-ink">
        <span className="font-bold text-[11px] uppercase tracking-wide">Resultado</span>
        <div className="flex items-center gap-1">
          {lastMedia?.imageUrl && (
            <button onClick={onDownload} className="p-1.5 border border-cream/40 hover:bg-coral" title="Baixar PNG">
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onCopy} className="p-1.5 border border-cream/40 hover:bg-coral" title="Copiar">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 border border-cream/40 hover:bg-coral" title="Fechar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-3 space-y-3">
        {compareCandidates && compareCandidates.length > 1 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-ink mb-2">
              Escolha uma imagem
            </div>
            <div className="grid grid-cols-2 gap-2">
              {compareCandidates.map(c => (
                <button
                  key={c.model}
                  type="button"
                  onClick={() => onPickCompare(c)}
                  className={`border-2 text-left ${
                    lastMedia?.imageUrl === c.imageUrl ? "border-coral" : "border-ink"
                  } bg-cream p-1`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt="" className="w-full max-h-40 object-contain" />
                  <div className="text-[9px] text-ink mt-1 px-0.5 truncate">
                    {c.model.split("/").pop()}
                    {typeof c.durationMs === "number" ? ` · ${(c.durationMs / 1000).toFixed(1)}s` : ""}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {lastMedia?.imageUrl && !(compareCandidates && compareCandidates.length > 1) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lastMedia.imageUrl}
            alt="Imagem gerada na missão"
            className="border-2 border-ink w-full max-h-80 object-contain bg-cream"
          />
        )}
        {lastMedia?.imageUrl && compareCandidates && compareCandidates.length > 1 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lastMedia.imageUrl}
            alt="Imagem escolhida"
            className="border-2 border-coral w-full max-h-56 object-contain bg-cream"
          />
        )}
        {lastMedia?.videoUrl && (
          <video
            src={lastMedia.videoUrl}
            controls
            className="border-2 border-ink w-full max-h-80 bg-cream"
          />
        )}
        {lastMedia?.audioUrl && (
          <audio src={lastMedia.audioUrl} controls className="w-full" />
        )}
        {lastPrompt && (
          <div className="border-2 border-ink bg-cream px-2.5 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-ink mb-1">
              Seu prompt
            </div>
            <p className="text-xs text-ink whitespace-pre-wrap leading-relaxed">{lastPrompt}</p>
          </div>
        )}
        <div className="max-h-32 overflow-y-auto text-[11px] text-muted-ink whitespace-pre-wrap leading-relaxed border-t-2 border-ink/15 pt-2">
          {lastResult}
        </div>
      </div>
    </div>
  )
}
