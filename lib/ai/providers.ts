export type AIProvider =
  | "mock"
  | "huggingface"
  | "openai"
  | "anthropic"
  | "groq"
  | "openrouter"

export type ApiKeys = Partial<Record<Exclude<AIProvider, "mock">, string>>

export type ProviderMeta = {
  id: AIProvider
  label: string
  short: string
  needsKey: boolean
  placeholder?: string
  hint: string
  docsUrl?: string
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "mock",
    label: "Simulação",
    short: "Demo",
    needsKey: false,
    hint: "Respostas fictícias — bom para testar a UI sem gastar créditos.",
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    short: "HF",
    needsKey: true,
    placeholder: "hf_…",
    hint: "Token em huggingface.co → Settings → Access Tokens.",
    docsUrl: "https://huggingface.co/settings/tokens",
  },
  {
    id: "openai",
    label: "OpenAI",
    short: "GPT",
    needsKey: true,
    placeholder: "sk-…",
    hint: "Chave em platform.openai.com → API keys.",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    short: "Claude",
    needsKey: true,
    placeholder: "sk-ant-…",
    hint: "Chave em console.anthropic.com → API keys.",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "groq",
    label: "Groq",
    short: "Groq",
    needsKey: true,
    placeholder: "gsk_…",
    hint: "Chave em console.groq.com → API keys (rápido e barato).",
    docsUrl: "https://console.groq.com/keys",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    short: "OR",
    needsKey: true,
    placeholder: "sk-or-…",
    hint: "Um token; catálogo padrão usa modelos free (max_price=0). openrouter.ai/models?max_price=0",
    docsUrl: "https://openrouter.ai/keys",
  },
]

export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  mock: ["simulation/local"],
  huggingface: [
    "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    "meta-llama/Llama-3.1-8B-Instruct",
    "deepseek-ai/DeepSeek-V3.2",
    "openai/gpt-oss-120b",
    "black-forest-labs/FLUX.1-dev",
    "black-forest-labs/FLUX.1-schnell",
  ],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-3-5-haiku-latest",
    "claude-opus-4-20250514",
  ],
  groq: [
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-120b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
  ],
  openrouter: [
    "poolside/laguna-s-2.1:free",
    "poolside/laguna-xs-2.1:free",
    "stealth/ox-alpha",
    "cohere/north-mini-code:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "thinkingmachines/inkling:free",
    "thinkingmachines/inkling-small:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3.5-lightning:free",
    "z-ai/glm-5.2:free",
    "liquid/lfm-2.5-2.6b:free",
    "dots-studio/dots-3-note-preview:free",
    "openrouter/free",
  ],
}

export function getProviderMeta(id: AIProvider): ProviderMeta {
  return PROVIDERS.find(p => p.id === id) || PROVIDERS[0]
}

export function isLiveProvider(id: AIProvider): boolean {
  return id !== "mock"
}

export function modelsForProvider(provider: AIProvider): string[] {
  return PROVIDER_MODELS[provider] || PROVIDER_MODELS.mock
}

export function activeApiKey(provider: AIProvider, keys: ApiKeys, legacyHfToken?: string): string {
  if (provider === "mock") return ""
  if (provider === "huggingface") {
    return keys.huggingface || legacyHfToken || ""
  }
  return keys[provider] || ""
}

export function providerNeedsKey(provider: AIProvider, keys: ApiKeys, legacyHfToken?: string): boolean {
  const meta = getProviderMeta(provider)
  if (!meta.needsKey) return false
  return !activeApiKey(provider, keys, legacyHfToken)
}
