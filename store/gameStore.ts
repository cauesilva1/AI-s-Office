"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { Agent, ApiKeys } from "@/lib/game/types"
import { STARTING_AGENTS } from "@/lib/game/constants"
import { PROVIDERS } from "@/lib/ai/providers"
import { MODEL_UPGRADES, fillMissingStartingAgents } from "@/store/officeBootstrap"
import { createOfficeSlice } from "@/store/slices/officeSlice"
import { createProviderSlice } from "@/store/slices/providerSlice"
import { createMissionSlice } from "@/store/slices/missionSlice"
import type { OfficeStore } from "@/store/types"

export type { OfficeStore }

export const useGameStore = create<OfficeStore>()(
  persist(
    (...args) => ({
      ...createOfficeSlice(...args),
      ...createProviderSlice(...args),
      ...createMissionSlice(...args),
    }),
    {
      name: "agent-office-save",
      version: 10,
      migrate: (persisted: any, version) => {
        if (version < 4) {
          return {
            hfToken: persisted?.hfToken || "",
            aiProvider: persisted?.aiProvider === "huggingface" ? "huggingface" : "mock",
            apiKeys: persisted?.hfToken ? { huggingface: persisted.hfToken } : {},
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
        if (version < 7 && Array.isArray(persisted?.agents) && Array.isArray(persisted?.desks)) {
          const filled = fillMissingStartingAgents(persisted.agents, persisted.desks)
          persisted.agents = filled.agents
          persisted.desks = filled.desks
        }
        if (version < 8 && persisted) {
          delete persisted.layoutMode
          delete persisted.hour
        }
        if (version < 9 && persisted) {
          const valid = new Set(PROVIDERS.map(p => p.id))
          if (!valid.has(persisted.aiProvider)) persisted.aiProvider = "mock"
          const keys: ApiKeys = { ...(persisted.apiKeys || {}) }
          if (persisted.hfToken && !keys.huggingface) keys.huggingface = persisted.hfToken
          persisted.apiKeys = keys
        }
        // v10: slices (sem mudança de schema)
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
        aiProvider: state.aiProvider,
        hfToken: state.hfToken,
        hfModel: state.hfModel,
        apiKeys: state.apiKeys,
      }),
    }
  )
)
