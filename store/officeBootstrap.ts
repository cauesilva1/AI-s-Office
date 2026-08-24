import { Agent, Desk, Sector } from "@/lib/game/types"
import { BASE_SECTORS, DEFAULT_SECTOR_ZONES, STARTING_AGENTS } from "@/lib/game/constants"
import { generateLogEntry } from "@/lib/game/engine"

export function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function buildSectors(): Sector[] {
  return BASE_SECTORS.map((base) => ({
    ...base,
    zone: DEFAULT_SECTOR_ZONES[base.id as keyof typeof DEFAULT_SECTOR_ZONES],
    desks: [],
    unlocked: true,
  }))
}

export function createInitialDesks(sectors: Sector[]): Desk[] {
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
        upgrades: { monitor: 1, chair: 1, lamp: i % 2 === 0, plant: i % 3 === 0, whiteboard: false },
      })
    }
  })
  return desks
}

export function createInitialAgents(desks: Desk[]): Agent[] {
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

export function assignDeskReferences(sectors: Sector[], desks: Desk[]): Sector[] {
  return sectors.map((s) => ({ ...s, desks: desks.filter(d => d.sectorId === s.id).map(d => d.id) }))
}

export function fillMissingStartingAgents(agents: Agent[], desks: Desk[]): { agents: Agent[]; desks: Desk[] } {
  const nextAgents = [...agents]
  const nextDesks = desks.map(d => ({ ...d }))
  const existingIds = new Set(nextAgents.map(a => a.id))

  STARTING_AGENTS.forEach(base => {
    if (existingIds.has(base.id)) return
    const desk = nextDesks.find(d => d.sectorId === base.sectorId && !d.agentId)
    if (!desk) return
    desk.agentId = base.id
    existingIds.add(base.id)
    nextAgents.push({
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
  })

  return { agents: nextAgents, desks: nextDesks }
}

export const MODEL_UPGRADES: Record<string, string> = {
  "Qwen/Qwen2.5-Coder-32B-Instruct": "Qwen/Qwen3-Coder-480B-A35B-Instruct",
  "Qwen/Qwen3-VL-235B-A22B-Instruct": "black-forest-labs/FLUX.1-dev",
  "Qwen/Qwen2.5-72B-Instruct": "openai/gpt-oss-120b",
  "mistralai/Mistral-7B-Instruct-v0.3": "zai-org/GLM-5.2",
  "microsoft/phi-4": "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  "meta-llama/Llama-3.2-3B-Instruct": "meta-llama/Llama-3.1-8B-Instruct",
  "google/gemma-2-9b-it": "google/gemma-4-26B-A4B-it",
  "deepseek-ai/DeepSeek-V3": "deepseek-ai/DeepSeek-V4-Flash",
}
