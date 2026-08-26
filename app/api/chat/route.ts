import { NextRequest, NextResponse } from "next/server"
import { runChatCompletion } from "@/lib/ai/chatClient"
import { resolveApiKey } from "@/lib/ai/serverKeys"
import { buildAgentSystemPrompt } from "@/lib/ai/officeMode"
import { MOCK_RESPONSES, resolveProvider } from "@/lib/ai/apiShared"

interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

/** Texto only — use /api/router e /api/media para classificação e mídia */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      agentName, agentRole, sectorName, sectorId, prompt, history, model, ensembleSlot,
    } = body
    const provider = resolveProvider(body.provider)
    const clientKey = String(body.apiKey || body.hfToken || "")
    const { apiKey } = resolveApiKey(provider, clientKey)

    if (provider !== "mock" && apiKey) {
      const systemPrompt = buildAgentSystemPrompt({
        provider,
        sectorId: typeof sectorId === "string" ? sectorId : undefined,
        sectorName: typeof sectorName === "string" ? sectorName : undefined,
        agentName: String(agentName || "Agente"),
        agentRole: String(agentRole || "Assistente"),
        ensembleSlot: typeof ensembleSlot === "number" ? ensembleSlot : undefined,
        customSystemPrompt:
          typeof body.customSystemPrompt === "string" ? body.customSystemPrompt : undefined,
      })

      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...(Array.isArray(history)
          ? history.slice(-12).map((m: ChatMessage) => ({ role: m.role, content: m.content }))
          : []),
        { role: "user", content: prompt },
      ]

      const result = await runChatCompletion({
        provider,
        apiKey,
        model: model || "gpt-4o-mini",
        messages,
        maxTokens: 1000,
      })

      if (result.error) {
        const { friendlyErrorLine } = await import("@/lib/ai/friendlyErrors")
        return NextResponse.json({ error: friendlyErrorLine(result.error) }, { status: 200 })
      }
      return NextResponse.json({ text: result.text })
    }

    const hash = String(prompt || "").split("").reduce((a: number, b: string) => a + b.charCodeAt(0), 0)
    const response = MOCK_RESPONSES[hash % MOCK_RESPONSES.length]
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200))

    return NextResponse.json({
      text: `[simulação — configure key no browser ou env do servidor] ${response}`,
    })
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
