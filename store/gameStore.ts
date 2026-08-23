"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { OfficeState, Agent, Desk, Sector, Message, FeedItem, Mission, MissionStep, LayoutMode } from "@/lib/game/types"
import { BASE_SECTORS, SECTOR_LAYOUTS, STARTING_AGENTS } from "@/lib/game/constants"

// Mapa de modelos antigos → novos (defaults atualizados em ago/2026)
const MODEL_UPGRADES: Record<string, string> = {
  "Qwen/Qwen2.5-Coder-32B-Instruct": "Qwen/Qwen3-Coder-480B-A35B-Instruct",
  "meta-llama/Llama-3.3-70B-Instruct": "black-forest-labs/FLUX.1-dev",
  "Qwen/Qwen3-VL-235B-A22B-Instruct": "black-forest-labs/FLUX.1-dev",
  "deepseek-ai/DeepSeek-R1": "deepseek-ai/DeepSeek-V4-Flash",
  "Qwen/Qwen2.5-72B-Instruct": "openai/gpt-oss-120b",
  "mistralai/Mistral-7B-Instruct-v0.3": "zai-org/GLM-5.2",
  "microsoft/phi-4": "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  "meta-llama/Llama-3.2-3B-Instruct": "meta-llama/Llama-3.1-8B-Instruct",
  "google/gemma-2-9b-it": "google/gemma-4-26B-A4B-it",
  "deepseek-ai/DeepSeek-V3": "deepseek-ai/DeepSeek-V4-Flash",
}
import { generateLogEntry } from "@/lib/game/engine"

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function buildSectors(layoutMode: LayoutMode): Sector[] {
  const layout = SECTOR_LAYOUTS[layoutMode]
  return BASE_SECTORS.map((base) => ({
    ...base,
    zone: layout[base.id as keyof typeof layout],
    desks: [],
    unlocked: true,
  }))
}

function createInitialDesks(sectors: Sector[]): Desk[] {
  const desks: Desk[] = []
  let deskId = 0
  sectors.forEach(sector => {
    for (let i = 0; i < 4; i++) {
      const offsetX = (i % 2) * Math.max(2, Math.floor(sector.zone.w / 2)) + 1
      const offsetY = Math.floor(i / 2) * Math.max(2, Math.floor(sector.zone.h / 2)) + 1
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

function assignDeskReferences(sectors: Sector[], desks: Desk[]): Sector[] {
  return sectors.map((s) => ({ ...s, desks: desks.filter(d => d.sectorId === s.id).map(d => d.id) }))
}

function remapAgentPositions(agents: Agent[], desks: Desk[]): { agents: Agent[]; desks: Desk[] } {
  const freeDesks = [...desks]
  const updatedAgents = agents.map((agent) => {
    const desk = freeDesks.find((d) => d.sectorId === agent.sectorId && !d.agentId)
    if (!desk) return agent
    desk.agentId = agent.id
    return { ...agent, position: { ...desk.position } }
  })
  return { agents: updatedAgents, desks: freeDesks }
}

const initialState: OfficeState = {
  hour: 14, // hora fixa apenas para a iluminação da cena
  sectors: [],
  agents: [],
  desks: [],
  teamFeed: [],
  missionQueue: [],
  activeMission: null,
  missionHistory: [],
  routingMode: "hybrid",
  layoutMode: "wide",
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
  createMission: (payload: { prompt: string; strategy: Mission["strategy"]; primarySectorId: string; route: MissionStep[] }) => Mission
  setActiveMission: (mission: Mission | null) => void
  updateActiveMission: (partial: Partial<Mission>) => void
  completeActiveMission: (result: string) => void
  failActiveMission: (error: string) => void
  setLayoutMode: (mode: LayoutMode) => void
}

export const useGameStore = create<OfficeStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      initGame: () => {
        const sectors = buildSectors(get().layoutMode)
        const desks = createInitialDesks(sectors)
        const agents = createInitialAgents(desks)
        const sectorsWithDesks = assignDeskReferences(sectors, desks)
        const { hfToken, aiProvider } = get()
        set({ ...initialState, desks, agents, sectors: sectorsWithDesks, hfToken, aiProvider, layoutMode: get().layoutMode })
      },

      resetGame: () => {
        const sectors = buildSectors(get().layoutMode)
        const desks = createInitialDesks(sectors)
        const agents = createInitialAgents(desks)
        const sectorsWithDesks = assignDeskReferences(sectors, desks)
        const { hfToken, aiProvider } = get()
        set({ ...initialState, desks, agents, sectors: sectorsWithDesks, hfToken, aiProvider, layoutMode: get().layoutMode })
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
          { ...item, id: uid("feed"), timestamp: Date.now() },
          ...state.teamFeed,
        ].slice(0, 100)
      })),

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
            teamFeed: [
              feedEntry,
              ...state.teamFeed,
            ].slice(0, 100),
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

      completeActiveMission: (result) => set((state) => {
        if (!state.activeMission) return state
        const completed: Mission = {
          ...state.activeMission,
          status: "completed",
          finalResult: result,
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

      setLayoutMode: (mode) => set((state) => {
        if (state.layoutMode === mode) return state
        const sectors = buildSectors(mode)
        const cleanDesks = createInitialDesks(sectors)
        const repositioned = remapAgentPositions(state.agents, cleanDesks)
        const sectorsWithDesks = assignDeskReferences(sectors, repositioned.desks)
        return {
          layoutMode: mode,
          sectors: sectorsWithDesks,
          desks: repositioned.desks,
          agents: repositioned.agents,
        }
      }),
    }),
    {
      name: "agent-office-save",
      version: 6,
      migrate: (persisted: any, version) => {
        // Estruturas antigas (era um jogo) — recria o escritório do zero, preservando o token
        if (version < 4) {
          return {
            ...initialState,
            hfToken: persisted?.hfToken || "",
            aiProvider: persisted?.aiProvider === "huggingface" ? "huggingface" : "mock",
            layoutMode: persisted?.layoutMode === "compact" ? "compact" : "wide",
          }
        }
        if (version < 6 && Array.isArray(persisted?.agents)) {
          const startingNames = new Map(STARTING_AGENTS.map((a) => [a.id, a.name]))
          persisted.agents = persisted.agents.map((agent: Agent) => {
            const upgraded = MODEL_UPGRADES[agent.model]
            if (!upgraded) return agent
            return {
              ...agent,
              model: upgraded,
              name: startingNames.get(agent.id) || agent.name,
            }
          })
        }
        return persisted
      },
      partialize: (state) => ({
        sectors: state.sectors,
        agents: state.agents,
        desks: state.desks,
        teamFeed: state.teamFeed,
        missionQueue: state.missionQueue,
        missionHistory: state.missionHistory,
        routingMode: state.routingMode,
        layoutMode: state.layoutMode,
        aiProvider: state.aiProvider,
        hfToken: state.hfToken,
        hfModel: state.hfModel,
      }),
    }
  )
)
