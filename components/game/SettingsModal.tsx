"use client"

import { useEffect, useState } from "react"
import { useGameStore } from "@/store/gameStore"
import { motion, AnimatePresence } from "framer-motion"
import { X, Key, Wifi, WifiOff, RotateCcw } from "lucide-react"

export default function SettingsModal() {
  const { showSettings, aiProvider, hfToken, hfModel, toggleModal, setAIProvider, setHFConfig, showToast, resetGame } = useGameStore()
  const [token, setToken] = useState(hfToken)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!showSettings) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleModal("settings")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [showSettings, toggleModal])

  if (!showSettings) return null

  const handleSave = () => {
    setHFConfig(token, hfModel)
    if (token) {
      setAIProvider("huggingface")
      showToast("Conectado à Hugging Face ✅")
    } else {
      setAIProvider("mock")
      showToast("Usando modo simulação (sem API)")
    }
    toggleModal("settings")
  }

  const handleClear = () => {
    setToken("")
    setHFConfig("", "")
    setAIProvider("mock")
    showToast("Modo simulação ativado")
    toggleModal("settings")
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => toggleModal("settings")}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#101a29] border border-cyan-400/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-display font-bold text-white text-lg">Configurar API</h2>
            <button onClick={() => toggleModal("settings")} className="text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5">
            <div className={`p-3 rounded-lg mb-4 text-sm ${aiProvider === "huggingface" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/60"}`}>
              <div className="flex items-center gap-2">
                {aiProvider === "huggingface" ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {aiProvider === "huggingface" 
                  ? "Conectado à Hugging Face — agentes usando IAs reais" 
                  : "Modo simulação ativo (sem API externa)"}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 block">
                Token da Hugging Face
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-cyan-500/8 border border-cyan-400/15 rounded-lg pl-10 pr-3 py-2.5 text-cyan-50 text-sm placeholder:text-cyan-100/25 focus:outline-none focus:border-cyan-300/45"
                />
              </div>
              <p className="text-white/30 text-xs mt-1.5">
                Crie um token em huggingface.co → Settings → Access Tokens. Fica só no localStorage deste navegador.
              </p>
            </div>

            <div className="mb-4 bg-cyan-500/8 border border-cyan-400/10 rounded-lg p-3">
              <p className="text-cyan-100/55 text-xs leading-relaxed">
                Cada agente na mesa usa um modelo gratuito diferente da Hugging Face. 
                Para trocar o modelo de um agente, clique nele e escolha no painel.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-violet-500 hover:bg-violet-400 text-white font-display font-bold text-sm rounded-full py-2.5 transition-all active:scale-95"
              >
                Salvar configuração
              </button>
              <button
                onClick={handleClear}
                className="bg-white/5 hover:bg-white/10 text-white/70 font-display font-bold text-sm rounded-full px-4 py-2.5 transition-colors"
              >
                Limpar
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/15 border border-red-400/20 text-red-300/80 font-display font-bold text-xs rounded-full py-2.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reiniciar escritório
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      resetGame()
                      setConfirmReset(false)
                      toggleModal("settings")
                      showToast("Escritório reiniciado")
                    }}
                    className="flex-1 bg-red-500/80 hover:bg-red-500 text-white font-display font-bold text-xs rounded-full py-2.5 transition-colors"
                  >
                    Confirmar — apaga conversas e missões
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="bg-white/5 hover:bg-white/10 text-white/70 font-display font-bold text-xs rounded-full px-4 py-2.5 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
