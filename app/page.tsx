"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useGameStore } from "@/store/gameStore"
import { Sparkles, Play, RotateCcw } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const { initGame, resetGame, agents } = useGameStore()
  const hasSave = agents.length > 0

  useEffect(() => {
    // Só inicializa se não houver escritório salvo — não apaga conversas nem token
    if (useGameStore.getState().agents.length === 0) initGame()
  }, [initGame])

  const handleStart = () => {
    router.push("/office")
  }

  const handleNewGame = () => {
    resetGame()
    router.push("/office")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0c140d] via-[#152018] to-[#0c140d] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center max-w-lg w-full"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block mb-6"
        >
          <Sparkles className="w-16 h-16 text-[#e9b65f]" />
        </motion.div>

        <h1 className="font-display font-extrabold text-5xl text-white mb-2 tracking-tight">
          AGENT OFFICE
        </h1>
        <p className="text-white/40 text-lg mb-10">
          Seu escritório de IAs — todas trabalhando juntas num só lugar
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleStart}
            className="group flex items-center justify-center gap-3 bg-[#e9b65f] hover:bg-[#d4a34e] text-[#1c1712] font-display font-bold text-lg rounded-full py-4 px-8 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20"
          >
            <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {hasSave ? "Entrar no Escritório" : "Montar Escritório"}
          </button>

          {hasSave && (
            <button
              onClick={handleNewGame}
              className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white/70 font-display font-bold text-sm rounded-full py-3 px-8 transition-all hover:scale-105"
            >
              <RotateCcw className="w-4 h-4" />
              Reiniciar
            </button>
          )}
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-2xl font-bold text-[#e9b65f]">6</div>
            <div className="text-white/40 text-xs mt-1">Setores</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-2xl font-bold text-emerald-400">6+</div>
            <div className="text-white/40 text-xs mt-1">IAs reais</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400">1</div>
            <div className="text-white/40 text-xs mt-1">Lugar só</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
