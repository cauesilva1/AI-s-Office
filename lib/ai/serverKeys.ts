import { AIProvider } from "@/lib/ai/providers"

const ENV_KEYS: Record<Exclude<AIProvider, "mock">, string[]> = {
  huggingface: ["HF_TOKEN", "HUGGINGFACE_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  anthropic: ["ANTHROPIC_API_KEY"],
  groq: ["GROQ_API_KEY"],
  openrouter: ["OPENROUTER_API_KEY"],
  nvidia: ["NVIDIA_API_KEY"],
  google: ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
}

function readEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return ""
}

/** Se false, a API ignora keys vindas do browser (produção multi-user). Default: true. */
export function allowClientKeys(): boolean {
  const raw = process.env.ALLOW_CLIENT_KEYS
  if (raw === undefined || raw === "") return true
  return !["0", "false", "no"].includes(raw.toLowerCase())
}

export function serverKeyFor(provider: AIProvider): string {
  if (provider === "mock") return ""
  return readEnv(ENV_KEYS[provider])
}

export function providersWithServerKeys(): Exclude<AIProvider, "mock">[] {
  return (Object.keys(ENV_KEYS) as Exclude<AIProvider, "mock">[]).filter(p => Boolean(serverKeyFor(p)))
}

/**
 * Resolve a key efetiva:
 * 1) env do servidor (preferido)
 * 2) key do cliente (se ALLOW_CLIENT_KEYS)
 */
export function resolveApiKey(provider: AIProvider, clientKey?: string): {
  apiKey: string
  source: "server" | "client" | "none"
} {
  const server = serverKeyFor(provider)
  if (server) return { apiKey: server, source: "server" }

  if (allowClientKeys() && clientKey?.trim()) {
    return { apiKey: clientKey.trim(), source: "client" }
  }

  return { apiKey: "", source: "none" }
}
