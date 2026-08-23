"use client"

import { useEffect } from "react"
import dynamic from "next/dynamic"
import { useGameStore } from "@/store/gameStore"
import TopBar from "@/components/game/TopBar"
import Sidebar from "@/components/game/Sidebar"
import AgentPanel from "@/components/game/AgentPanel"
import AddAgentModal from "@/components/game/AddAgentModal"
import SettingsModal from "@/components/game/SettingsModal"
import SectorMap from "@/components/game/SectorMap"
import ChatModal from "@/components/game/ChatModal"
import Toast from "@/components/game/Toast"

const PixiCanvas = dynamic(() => import("@/components/office/PixiCanvas"), { ssr: false })

export default function OfficePage() {
  const selectedAgentId = useGameStore(s => s.selectedAgentId)
  const agentCount = useGameStore(s => s.agents.length)

  useEffect(() => {
    if (agentCount === 0) useGameStore.getState().initGame()
  }, [agentCount])

  return (
    <div className="relative w-screen h-screen bg-[#0c140d] overflow-hidden">
      <PixiCanvas />
      <TopBar />
      <Sidebar />
      {selectedAgentId && <AgentPanel />}
      <AddAgentModal />
      <SettingsModal />
      <SectorMap />
      <ChatModal />
      <Toast />
    </div>
  )
}
