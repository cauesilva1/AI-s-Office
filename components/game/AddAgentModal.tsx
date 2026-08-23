"use client"

import { useEffect, useState } from "react"
import { useGameStore } from "@/store/gameStore"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Cpu } from "lucide-react"
import { AGENT_COLORS, modelsForSector } from "@/lib/game/constants"

export default function AddAgentModal() {
  const { showHire, sectors, desks, agents, toggleModal, addAgent, showToast } = useGameStore()
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [sectorId, setSectorId] = useState(sectors[0]?.id || "engineering")
  const sectorModels = modelsForSector(sectorId)
  const [model, setModel] = useState(sectorModels[0])
  const [customModel, setCustomModel] = useState("")

  useEffect(() => {
    if (!showHire) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleModal("hire")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [showHire, toggleModal])

  if (!showHire) return null

  const freeDesks = (sid: string) => desks.filter(d => d.sectorId === sid && !d.agentId).length

  const handleAdd = () => {
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
      toggleModal("hire")
      setName("")
      setRole("")
      setCustomModel("")
    } else {
      showToast("Sem mesa livre nesse setor — escolha outro")
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => toggleModal("hire")}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#101a29] border border-cyan-400/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-display font-bold text-white text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              Adicionar IA ao escritório
            </h2>
            <button onClick={() => toggleModal("hire")} className="text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 block">
                Modelo (Hugging Face)
              </label>
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-white/30 flex-shrink-0" />
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                    className="flex-1 bg-cyan-500/8 border border-cyan-400/15 rounded-lg px-3 py-2.5 text-cyan-50 text-sm focus:outline-none focus:border-cyan-300/45"
                >
                  {sectorModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="…ou digite outro modelo (org/nome)"
                className="w-full bg-cyan-500/8 border border-cyan-400/15 rounded-lg px-3 py-2 text-cyan-50 text-xs placeholder:text-cyan-100/30 focus:outline-none focus:border-cyan-300/45"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 block">
                  Nome (opcional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ajudante de código"
                  className="w-full bg-cyan-500/8 border border-cyan-400/15 rounded-lg px-3 py-2.5 text-cyan-50 text-sm placeholder:text-cyan-100/30 focus:outline-none focus:border-cyan-300/45"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 block">
                  Função (opcional)
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Ex: Revisor"
                  className="w-full bg-cyan-500/8 border border-cyan-400/15 rounded-lg px-3 py-2.5 text-cyan-50 text-sm placeholder:text-cyan-100/30 focus:outline-none focus:border-cyan-300/45"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 block">
                Setor
              </label>
              <div className="grid grid-cols-3 gap-2">
                {sectors.map(s => {
                  const free = freeDesks(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSectorId(s.id)
                        setModel(modelsForSector(s.id)[0])
                      }}
                      disabled={free === 0}
                      className={`rounded-lg px-2 py-2 text-xs font-bold border transition-colors ${
                        sectorId === s.id 
                          ? "border-amber-500/60 bg-amber-500/10 text-amber-300" 
                          : free === 0
                            ? "border-white/5 bg-white/[0.02] text-white/20 cursor-not-allowed"
                            : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                      style={sectorId === s.id ? {} : { borderLeftColor: s.color, borderLeftWidth: 2 }}
                    >
                      {s.name}
                      <span className="block text-[9px] font-normal opacity-60">{free} mesa{free !== 1 ? "s" : ""} livre{free !== 1 ? "s" : ""}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleAdd}
              className="w-full bg-violet-500 hover:bg-violet-400 text-white font-display font-bold text-sm rounded-full py-3 transition-all active:scale-95"
            >
              Colocar na mesa
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
