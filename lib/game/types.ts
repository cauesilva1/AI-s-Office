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
}

export interface OfficeState {
  hour: number
  sectors: Sector[]
  agents: Agent[]
  desks: Desk[]
  teamFeed: FeedItem[]
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
