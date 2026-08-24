import type { AIProvider, ApiKeys } from "@/lib/ai/providers"

export type { AIProvider, ApiKeys }

export interface Agent {
  id: string
  name: string
  role: string
  sectorId: string
  color: string
  model: string
  log: LogEntry[]
  chatHistory: Message[]
  spriteState: "idle" | "working"
  position: { x: number; y: number }
  targetPosition?: { x: number; y: number }
}

export interface Sector {
  id: string
  name: string
  color: string
  zone: { x: number; y: number; w: number; h: number }
  desks: string[]
  unlocked: boolean
}

export interface Desk {
  id: string
  sectorId: string
  position: { x: number; y: number }
  agentId: string | null
  upgrades: {
    monitor: number
    chair: number
    lamp: boolean
    plant: boolean
    whiteboard: boolean
  }
}

export interface LogEntry {
  text: string
  timestamp: number
}

export interface Message {
  role: "system" | "user" | "assistant"
  content: string
  timestamp: number
  handoffFrom?: string
  imageUrl?: string
}

export interface FeedItem {
  id: string
  agentId: string
  targetAgentId?: string
  kind: "message" | "handoff" | "info"
  text: string
  timestamp: number
  missionId?: string
  stage?: number
}

export type RoutingMode = "hybrid"
export type MissionStatus = "queued" | "routing" | "running" | "completed" | "failed"

export interface MissionStep {
  sectorId: string
  agentId: string | null
  note: string
}

export interface Mission {
  id: string
  prompt: string
  status: MissionStatus
  strategy: "rules" | "llm" | "manual_override"
  primarySectorId: string
  route: MissionStep[]
  createdAt: number
  startedAt?: number
  completedAt?: number
  finalResult?: string
  error?: string
}

export interface OfficeState {
  sectors: Sector[]
  agents: Agent[]
  desks: Desk[]
  teamFeed: FeedItem[]
  missionQueue: Mission[]
  activeMission: Mission | null
  missionHistory: Mission[]
  routingMode: RoutingMode
  aiProvider: AIProvider
  /** @deprecated use apiKeys.huggingface — mantido p/ migração */
  hfToken: string
  hfModel: string
  apiKeys: ApiKeys
  providerError: string | null
  settingsOpenNonce: number
  selectedDeskId: string | null
  selectedAgentId: string | null
  showSettings: boolean
  showChat: boolean
  showSectorMap: boolean
  showHire: boolean
  toast: { message: string; visible: boolean }
}

export type GameState = OfficeState
