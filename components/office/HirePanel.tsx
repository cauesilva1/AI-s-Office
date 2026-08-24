"use client"

import { useState } from "react"
import { useGameStore } from "@/store/gameStore"
import { Cpu } from "lucide-react"
import { AGENT_COLORS, modelsForSector } from "@/lib/game/constants"
import PixelButton from "@/components/site/PixelButton"
import { modelsForProvider } from "@/lib/ai/providers"
import { defaultModelForSector, SECTOR_DEFAULTS } from "@/lib/ai/remapModels"
import { isEnsembleProvider, isSoloProvider } from "@/lib/ai/officeMode"

export default function HirePanel({ onDone }: { onDone?: () => void }) {
  const { sectors, desks, agents, addAgent, setAgentModel, showToast, aiProvider } = useGameStore()
  const solo = isSoloProvider(aiProvider)
  const ensemble = isEnsembleProvider(aiProvider)
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [sectorId, setSectorId] = useState(sectors[0]?.id || "engineering")

  const catalog = solo
    ? (SECTOR_DEFAULTS[aiProvider]?.[sectorId] || modelsForProvider(aiProvider))
    : ensemble
      ? (SECTOR_DEFAULTS.openrouter?.[sectorId] || modelsForProvider("openrouter"))
      : modelsForSector(sectorId)

  const [model, setModel] = useState(catalog[0] || defaultModelForSector(aiProvider, sectorId))
  const [customModel, setCustomModel] = useState("")

  const freeDesks = (sid: string) => desks.filter(d => d.sectorId === sid && !d.agentId).length
  const senior = agents.find(a => a.sectorId === sectorId)
  const trio = agents.filter(a => a.sectorId === sectorId)

  const pickSector = (id: string) => {
    setSectorId(id)
    const next = solo || ensemble
      ? (SECTOR_DEFAULTS[aiProvider as keyof typeof SECTOR_DEFAULTS]?.[id]
          || (ensemble ? SECTOR_DEFAULTS.openrouter[id] : modelsForProvider(aiProvider))
          || [])
      : modelsForSector(id)
    setModel(next[0] || defaultModelForSector(aiProvider, id))
  }

  const handleAdd = () => {
    if (solo) {
      showToast("No modo solo não se adiciona IA — troque o modelo do sênior")
      return
    }
    if (ensemble) {
      showToast("No OpenRouter o trio é fixo — 3 modelos já trabalham juntos")
      return
    }
    const finalModel = customModel.trim() || model
    const finalName = name.trim() || finalModel.split("/").pop() || "Novo Agente"
    const color = AGENT_COLORS[agents.length % AGENT_COLORS.length]
    const ok = addAgent({
      name: finalName,
      role: role.trim() || "Assistente",
      model: finalModel,
      sectorId,
      color,
    })
    if (ok) {
      showToast(`${finalName} entrou no escritório`)
      setName("")
      setRole("")
      setCustomModel("")
      onDone?.()
    } else {
      showToast("Sem mesa livre nesse setor")
    }
  }

  const handleChangeSeniorModel = () => {
    if (!senior) {
      showToast("Sem sênior neste setor")
      return
    }
    const finalModel = customModel.trim() || model
    setAgentModel(senior.id, finalModel)
    showToast(`${senior.name} → ${finalModel.split("/").pop()}`)
    onDone?.()
  }

  const handleSwapTrioModel = (agentId: string) => {
    const finalModel = customModel.trim() || model
    setAgentModel(agentId, finalModel)
    const agent = agents.find(a => a.id === agentId)
    showToast(`${agent?.name || "Agente"} → ${finalModel.split("/").pop()}`)
  }

  return (
    <div className="p-4 theme-cream space-y-3">
      <h3 className="text-sm font-bold text-ink">
        {solo ? "Sênior do setor" : ensemble ? "Trio do setor" : "Adicionar IA"}
      </h3>
      {solo && (
        <p className="text-[11px] text-muted-ink leading-relaxed border-2 border-ink/15 bg-cream-2 px-2 py-2">
          Modo solo: 1 sênior por setor. Aqui você só troca o modelo do sênior.
        </p>
      )}
      {ensemble && (
        <p className="text-[11px] text-muted-ink leading-relaxed border-2 border-ink/15 bg-cream-2 px-2 py-2">
          OpenRouter: os 3 modelos rodam em paralelo (proposta + crítica + rápido) e depois sintetizam.
          Sem modelo “default” — os três contam igual.
        </p>
      )}

      <div>
        <label className="text-[11px] font-bold text-ink mb-1.5 block">Setor</label>
        <div className="grid grid-cols-3 gap-1.5">
          {sectors.map(s => {
            const free = freeDesks(s.id)
            const disabled = !solo && !ensemble && free === 0
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pickSector(s.id)}
                disabled={disabled}
                className={`border-2 border-ink px-1.5 py-1.5 text-[10px] font-bold transition-colors ${
                  sectorId === s.id
                    ? "bg-coral text-cream"
                    : disabled
                      ? "bg-cream-2 text-muted-ink opacity-40 cursor-not-allowed"
                      : "bg-cream text-ink hover:bg-cream-2"
                }`}
              >
                {s.name}
                {!solo && !ensemble && (
                  <span className="block text-[9px] font-normal opacity-70">{free}</span>
                )}
                {ensemble && (
                  <span className="block text-[9px] font-normal opacity-70">trio</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {ensemble ? (
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-ink block">Modelos do trio</label>
          {trio.map((a, i) => (
            <div key={a.id} className="border-2 border-ink bg-cream-2 px-2 py-1.5 text-[11px]">
              <div className="font-bold text-ink">{i + 1}. {a.role}</div>
              <div className="text-muted-ink truncate" title={a.model}>{a.model}</div>
              <button
                type="button"
                className="mt-1 text-[10px] font-bold text-coral underline"
                onClick={() => handleSwapTrioModel(a.id)}
              >
                Trocar pelo modelo selecionado abaixo
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-muted-ink flex-shrink-0" />
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex-1 bg-cream border-2 border-ink px-2 py-1.5 text-ink text-xs"
            >
              {catalog.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <input
            type="text"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="ou outro id free do OpenRouter"
            className="w-full bg-cream border-2 border-ink px-2 py-1.5 text-ink text-[11px] placeholder:text-muted-ink"
          />
        </div>
      ) : (
        <>
          <div>
            <label className="text-[11px] font-bold text-ink mb-1.5 block">Modelo</label>
            <div className="flex items-center gap-2 mb-1.5">
              <Cpu className="w-3.5 h-3.5 text-muted-ink flex-shrink-0" />
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="flex-1 bg-cream border-2 border-ink px-2 py-1.5 text-ink text-xs"
              >
                {catalog.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="ou outro id de modelo"
              className="w-full bg-cream border-2 border-ink px-2 py-1.5 text-ink text-[11px] placeholder:text-muted-ink"
            />
          </div>

          {!solo && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-ink mb-1.5 block">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Opcional"
                  className="w-full bg-cream border-2 border-ink px-2 py-1.5 text-ink text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-ink mb-1.5 block">Função</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Opcional"
                  className="w-full bg-cream border-2 border-ink px-2 py-1.5 text-ink text-xs"
                />
              </div>
            </div>
          )}

          {solo ? (
            <PixelButton size="sm" onClick={handleChangeSeniorModel} className="w-full">
              Atualizar modelo do sênior
            </PixelButton>
          ) : (
            <PixelButton size="sm" onClick={handleAdd} className="w-full">
              Colocar na mesa
            </PixelButton>
          )}
        </>
      )}
    </div>
  )
}
