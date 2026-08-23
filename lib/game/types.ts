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
export type LayoutMode = "wide" | "compact"
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
  hour: number
  sectors: Sector[]
  agents: Agent[]
  desks: Desk[]
  teamFeed: FeedItem[]
  missionQueue: Mission[]
  activeMission: Mission | null
  missionHistory: Mission[]
  routingMode: RoutingMode
  layoutMode: LayoutMode
  aiProvider: "huggingface" | "mock"
  hfToken: string
  hfModel: string
  selectedDeskId: string | null
  selectedAgentId: string | null
  showSettings: boolean
  showChat: boolean
  showSectorMap: boolean
  showHire: boolean
  toast: { message: string; visible: boolean }
}

// Alias mantido para componentes antigos
export type GameState = OfficeState
