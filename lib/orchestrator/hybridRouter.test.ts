import { describe, expect, it } from "vitest"
import {
  buildRouterPrompt,
  parseRouterResponse,
  resolveRouterBackend,
  ROUTER_MODEL_OPENROUTER,
} from "@/lib/ai/routerConfig"
import { buildPipeline, type RouteDecision } from "@/lib/orchestrator/hybridRouter"
import { Agent } from "@/lib/game/types"

function stubAgent(id: string, sectorId: string): Agent {
  return {
    id,
    name: id,
    role: "x",
    sectorId,
    color: "#fff",
    model: "m",
    log: [],
    chatHistory: [],
    spriteState: "idle",
    position: { x: 0, y: 0 },
  }
}

describe("resolveRouterBackend", () => {
  it("usa só o provedor ativo", () => {
    const backend = resolveRouterBackend({
      activeProvider: "openrouter",
      apiKey: "or-key",
    })
    expect(backend?.provider).toBe("openrouter")
    expect(backend?.model).toBe(ROUTER_MODEL_OPENROUTER)
  })

  it("usa openai quando ativo", () => {
    const backend = resolveRouterBackend({
      activeProvider: "openai",
      apiKey: "sk-test",
    })
    expect(backend?.provider).toBe("openai")
    expect(backend?.model).toBe("gpt-4o-mini")
  })

  it("retorna null sem key do provedor ativo", () => {
    expect(resolveRouterBackend({ activeProvider: "openrouter" })).toBeNull()
  })
})

describe("parseRouterResponse", () => {
  it("parseia pipeline de imagem para design", () => {
    const parsed = parseRouterResponse(
      '{"sectorId":"design","pipeline":["design"],"confidence":0.95,"reason":"pedido de imagem"}',
    )
    expect(parsed?.sectorId).toBe("design")
    expect(parsed?.pipeline).toEqual(["design"])
  })
})

describe("buildRouterPrompt", () => {
  it("menciona imagem e design", () => {
    const p = buildRouterPrompt("quero uma foto", [{ id: "design", name: "Design" }])
    expect(p.toLowerCase()).toMatch(/imagem|design/)
  })
})

describe("buildPipeline", () => {
  it("usa pipeline retornada pela IA", () => {
    const agents = [stubAgent("a2", "design")]
    const decision: RouteDecision = {
      primarySectorId: "design",
      pipeline: ["design"],
      strategy: "llm",
      confidence: 0.9,
      reason: "imagem",
    }
    const pipeline = buildPipeline(decision, agents)
    expect(pipeline.map(s => s.sectorId)).toEqual(["design"])
  })
})
