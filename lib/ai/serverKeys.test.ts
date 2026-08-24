import { describe, expect, it } from "vitest"
import { resolveApiKey, allowClientKeys } from "@/lib/ai/serverKeys"

describe("serverKeys", () => {
  it("usa client key quando não há env", () => {
    const prev = process.env.ALLOW_CLIENT_KEYS
    const hf = process.env.HF_TOKEN
    delete process.env.HF_TOKEN
    delete process.env.HUGGINGFACE_API_KEY
    process.env.ALLOW_CLIENT_KEYS = "true"

    const resolved = resolveApiKey("huggingface", "hf_test_key")
    expect(resolved.source).toBe("client")
    expect(resolved.apiKey).toBe("hf_test_key")

    process.env.ALLOW_CLIENT_KEYS = prev
    if (hf !== undefined) process.env.HF_TOKEN = hf
  })

  it("respeita ALLOW_CLIENT_KEYS=false", () => {
    const prev = process.env.ALLOW_CLIENT_KEYS
    const hf = process.env.HF_TOKEN
    delete process.env.HF_TOKEN
    delete process.env.HUGGINGFACE_API_KEY
    process.env.ALLOW_CLIENT_KEYS = "false"

    expect(allowClientKeys()).toBe(false)
    const resolved = resolveApiKey("huggingface", "hf_test_key")
    expect(resolved.source).toBe("none")
    expect(resolved.apiKey).toBe("")

    process.env.ALLOW_CLIENT_KEYS = prev
    if (hf !== undefined) process.env.HF_TOKEN = hf
  })
})
