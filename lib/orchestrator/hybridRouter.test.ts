import { describe, expect, it } from "vitest"
import { routeByRules, buildPipeline } from "@/lib/orchestrator/hybridRouter"
import { Agent } from "@/lib/game/types"

describe("hybridRouter", () => {
  it("roteia por keywords de engineering", () => {
    const decision = routeByRules("preciso refatorar o codigo typescript da api")
    expect(decision).not.toBeNull()
    expect(decision?.primarySectorId).toBe("engineering")
    expect(decision?.strategy).toBe("rules")
    expect(decision!.confidence).toBeGreaterThanOrEqual(0.65)
  })

  it("roteia design", () => {
    const decision = routeByRules("melhorar o layout e ui do figma")
    expect(decision?.primarySectorId).toBe("design")
  })

  it("retorna null sem keywords", () => {
    expect(routeByRules("olá, tudo bem?")).toBeNull()
  })

  it("buildPipeline monta cadeia a partir do setor primário", () => {
    const agents: Agent[] = [
      {
        id: "a1",
        name: "R",
        role: "x",
        sectorId: "research",
        color: "#fff",
        model: "m",
        log: [],
        chatHistory: [],
        spriteState: "idle",
        position: { x: 0, y: 0 },
      },
      {
        id: "a2",
        name: "E",
        role: "x",
        sectorId: "engineering",
        color: "#fff",
        model: "m",
        log: [],
        chatHistory: [],
        spriteState: "idle",
        position: { x: 0, y: 0 },
      },
      {
        id: "a3",
        name: "D",
        role: "x",
        sectorId: "devops",
        color: "#fff",
        model: "m",
        log: [],
        chatHistory: [],
        spriteState: "idle",
        position: { x: 0, y: 0 },
      },
    ]
    const pipeline = buildPipeline("engineering", agents)
    expect(pipeline.map(s => s.sectorId)).toEqual(["research", "engineering", "devops"])
    expect(pipeline.every(s => s.agentId)).toBe(true)
  })
})
