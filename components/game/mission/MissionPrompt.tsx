"use client"

import { PLAYBOOKS } from "@/lib/game/playbooks"

type MissionPromptProps = {
  prompt: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  disabled: boolean
  compact?: boolean
}

export function MissionPrompt({ prompt, onChange, onKeyDown, disabled, compact }: MissionPromptProps) {
  return (
    <div className="border-[3px] border-ink bg-cream p-3 mb-3">
      <label className="text-sm font-bold text-ink mb-1 block">Briefing da missão</label>
      <p className="text-[11px] text-muted-ink mb-2">
        Descreva o que quer. Você vê a rota antes de executar.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {PLAYBOOKS.map(pb => (
          <button
            key={pb.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(pb.prompt)}
            className="text-[10px] font-bold border-2 border-ink bg-paper px-2 py-1 hover:bg-coral hover:text-cream disabled:opacity-40"
            title={pb.prompt.slice(0, 120)}
          >
            {pb.label}
          </button>
        ))}
      </div>
      <textarea
        value={prompt}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={compact ? 5 : 4}
        disabled={disabled}
        placeholder="Ex.: Crie um design de publicidade da Fanta com um herói segurando a garrafa…"
        className="w-full bg-paper border-2 border-ink p-3 text-ink text-sm placeholder:text-muted-ink focus:outline-none focus:border-coral resize-none disabled:opacity-50 min-h-[6rem]"
      />
    </div>
  )
}
