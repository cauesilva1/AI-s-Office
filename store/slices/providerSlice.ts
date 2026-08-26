import type { StateCreator } from "zustand"
import { AIProvider, ApiKeys } from "@/lib/game/types"
import { remapAgentsForProvider } from "@/lib/ai/remapModels"
import {
  collapseToSoloSeniors,
  ensureEnsembleRoster,
  ensureHfRoster,
  isEnsembleProvider,
  isSoloProvider,
} from "@/lib/ai/officeMode"
import type { OfficeStore } from "@/store/types"

export type ProviderSwitchResult = {
  remapped: number
  removed: number
  added: number
  mode: "solo" | "team" | "ensemble"
}


export type ProviderSlice = {
  aiProvider: AIProvider
  hfToken: string
  hfModel: string
  apiKeys: ApiKeys
  providerError: string | null
  settingsOpenNonce: number
  serverProviders: Exclude<AIProvider, "mock">[]
  allowClientKeys: boolean
  setAIProvider: (provider: AIProvider) => void
  setHFConfig: (token: string, model: string) => void
  setApiKey: (provider: Exclude<AIProvider, "mock">, key: string) => void
  setProviderConfig: (provider: AIProvider, key?: string) => void
  applyProviderSwitch: (provider: AIProvider, key?: string) => ProviderSwitchResult
  setProviderError: (message: string | null) => void
  requestOpenSettings: () => void
  loadServerConfig: () => Promise<void>
}

export const createProviderSlice: StateCreator<OfficeStore, [], [], ProviderSlice> = (set, get) => ({
  aiProvider: "mock",
  hfToken: "",
  hfModel: "",
  apiKeys: {},
  providerError: null,
  settingsOpenNonce: 0,
  serverProviders: [],
  allowClientKeys: true,

  setAIProvider: (provider) => set({ aiProvider: provider }),

  setHFConfig: (token, model) => set(state => ({
    hfToken: token,
    hfModel: model,
    apiKeys: { ...state.apiKeys, huggingface: token },
  })),

  setApiKey: (provider, key) => set(state => ({
    apiKeys: { ...state.apiKeys, [provider]: key },
    ...(provider === "huggingface" ? { hfToken: key } : {}),
  })),

  setProviderConfig: (provider, key) => set(state => {
    if (provider === "mock") {
      return { aiProvider: "mock", providerError: null }
    }
    const nextKeys: ApiKeys = { ...state.apiKeys }
    if (typeof key === "string") nextKeys[provider] = key
    return {
      aiProvider: provider,
      apiKeys: nextKeys,
      providerError: null,
      ...(provider === "huggingface" && typeof key === "string" ? { hfToken: key } : {}),
    }
  }),

  applyProviderSwitch: (provider, key) => {
    const state = get()
    let agents = state.agents
    let desks = state.desks
    let remapped = 0
    let removed = 0
    let added = 0

    if (isSoloProvider(provider)) {
      const roster = collapseToSoloSeniors(agents, desks, provider)
      agents = roster.agents
      desks = roster.desks
      removed = roster.removed
    } else if (isEnsembleProvider(provider)) {
      const roster = ensureEnsembleRoster(agents, desks, provider)
      agents = roster.agents
      desks = roster.desks
      removed = roster.removed
      added = roster.added
    } else {
      const roster = ensureHfRoster(agents, desks)
      agents = roster.agents
      desks = roster.desks
      added = roster.added
      removed = roster.removed
    }

    // Sempre após montar o roster — corrige modelos OR/OpenAI que sobraram no HF etc.
    const remap = remapAgentsForProvider(agents, provider)
    agents = remap.agents
    remapped = remap.changed

    const mode = isSoloProvider(provider)
      ? ("solo" as const)
      : isEnsembleProvider(provider)
        ? ("ensemble" as const)
        : ("team" as const)

    if (provider === "mock") {
      set({
        aiProvider: "mock",
        agents,
        desks,
        providerError: null,
        selectedAgentId: agents.some(a => a.id === state.selectedAgentId) ? state.selectedAgentId : null,
      })
      return { remapped, removed, added, mode }
    }

    const nextKeys: ApiKeys = { ...state.apiKeys }
    if (typeof key === "string") nextKeys[provider] = key

    set({
      aiProvider: provider,
      apiKeys: nextKeys,
      agents,
      desks,
      providerError: null,
      selectedAgentId: agents.some(a => a.id === state.selectedAgentId) ? state.selectedAgentId : null,
      ...(provider === "huggingface" && typeof key === "string" ? { hfToken: key } : {}),
    })
    return { remapped, removed, added, mode }
  },

  setProviderError: (message) => set({ providerError: message }),

  requestOpenSettings: () => set(state => ({
    settingsOpenNonce: state.settingsOpenNonce + 1,
    showSettings: true,
  })),

  loadServerConfig: async () => {
    try {
      const res = await fetch("/api/config")
      const data = await res.json()
      set({
        serverProviders: Array.isArray(data.serverProviders) ? data.serverProviders : [],
        allowClientKeys: data.allowClientKeys !== false,
      })
    } catch {
      set({ serverProviders: [], allowClientKeys: true })
    }
  },
})
