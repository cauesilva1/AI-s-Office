"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { useGameStore } from "@/store/gameStore"
import HeaderDropdown from "@/components/office/HeaderDropdown"
import SettingsPanel from "@/components/office/SettingsPanel"
import HirePanel from "@/components/office/HirePanel"
import FeedPanel from "@/components/office/FeedPanel"
import SectorBoard from "@/components/office/SectorBoard"
import AgentChatPane from "@/components/office/AgentChatPane"
import MissionComposer from "@/components/game/MissionComposer"
import WorkingStrip from "@/components/office/WorkingStrip"
import Toast from "@/components/game/Toast"
import { getProviderMeta, isLiveProvider, providerNeedsKey } from "@/lib/ai/providers"
import { isEnsembleProvider, isSoloProvider } from "@/lib/ai/officeMode"

export default function OfficePage() {
  const {
    agents,
    selectedAgentId,
    aiProvider,
    apiKeys,
    hfToken,
    initGame,
    teamFeed,
    providerError,
    settingsOpenNonce,
    serverProviders,
    setProviderError,
    requestOpenSettings,
    loadServerConfig,
  } = useGameStore()
  const [mobileTab, setMobileTab] = useState<"missao" | "times">("missao")
  const meta = getProviderMeta(aiProvider)
  const hasServerKey = aiProvider !== "mock" && serverProviders.includes(aiProvider)
  const needsKey = providerNeedsKey(aiProvider, apiKeys, hfToken) && !hasServerKey
  const live = (isLiveProvider(aiProvider) && !needsKey) || hasServerKey
  const apiActive = needsKey || Boolean(providerError)

  useEffect(() => {
    if (useGameStore.getState().agents.length === 0) initGame()
    loadServerConfig()
  }, [initGame, loadServerConfig])

  useEffect(() => {
    if (selectedAgentId) setMobileTab("times")
  }, [selectedAgentId])

  const apiLabel = providerError
    ? `${meta.short}!`
    : live
      ? meta.short
      : needsKey
        ? "API"
        : meta.short

  return (
    <div className="theme-cream h-dvh max-h-dvh flex flex-col overflow-hidden bg-cream">
      <header className="flex-shrink-0 border-b-[3px] border-ink bg-paper px-3 py-2 flex items-center gap-2 relative z-50 overflow-visible">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#2d8f6f 1px, transparent 1px), linear-gradient(90deg, #2d8f6f 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <Link href="/" className="relative z-10 font-pixel text-[9px] sm:text-[10px] text-coral tracking-wide flex-shrink-0">
          AGENT OFFICE
        </Link>
        <span className="relative z-10 hidden sm:inline text-[11px] text-muted-ink truncate">
          {isSoloProvider(aiProvider)
            ? "Solo · 6 sêniores"
            : isEnsembleProvider(aiProvider)
              ? "OpenRouter · 3×6 ensemble"
              : `${agents.length} agentes`}
          {teamFeed[0] ? ` · ${teamFeed[0].text.slice(0, 40)}` : ""}
        </span>

        <div className="relative z-10 ml-auto flex items-center gap-1.5">
          <HeaderDropdown label="Atividade" panelClassName="w-[min(92vw,24rem)]">
            <FeedPanel />
          </HeaderDropdown>
          <HeaderDropdown
            label={
              isSoloProvider(aiProvider)
                ? "Modelo"
                : isEnsembleProvider(aiProvider)
                  ? "Trio"
                  : "+ IA"
            }
          >
            <HirePanel />
          </HeaderDropdown>
          <HeaderDropdown
            label={apiLabel}
            active={apiActive}
            openSignal={settingsOpenNonce}
            panelClassName="!w-auto p-0"
          >
            <SettingsPanel />
          </HeaderDropdown>
        </div>
      </header>

      {providerError && (
        <div className="flex-shrink-0 border-b-2 border-ink bg-coral/15 px-3 py-2 flex items-start gap-2">
          <p className="flex-1 text-[11px] text-ink leading-snug">{providerError}</p>
          <button
            type="button"
            onClick={() => requestOpenSettings()}
            className="text-[10px] font-bold border-2 border-ink px-2 py-1 bg-paper hover:bg-coral hover:text-cream flex-shrink-0"
          >
            Abrir API
          </button>
          <button
            type="button"
            onClick={() => setProviderError(null)}
            className="text-[10px] font-bold text-muted-ink px-1 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      <WorkingStrip />

      <div className="md:hidden flex-shrink-0 flex border-b-2 border-ink">
        <button
          type="button"
          onClick={() => setMobileTab("missao")}
          className={`flex-1 py-2 text-xs font-bold border-r-2 border-ink ${
            mobileTab === "missao" ? "bg-navy text-cream" : "bg-paper text-ink"
          }`}
        >
          Missão
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("times")}
          className={`flex-1 py-2 text-xs font-bold ${
            mobileTab === "times" ? "bg-navy text-cream" : "bg-paper text-ink"
          }`}
        >
          Times {selectedAgentId ? "· chat" : ""}
        </button>
      </div>

      <main className="flex-1 min-h-0 grid md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <section
          className={`min-h-0 overflow-y-auto border-ink md:border-r-[3px] p-3 sm:p-4 ${
            mobileTab === "missao" ? "block" : "hidden md:block"
          }`}
        >
          <MissionComposer compact />
        </section>

        <aside
          className={`min-h-0 overflow-hidden flex flex-col ${
            mobileTab === "times" ? "flex" : "hidden md:flex"
          }`}
        >
          <AnimatePresence mode="wait">
            {selectedAgentId ? (
              <AgentChatPane key="chat" />
            ) : (
              <motion.div
                key="board"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-0"
              >
                <SectorBoard />
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </main>

      <Toast />
    </div>
  )
}
