import { describe, expect, it } from "vitest"
import { isModelValidForProvider, remapAgentsForProvider } from "@/lib/ai/remapModels"
import { Agent } from "@/lib/game/types"

function agent(partial: Partial<Agent> & Pick<Agent, "id" | "sectorId" | "model">): Agent {
  return {
    name: partial.name || partial.id,
    role: "x",
    color: "#fff",
    log: [],
    chatHistory: [],
    spriteState: "idle",
    position: { x: 0, y: 0 },
    ...partial,
  }
}

describe("remapModels", () => {
  it("aceita modelos gpt no openai", () => {
    expect(isModelValidForProvider("gpt-4o-mini", "openai")).toBe(true)
    expect(isModelValidForProvider("black-forest-labs/FLUX.1-dev", "openai")).toBe(false)
  })

  it("remapeia agentes HF ao trocar para openai", () => {
    const agents = [
      agent({ id: "1", sectorId: "engineering", model: "Qwen/Qwen3-Coder-480B-A35B-Instruct" }),
      agent({ id: "2", sectorId: "design", model: "black-forest-labs/FLUX.1-dev" }),
    ]
    const { agents: next, changed } = remapAgentsForProvider(agents, "openai")
    expect(changed).toBe(2)
    expect(next.every(a => isModelValidForProvider(a.model, "openai"))).toBe(true)
  })

  it("não remapeia se já válido", () => {
    const agents = [
      agent({ id: "1", sectorId: "engineering", model: "gpt-4o-mini" }),
    ]
    const { changed } = remapAgentsForProvider(agents, "openai")
    expect(changed).toBe(0)
  })

  it("rejeita modelos OpenRouter no HF", () => {
    expect(isModelValidForProvider("bytedance-seed/seedream-5-0-lite", "huggingface")).toBe(false)
    expect(isModelValidForProvider("black-forest-labs/FLUX.1-schnell", "huggingface")).toBe(true)
  })

  it("aceita modelos NVIDIA NIM", () => {
    expect(isModelValidForProvider("meta/llama-3.3-70b-instruct", "nvidia")).toBe(true)
    expect(isModelValidForProvider("gpt-4o-mini", "nvidia")).toBe(false)
  })

  it("aceita modelos Gemini", () => {
    expect(isModelValidForProvider("gemini-2.0-flash", "google")).toBe(true)
  })

  it("remapeia seedream ao voltar para HF", () => {
    const agents = [
      agent({ id: "1", sectorId: "design", model: "bytedance-seed/seedream-5-0-lite" }),
    ]
    const { agents: next, changed } = remapAgentsForProvider(agents, "huggingface")
    expect(changed).toBe(1)
    expect(next[0].model).toContain("FLUX")
  })
})
