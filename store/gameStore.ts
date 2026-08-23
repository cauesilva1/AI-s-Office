"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { OfficeState, Agent, Desk, Sector, Message, FeedItem } from "@/lib/game/types"
import { SECTORS, STARTING_AGENTS } from "@/lib/game/constants"
import { generateLogEntry } from "@/lib/game/engine"

function createInitialDesks(): Desk[] {
  const desks: Desk[] = []
  let deskId = 0
  SECTORS.forEach(sector => {
    for (let i = 0; i < 4; i++) {
      const offsetX = (i % 2) * 3 + 1
      const offsetY = Math.floor(i / 2) * 3 + 1
      desks.push({
        id: `desk-${sector.id}-${deskId++}`,
        sectorId: sector.id,
        position: {
          x: sector.zone.x + offsetX,
          y: sector.zone.y + offsetY,
        },
        agentId: null,
        // Decoração fixa do escritório (sem sistema de upgrades)
        upgrades: { monitor: 1, chair: 1, lamp: i % 2 === 0, plant: i % 3 === 0, whiteboard: false },
      })
    }
  })
  return desks
}

function createInitialAgents(desks: Desk[]): Agent[] {
  const agents: Agent[] = []
  STARTING_AGENTS.forEach(base => {
    const desk = desks.find(d => d.sectorId === base.sectorId && !d.agentId)
    if (desk) {
      desk.agentId = base.id
      agents.push({
        id: base.id,
        name: base.name,
        role: base.role,
        sectorId: base.sectorId,
        color: base.color,
        model: base.model,
        log: [generateLogEntry("Conectado ao escritório")],
        chatHistory: [],
        spriteState: "idle",
        position: { x: desk.position.x, y: desk.position.y },
      })
    }
  })
  return agents
}

function createInitialSectors(desks: Desk[]): Sector[] {
  return SECTORS.map(s => ({
    ...s,
    desks: desks.filter(d => d.sectorId === s.id).map(d => d.id),
    unlocked: true,
  }))
}

const initialState: OfficeState = {
  hour: 14, // hora fixa apenas para a iluminação da cena
  sectors: [],
  agents: [],
  desks: [],
  teamFeed: [],
  aiProvider: "mock",
  hfToken: "",
  hfModel: "",
  selectedDeskId: null,
  selectedAgentId: null,
  showSettings: false,
  showChat: false,
  showSectorMap: false,
  showHire: false,
  toast: { message: "", visible: false },
}

interface OfficeStore extends OfficeState {
  initGame: () => void
  resetGame: () => void
  selectDesk: (deskId: string | null) => void
  selectAgent: (agentId: string | null) => void
  addAgent: (data: { name: string; role: string; model: string; sectorId: string; color: string }) => boolean
  removeAgent: (agentId: string) => void
  setAIProvider: (provider: "huggingface" | "mock") => void
  setHFConfig: (token: string, model: string) => void
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

export const useGameStore = create<OfficeStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      initGame: () => {
        const desks = createInitialDesks()
        const agents = createInitialAgents(desks)
        const sectors = createInitialSectors(desks)
        const { hfToken, aiProvider } = get()
        set({ ...initialState, desks, agents, sectors, hfToken, aiProvider })
      },

      resetGame: () => {
        const desks = createInitialDesks()
        const agents = createInitialAgents(desks)
        const sectors = createInitialSectors(desks)
        const { hfToken, aiProvider } = get()
        set({ ...initialState, desks, agents, sectors, hfToken, aiProvider })
      },

      selectDesk: (deskId) => set({ selectedDeskId: deskId, selectedAgentId: null }),
      selectAgent: (agentId) => set({ selectedAgentId: agentId, selectedDeskId: null }),

      addAgent: (data) => {
        const state = get()
        const desk = state.desks.find(d => d.sectorId === data.sectorId && !d.agentId)
        if (!desk) return false

        const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
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

      setAIProvider: (provider) => set({ aiProvider: provider }),
      setHFConfig: (token, model) => set({ hfToken: token, hfModel: model }),

      showToast: (message) => set({ toast: { message, visible: true } }),
      hideToast: () => set({ toast: { message: "", visible: false } }),

      toggleModal: (modal) => set(state => {
        const key = `show${modal.charAt(0).toUpperCase() + modal.slice(1)}` as "showSettings" | "showChat" | "showSectorMap" | "showHire"
        return { [key]: !state[key] } as Partial<OfficeState>
      }),

      updateAgentPosition: (agentId, position) => set(state => ({
        agents: state.agents.map(a => a.id === agentId ? { ...a, position } : a)
      })),

      setAgentState: (agentId, spriteState) => set(state => ({
        agents: state.agents.map(a => a.id === agentId ? { ...a, spriteState } : a)
      })),

      addAgentLog: (agentId, text) => set(state => ({
        agents: state.agents.map(a => a.id === agentId ? { ...a, log: [generateLogEntry(text), ...a.log].slice(0, 20) } : a)
      })),

      addChatMessage: (agentId, message) => set(state => ({
        agents: state.agents.map(a => a.id === agentId 
          ? { ...a, chatHistory: [...(a.chatHistory || []), message].slice(-60) } 
          : a)
      })),

      clearChatHistory: (agentId) => set(state => ({
        agents: state.agents.map(a => a.id === agentId ? { ...a, chatHistory: [] } : a)
      })),

      setAgentModel: (agentId, model) => set(state => ({
        agents: state.agents.map(a => a.id === agentId ? { ...a, model } : a)
      })),

      addFeedItem: (item) => set(state => ({
        teamFeed: [
          { ...item, id: `feed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now() },
          ...state.teamFeed,
        ].slice(0, 100)
      })),
    }),
    {
      name: "agent-office-save",
      version: 3,
      migrate: (persisted: any, version) => {
        // Estruturas antigas (era um jogo) — recria o escritório do zero, preservando o token
        if (version < 3) {
          return {
            ...initialState,
            hfToken: persisted?.hfToken || "",
            aiProvider: persisted?.aiProvider === "huggingface" ? "huggingface" : "mock",
          }
        }
        return persisted
      },
      partialize: (state) => ({
        sectors: state.sectors,
        agents: state.agents,
        desks: state.desks,
        teamFeed: state.teamFeed,
        aiProvider: state.aiProvider,
        hfToken: state.hfToken,
        hfModel: state.hfModel,
      }),
    }
  )
)
