import { describe, expect, it } from "vitest"
import {
  buildAgentSystemPrompt,
  collapseToSoloSeniors,
  ensureEnsembleRoster,
  ensureHfRoster,
  isEnsembleProvider,
  isSoloProvider,
  SECTOR_SENIORS,
} from "@/lib/ai/officeMode"
import { STARTING_AGENTS } from "@/lib/game/constants"
import type { Agent, Desk } from "@/lib/game/types"

function makeDesk(id: string, sectorId: string, agentId: string | null = null): Desk {
  return {
    id,
    sectorId,
    position: { x: 0, y: 0 },
    agentId,
    upgrades: { monitor: 0, chair: 0, lamp: false, plant: false, whiteboard: false },
  }
}

function makeAgent(partial: Partial<Agent> & Pick<Agent, "id" | "name" | "sectorId" | "model">): Agent {
  return {
    role: "Dev",
    color: "#000",
    log: [],
    chatHistory: [],
    spriteState: "idle",
    position: { x: 0, y: 0 },
    ...partial,
  }
}

describe("isSoloProvider", () => {
  it("marks API providers as solo and HF/mock/OR as team/ensemble", () => {
    expect(isSoloProvider("openai")).toBe(true)
    expect(isSoloProvider("anthropic")).toBe(true)
    expect(isSoloProvider("groq")).toBe(true)
    expect(isSoloProvider("nvidia")).toBe(true)
    expect(isSoloProvider("google")).toBe(true)
    expect(isSoloProvider("openrouter")).toBe(false)
    expect(isSoloProvider("huggingface")).toBe(false)
    expect(isSoloProvider("mock")).toBe(false)
  })
})

describe("collapseToSoloSeniors", () => {
  it("keeps exactly one senior per sector present", () => {
    const agents: Agent[] = [
      makeAgent({
        id: "a1",
        name: "Old Eng 1",
        role: "jr",
        sectorId: "engineering",
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
      }),
      makeAgent({
        id: "a2",
        name: "Old Eng 2",
        role: "jr",
        sectorId: "engineering",
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
      }),
      makeAgent({
        id: "a3",
        name: "Old Design",
        role: "mid",
        sectorId: "design",
        model: "black-forest-labs/FLUX.1-schnell",
      }),
    ]
    const desks = [
      makeDesk("d1", "engineering", "a1"),
      makeDesk("d2", "engineering", "a2"),
      makeDesk("d3", "design", "a3"),
      makeDesk("d4", "product", null),
      makeDesk("d5", "research", null),
      makeDesk("d6", "data", null),
      makeDesk("d7", "devops", null),
      makeDesk("d8", "growth", null),
    ]

    const { agents: nextAgents, desks: nextDesks, removed } = collapseToSoloSeniors(
      agents,
      desks,
      "openai",
    )

    expect(removed).toBe(1)
    expect(nextAgents).toHaveLength(6)
    expect(nextAgents.filter((a) => a.sectorId === "engineering")).toHaveLength(1)
    expect(nextAgents.find((a) => a.sectorId === "engineering")?.name).toBe(
      SECTOR_SENIORS.engineering.name,
    )
    expect(nextAgents.find((a) => a.sectorId === "engineering")?.role).toBe(
      SECTOR_SENIORS.engineering.role,
    )
    expect(nextDesks.find((d) => d.id === "d2")?.agentId).toBeNull()
  })

  it("produces six seniors when starting from full roster", () => {
    const agents: Agent[] = STARTING_AGENTS.map((a) =>
      makeAgent({
        id: a.id,
        name: a.name,
        role: a.role,
        sectorId: a.sectorId,
        model: a.model,
        color: a.color,
      }),
    )
    const desks = agents.map((a, i) => makeDesk(`desk-${i}`, a.sectorId, a.id))

    const { agents: next } = collapseToSoloSeniors(agents, desks, "anthropic")
    expect(next).toHaveLength(6)
    const sectors = new Set(next.map((a) => a.sectorId))
    expect(sectors.size).toBe(6)
  })
})

