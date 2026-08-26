import { AIProvider } from "@/lib/ai/providers"

type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

type ChatParams = {
  provider: AIProvider
  apiKey: string
  model: string
  messages: ChatMessage[]
  maxTokens?: number
}

function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim() || "(sem resposta)"
}

async function openAICompatible(
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  extraHeaders?: Record<string, string>
): Promise<{ text?: string; error?: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  })

  if (!response.ok) {
    const err = await response.text()
    let friendly = `Erro do modelo ${model}`
    if (response.status === 401) friendly = "API key inválida ou expirada. Verifique em Config."
    else if (response.status === 402) friendly = "Créditos/ quota esgotados neste provedor."
    else if (response.status === 404) friendly = `Modelo ${model} não disponível neste provedor. Troque o modelo do agente.`
    else if (response.status === 429) friendly = "Limite de requisições atingido. Aguarde e tente de novo."
    else friendly = `Erro (${response.status}): ${err.slice(0, 220)}`
    return { error: friendly }
  }

  const data = await response.json()
  const text = stripThink(String(data?.choices?.[0]?.message?.content || "(sem resposta)"))
  return { text }
}

async function anthropicChat(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number
): Promise<{ text?: string; error?: string }> {
  const system = messages.filter(m => m.role === "system").map(m => m.content).join("\n")
  const converted = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "assistant" as const : "user" as const,
      content: m.content,
    }))

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: system || undefined,
      messages: converted,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    if (response.status === 401) return { error: "API key Anthropic inválida. Verifique em Config." }
    if (response.status === 429) return { error: "Limite Anthropic atingido. Aguarde e tente de novo." }
    return { error: `Erro Anthropic (${response.status}): ${err.slice(0, 220)}` }
  }

  const data = await response.json()
  const text = Array.isArray(data?.content)
    ? data.content.filter((b: { type?: string }) => b.type === "text").map((b: { text?: string }) => b.text).join("\n")
    : ""
  return { text: stripThink(text || "(sem resposta)") }
}

export async function runChatCompletion(params: ChatParams): Promise<{ text?: string; error?: string }> {
  const { provider, apiKey, model, messages, maxTokens = 1000 } = params

  switch (provider) {
    case "huggingface":
      return openAICompatible(
        "https://router.huggingface.co/v1/chat/completions",
        apiKey,
        model,
        messages,
        maxTokens
      )
    case "openai":
      return openAICompatible(
        "https://api.openai.com/v1/chat/completions",
        apiKey,
        model,
        messages,
        maxTokens
      )
    case "groq":
      return openAICompatible(
        "https://api.groq.com/openai/v1/chat/completions",
        apiKey,
        model,
        messages,
        maxTokens
      )
    case "openrouter":
      return openAICompatible(
        "https://openrouter.ai/api/v1/chat/completions",
        apiKey,
        model,
        messages,
        maxTokens,
        {
          "HTTP-Referer": "https://agent-office.local",
          "X-Title": "Agent Office",
        }
      )
    case "nvidia":
      return openAICompatible(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        apiKey,
        model,
        messages,
        maxTokens
      )
    case "google":
      return googleGeminiChat(apiKey, model, messages, maxTokens)
    case "anthropic":
      return anthropicChat(apiKey, model, messages, maxTokens)
    default:
      return { error: "Provedor não suportado" }
  }
}

/** Gemini generateContent — OpenAI-compatible wrapper via REST */
async function googleGeminiChat(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number
): Promise<{ text?: string; error?: string }> {
  const system = messages.filter(m => m.role === "system").map(m => m.content).join("\n")
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    if (response.status === 401 || response.status === 403) {
      return { error: "API key Google inválida. Verifique em Config." }
    }
    if (response.status === 429) return { error: "Limite Google atingido. Aguarde e tente de novo." }
    return { error: `Erro Google (${response.status}): ${err.slice(0, 220)}` }
  }

  const data = await response.json()
  const text = String(
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ||
      "(sem resposta)",
  )
  return { text: stripThink(text) }
}
