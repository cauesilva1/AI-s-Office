"use client"

import { useEffect } from "react"
import dynamic from "next/dynamic"
import { useGameStore } from "@/store/gameStore"
import TopBar from "@/components/game/TopBar"
import Sidebar from "@/components/game/Sidebar"
import Toast from "@/components/game/Toast"

const PixiCanvas = dynamic(() => import("@/components/office/PixiCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#0c1422]" />,
})
const AgentPanel = dynamic(() => import("@/components/game/AgentPanel"), { ssr: false })
const MissionComposer = dynamic(() => import("@/components/game/MissionComposer"), { ssr: false })
const AddAgentModal = dynamic(() => import("@/components/game/AddAgentModal"), { ssr: false })
const SettingsModal = dynamic(() => import("@/components/game/SettingsModal"), { ssr: false })
const SectorMap = dynamic(() => import("@/components/game/SectorMap"), { ssr: false })
const ChatModal = dynamic(() => import("@/components/game/ChatModal"), { ssr: false })

export default function OfficePage() {
  const selectedAgentId = useGameStore(s => s.selectedAgentId)
  const agentCount = useGameStore(s => s.agents.length)

  useEffect(() => {
    if (agentCount === 0) useGameStore.getState().initGame()
  }, [agentCount])

  return (
    <div className="relative w-screen h-screen bg-[#0b1220] overflow-hidden">
      <PixiCanvas />
      <TopBar />
      <Sidebar />
      <MissionComposer />
      {selectedAgentId && <AgentPanel />}
      <AddAgentModal />
      <SettingsModal />
      <SectorMap />
      <ChatModal />
      <Toast />
    </div>
  )
}