describe("ensureHfRoster", () => {
  it("restores missing starting agents when switching back to HF", () => {
    const agents: Agent[] = [
      makeAgent({
        id: "keep-eng",
        name: "Nova",
        role: "Staff engineer",
        sectorId: "engineering",
        model: "openai/gpt-4o-mini",
      }),
    ]
    const desks = [
      makeDesk("d1", "engineering", "keep-eng"),
      makeDesk("d2", "design", null),
      makeDesk("d3", "research", null),
      makeDesk("d4", "data", null),
      makeDesk("d5", "devops", null),
      makeDesk("d6", "growth", null),
      makeDesk("d7", "engineering", null),
      makeDesk("d8", "design", null),
      makeDesk("d9", "research", null),
      makeDesk("d10", "data", null),
      makeDesk("d11", "devops", null),
      makeDesk("d12", "growth", null),
      makeDesk("d13", "engineering", null),
      makeDesk("d14", "design", null),
      makeDesk("d15", "research", null),
      makeDesk("d16", "data", null),
      makeDesk("d17", "devops", null),
      makeDesk("d18", "growth", null),
    ]

    const { agents: next, added } = ensureHfRoster(agents, desks)
    expect(added).toBeGreaterThan(0)
    expect(next.length).toBeGreaterThan(agents.length)
    expect(next.some((a) => a.sectorId === "design")).toBe(true)
  })
})

describe("ensureEnsembleRoster", () => {
  it("creates exactly 3 agents per sector with distinct models", () => {
    const desks = [
      ...["engineering", "design", "research", "data", "devops", "growth"].flatMap((sid) =>
        [0, 1, 2, 3].map((i) => makeDesk(`d-${sid}-${i}`, sid, null)),
      ),
    ]
    const { agents } = ensureEnsembleRoster([], desks, "openrouter")
    expect(agents).toHaveLength(18)
    expect(isEnsembleProvider("openrouter")).toBe(true)
    const eng = agents.filter((a) => a.sectorId === "engineering")
    expect(eng).toHaveLength(3)
    expect(new Set(eng.map((a) => a.model)).size).toBe(3)
    expect(eng.map((a) => a.role)).toEqual(["Proposta", "Crítica", "Ângulo rápido"])

    const design = agents.filter((a) => a.sectorId === "design")
    expect(design.map((a) => a.role)).toEqual(["Brief visual", "Imagem · background", "Vídeo · background"])
  })
})

describe("buildAgentSystemPrompt", () => {
  it("uses senior engineering prompt in solo mode", () => {
    const prompt = buildAgentSystemPrompt({
      provider: "openai",
      sectorId: "engineering",
      agentName: "Coder",
      agentRole: "Dev",
    })
    expect(prompt.toLowerCase()).toMatch(/engenharia|engineer|staff/)
    expect(prompt).toContain(SECTOR_SENIORS.engineering.systemPrompt.slice(0, 40))
  })

  it("adds ensemble slot angle for openrouter", () => {
    const prompt = buildAgentSystemPrompt({
      provider: "openrouter",
      sectorId: "engineering",
      agentName: "Eng",
      agentRole: "Crítica",
      ensembleSlot: 1,
    })
    expect(prompt.toLowerCase()).toMatch(/crítica|lacunas|riscos/)
    expect(prompt).toContain(SECTOR_SENIORS.engineering.systemPrompt.slice(0, 40))
  })

  it("keeps role-aware prompt in HF mode", () => {
    const prompt = buildAgentSystemPrompt({
      provider: "huggingface",
      sectorId: "design",
      sectorName: "Design",
      agentName: "Designer",
      agentRole: "Designer",
    })
    expect(prompt).toContain("Designer")
    expect(prompt).toContain("Agent Office")
  })
})
