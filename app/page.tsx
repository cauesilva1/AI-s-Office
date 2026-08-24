"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { useGameStore } from "@/store/gameStore"
import PixelButton from "@/components/site/PixelButton"
import LandingBoard from "@/components/site/LandingBoard"

export default function HomePage() {
  const router = useRouter()
  const agents = useGameStore(s => s.agents)
  const hasSave = agents.length > 0

  useEffect(() => {
    if (useGameStore.getState().agents.length === 0) useGameStore.getState().initGame()
  }, [])

  return (
    <div className="theme-cream min-h-dvh flex flex-col bg-[#f7f4ec]">
      {/* topo clean */}
      <header className="flex-shrink-0 border-b-2 border-ink/10 bg-paper/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <span className="font-pixel text-[10px] text-ink tracking-wide">AGENT OFFICE</span>
          <button
            type="button"
            onClick={() => router.push("/office")}
            className="text-xs font-bold text-ink border-2 border-ink px-3 py-1.5 bg-paper hover:bg-coral hover:text-cream transition-colors"
          >
            Entrar
          </button>
        </div>
      </header>

      {/* Hero claro — uma composição */}
      <section className="relative flex-1 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% -10%, #ffffff 0%, transparent 55%), linear-gradient(180deg, #faf8f3 0%, #f3efe4 55%, #ebe4d4 100%)",
          }}
        />
        {/* grade sutil clara */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(26,26,26,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(26,26,26,0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-12 sm:pt-16 pb-16 sm:pb-20">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-[11px] font-bold uppercase tracking-[0.22em] text-coral mb-4"
            >
              Hub gamificado de IAs
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="font-pixel text-[18px] sm:text-[26px] md:text-[32px] text-ink mb-5 leading-[1.45]"
            >
              AGENT OFFICE
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
              className="text-sm sm:text-base text-muted-ink leading-relaxed mb-8 max-w-lg mx-auto"
            >
              Monte o time, lance a missão e deixe os agentes passarem o bastão —
              modelos abertos da Hugging Face num fluxo claro.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <PixelButton size="lg" onClick={() => router.push("/office")}>
                {hasSave ? "Continuar partida" : "Começar partida"}
              </PixelButton>
              <button
                type="button"
                onClick={() => document.getElementById("como")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-ink hover:text-ink transition-colors px-2 py-2"
              >
                Como funciona <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <LandingBoard />
          </motion.div>
        </div>
      </section>

      {/* Loop do jogo — clean */}
      <section id="como" className="border-t-[3px] border-ink bg-paper">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral mb-3">Gameplay</p>
          <h2 className="text-xl sm:text-2xl font-bold text-ink mb-10 max-w-md leading-snug">
            Três movimentos. Zero dashboard confuso.
          </h2>

          <ol className="grid sm:grid-cols-3 gap-8 sm:gap-6">
            {[
              {
                step: "01",
                title: "Briefing",
                text: "Escreva a missão em linguagem natural. O escritório define a rota.",
              },
              {
                step: "02",
                title: "Squad",
                text: "Seis setores ativos. Cada agente mostra status, modelo e chat.",
              },
              {
                step: "03",
                title: "Bastão",
                text: "Um entrega, o próximo continua — até o resultado final.",
              },
            ].map((item, i) => (
              <motion.li
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <div className="text-[11px] font-bold text-coral mb-3 tabular-nums">{item.step}</div>
                <h3 className="text-base font-bold text-ink mb-2">{item.title}</h3>
                <p className="text-sm text-muted-ink leading-relaxed">{item.text}</p>
                {i < 2 && (
                  <div className="hidden sm:block absolute top-2 -right-3 text-ink/20 font-bold">→</div>
                )}
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA final claro */}
      <section className="border-t-[3px] border-ink bg-cream">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-14 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-ink mb-1">Pronto para jogar o escritório?</h2>
            <p className="text-sm text-muted-ink">Token HF opcional. Progresso fica no navegador.</p>
          </div>
          <PixelButton size="lg" onClick={() => router.push("/office")}>
            Abrir escritório
          </PixelButton>
        </div>
      </section>
    </div>
  )
}
