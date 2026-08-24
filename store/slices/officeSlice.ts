import type { StateCreator } from "zustand"
import { Agent, Desk, FeedItem, Message, Sector } from "@/lib/game/types"
import { generateLogEntry } from "@/lib/game/engine"
import {
  assignDeskReferences,
  buildSectors,
  createInitialAgents,
  createInitialDesks,
  uid,
} from "@/store/officeBootstrap"
import type { OfficeStore } from "@/store/types"

export type OfficeSlice = {
  sectors: Sector[]
  agents: Agent[]
  desks: Desk[]
  teamFeed: FeedItem[]
  selectedDeskId: string | null
  selectedAgentId: string | null
  toast: { message: string; visible: boolean }
  showSettings: boolean
  showChat: boolean
  showSectorMap: boolean
  showHire: boolean
  initGame: () => void
  resetGame: () => void
  selectDesk: (deskId: string | null) => void
  selectAgent: (agentId: string | null) => void
  addAgent: (data: { name: string; role: string; model: string; sectorId: string; color: string }) => boolean
  removeAgent: (agentId: string) => void
  showToast: (message: string) => void
  hideToast: () => void
  toggleModal: (modal: "settings" | "chat" | "sectorMap" | "hire") => void
  updateAgentPosition: (agentId: string, position: { x: number; y: number }) => void
  setAgentState: (agentId: string, state: Agent["spriteState"]) => void
  addAgentLog: (agentId: string, text: string) => void
  addChatMessage: (agentId: string, message: Message) => void
  clearChatHistory: (agentId: string) => void
  setAgentModel: (agentId: string, model: string) => void
  addFeedItem: (item: Omit<FeedItem, "id" | "timestamp">) => void
}

export const createOfficeSlice: StateCreator<OfficeStore, [], [], OfficeSlice> = (set, get) => ({
  sectors: [],
  agents: [],
  desks: [],
  teamFeed: [],
  selectedDeskId: null,
  selectedAgentId: null,
  toast: { message: "", visible: false },
  showSettings: false,
  showChat: false,
  showSectorMap: false,
  showHire: false,

  initGame: () => {
    const sectors = buildSectors()
    const desks = createInitialDesks(sectors)
    const agents = createInitialAgents(desks)
    const sectorsWithDesks = assignDeskReferences(sectors, desks)
    const { hfToken, aiProvider, apiKeys, hfModel, routingMode } = get()
    set({
      sectors: sectorsWithDesks,
      desks,
      agents,
      teamFeed: [],
      missionQueue: [],
      activeMission: null,
      missionHistory: [],
      selectedDeskId: null,
      selectedAgentId: null,
      providerError: null,
      toast: { message: "", visible: false },
      hfToken,
      aiProvider,
      apiKeys,
      hfModel,
      routingMode,
    })
  },

  resetGame: () => {
    get().initGame()
  },

  selectDesk: (deskId) => set({ selectedDeskId: deskId, selectedAgentId: null }),
  selectAgent: (agentId) => set({ selectedAgentId: agentId, selectedDeskId: null }),

  addAgent: (data) => {
    const state = get()
    const desk = state.desks.find(d => d.sectorId === data.sectorId && !d.agentId)
    if (!desk) return false

    const id = uid("agent")
    const newAgent: Agent = {
      id,
      name: data.name,
      role: data.role,
      sectorId: data.sectorId,
      color: data.color,
      model: data.model,
      log: [generateLogEntry("Conectado ao escritório")],
      chatHistory: [],
      spriteState: "idle",
      position: { x: desk.position.x, y: desk.position.y },
    }

    set({
      desks: state.desks.map(d => d.id === desk.id ? { ...d, agentId: id } : d),
      agents: [...state.agents, newAgent],
    })
    return true
  },

  removeAgent: (agentId) => set(state => ({
    agents: state.agents.filter(a => a.id !== agentId),
    desks: state.desks.map(d => d.agentId === agentId ? { ...d, agentId: null } : d),
    selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId,
  })),

  showToast: (message) => set({ toast: { message, visible: true } }),
  hideToast: () => set({ toast: { message: "", visible: false } }),

  toggleModal: (modal) => set(state => {
    const key = `show${modal.charAt(0).toUpperCase() + modal.slice(1)}` as
      | "showSettings" | "showChat" | "showSectorMap" | "showHire"
    return { [key]: !state[key] }
  }),

  updateAgentPosition: (agentId, position) => set(state => ({
    agents: state.agents.map(a => a.id === agentId ? { ...a, position } : a),
  })),

  setAgentState: (agentId, spriteState) => set(state => ({
    agents: state.agents.map(a => a.id === agentId ? { ...a, spriteState } : a),
  })),

  addAgentLog: (agentId, text) => set(state => ({
    agents: state.agents.map(a =>
      a.id === agentId ? { ...a, log: [generateLogEntry(text), ...a.log].slice(0, 20) } : a
    ),
  })),

  addChatMessage: (agentId, message) => set(state => ({
    agents: state.agents.map(a =>
      a.id === agentId
        ? { ...a, chatHistory: [...(a.chatHistory || []), message].slice(-60) }
        : a
    ),
  })),

  clearChatHistory: (agentId) => set(state => ({
    agents: state.agents.map(a => a.id === agentId ? { ...a, chatHistory: [] } : a),
  })),

  setAgentModel: (agentId, model) => set(state => ({
    agents: state.agents.map(a => a.id === agentId ? { ...a, model } : a),
  })),

  addFeedItem: (item) => set(state => ({
    teamFeed: [
      { ...item, id: uid("feed"), timestamp: Date.now() },
      ...state.teamFeed,
    ].slice(0, 100),
  })),
})
