"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useGameStore } from "@/store/gameStore"
import { BASE_SECTORS, STARTING_AGENTS } from "@/lib/game/constants"
import { ArrowRight, Bot, GitBranch, MessageSquareText, Sparkles, Workflow } from "lucide-react"

const STEPS = [
  {
    icon: MessageSquareText,
    title: "1. Descreva a missão",
    text: "Escreva o que você precisa em uma frase, como faria com um colega de trabalho.",
  },
  {
    icon: Workflow,
    title: "2. O escritório roteia sozinho",
    text: "Um roteador híbrido (regras + IA) decide quais setores participam e em que ordem.",
  },
  {
    icon: GitBranch,
    title: "3. Agentes passam o bastão",
    text: "Cada IA entrega sua etapa e passa o contexto adiante até o resultado final consolidado.",
  },
]

export default function HomePage() {
  const router = useRouter()
  const agents = useGameStore(s => s.agents)
  const hasSave = agents.length > 0

  useEffect(() => {
    if (useGameStore.getState().agents.length === 0) useGameStore.getState().initGame()
  }, [])

  const sectorModel = (sectorId: string) =>
    STARTING_AGENTS.find(a => a.sectorId === sectorId)?.model.split("/").pop() || ""

  return (
    <div className="min-h-screen bg-[#0b1220] text-bright overflow-x-hidden">
      {/* Glow de fundo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[120px]" />
      </div>

      <main className="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 bg-panel border border-line rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-dim">Todas as suas IAs em um lugar só</span>
          </div>

          <h1 className="font-display font-extrabold text-5xl md:text-6xl tracking-tight mb-4">
            AGENT <span className="text-cyan-300">OFFICE</span>
          </h1>
          <p className="text-dim text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Um escritório virtual onde os melhores modelos abertos da Hugging Face trabalham
            juntos, divididos por setores — sem você precisar abrir um site diferente para cada IA.
          </p>

          <button
            onClick={() => router.push("/office")}
            className="group inline-flex items-center gap-3 bg-violet-500 hover:bg-violet-400 text-white font-display font-bold text-lg rounded-full py-4 px-10 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-violet-500/25"
          >
            {hasSave ? "Entrar no escritório" : "Montar meu escritório"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-faint text-xs mt-4">
            Gratuito — basta um token da Hugging Face. Tudo fica salvo no seu navegador.
          </p>
        </motion.section>

        {/* Como funciona */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mt-24"
        >
          <h2 className="font-display font-bold text-2xl text-center mb-10">Como funciona</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map(step => (
              <div key={step.title} className="bg-panel/80 border border-line rounded-2xl p-6">
                <step.icon className="w-6 h-6 text-cyan-300 mb-4" />
                <h3 className="font-display font-bold text-base mb-2">{step.title}</h3>
                <p className="text-dim text-sm leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Setores */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mt-24"
        >
          <h2 className="font-display font-bold text-2xl text-center mb-2">Seis setores, seis especialistas</h2>
          <p className="text-dim text-sm text-center mb-10 max-w-xl mx-auto">
            Cada setor vem com um dos melhores modelos abertos disponíveis no router da Hugging Face
            — e você pode trocar ou adicionar quantos quiser.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {BASE_SECTORS.map(sector => (
              <div
                key={sector.id}
                className="bg-panel/80 border border-line rounded-2xl p-4 flex items-start gap-3"
                style={{ borderLeftColor: sector.color, borderLeftWidth: 3 }}
              >
                <Bot className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: sector.color }} />
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm">{sector.name}</div>
                  <div className="text-faint text-[11px] truncate" title={sectorModel(sector.id)}>
                    {sectorModel(sector.id)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* CTA final */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mt-24 text-center bg-panel/60 border border-line rounded-3xl py-12 px-6"
        >
          <h2 className="font-display font-bold text-2xl mb-3">Pronto para colocar suas IAs para trabalhar?</h2>
          <p className="text-dim text-sm mb-8 max-w-md mx-auto">
            Descreva uma missão e veja o escritório inteiro se organizar para entregá-la.
          </p>
          <button
            onClick={() => router.push("/office")}
            className="inline-flex items-center gap-2 bg-cyan-500/15 hover:bg-cyan-400/25 border border-cyan-400/30 text-cyan-100 font-display font-bold text-sm rounded-full py-3 px-8 transition-all hover:scale-105"
          >
            Abrir o escritório
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.section>

        <footer className="mt-16 text-center text-faint text-xs">
          Agent Office — feito com Next.js, Pixi.js e os modelos abertos da Hugging Face.
        </footer>
      </main>
    </div>
  )
}
