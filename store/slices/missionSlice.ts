import type { StateCreator } from "zustand"
import { FeedItem, Mission, MissionStep, RoutingMode } from "@/lib/game/types"
import { uid } from "@/store/officeBootstrap"
import type { OfficeStore } from "@/store/types"

export type MissionSlice = {
  missionQueue: Mission[]
  activeMission: Mission | null
  missionHistory: Mission[]
  routingMode: RoutingMode
  createMission: (payload: {
    prompt: string
    strategy: Mission["strategy"]
    primarySectorId: string
    route: MissionStep[]
  }) => Mission
  setActiveMission: (mission: Mission | null) => void
  updateActiveMission: (partial: Partial<Mission>) => void
  completeActiveMission: (
    result: string,
    media?: { imageUrl?: string; videoUrl?: string; audioUrl?: string },
  ) => void
  failActiveMission: (error: string) => void
}

export const createMissionSlice: StateCreator<OfficeStore, [], [], MissionSlice> = (set, get) => ({
  missionQueue: [],
  activeMission: null,
  missionHistory: [],
  routingMode: "hybrid",

  createMission: ({ prompt, strategy, primarySectorId, route }) => {
    const mission: Mission = {
      id: uid("mission"),
      prompt,
      strategy,
      primarySectorId,
      route,
      status: "queued",
      createdAt: Date.now(),
    }
    set((state) => {
      const feedEntry: FeedItem = {
        id: uid("feed"),
        kind: "info",
        text: `Nova missão criada: "${prompt.slice(0, 80)}${prompt.length > 80 ? "..." : ""}"`,
        agentId: route.find((step) => step.agentId)?.agentId || state.agents[0]?.id || "",
        missionId: mission.id,
        timestamp: Date.now(),
      }
      return {
        missionQueue: [mission, ...state.missionQueue].slice(0, 30),
        activeMission: mission,
        teamFeed: [feedEntry, ...state.teamFeed].slice(0, 100),
      }
    })
    return mission
  },

  setActiveMission: (mission) => set({ activeMission: mission }),

  updateActiveMission: (partial) => set((state) => {
    if (!state.activeMission) return state
    const updated = { ...state.activeMission, ...partial }
    return {
      activeMission: updated,
      missionQueue: state.missionQueue.map((m) => m.id === updated.id ? updated : m),
    }
  }),

  completeActiveMission: (result, media) => set((state) => {
    if (!state.activeMission) return state
    const completed: Mission = {
      ...state.activeMission,
      status: "completed",
      finalResult: result,
      imageUrl: media?.imageUrl,
      videoUrl: media?.videoUrl,
      audioUrl: media?.audioUrl,
      completedAt: Date.now(),
    }
    return {
      activeMission: null,
      missionQueue: state.missionQueue.map((m) => m.id === completed.id ? completed : m),
      missionHistory: [completed, ...state.missionHistory].slice(0, 40),
    }
  }),

  failActiveMission: (error) => set((state) => {
    if (!state.activeMission) return state
    const failed: Mission = {
      ...state.activeMission,
      status: "failed",
      error,
      completedAt: Date.now(),
    }
    return {
      activeMission: null,
      missionQueue: state.missionQueue.map((m) => m.id === failed.id ? failed : m),
      missionHistory: [failed, ...state.missionHistory].slice(0, 40),
    }
  }),
})
