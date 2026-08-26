import { NextRequest, NextResponse } from "next/server"
import { runChatCompletion } from "@/lib/ai/chatClient"
import { resolveApiKey } from "@/lib/ai/serverKeys"
import { resolveProvider } from "@/lib/ai/apiShared"
import {
  buildRouterPrompt,
  parseRouterResponse,
  routerModelForProvider,
} from "@/lib/ai/routerConfig"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const provider = resolveProvider(body.provider)
    const clientKey = String(body.apiKey || body.hfToken || "")
    const { apiKey } = resolveApiKey(provider, clientKey)
    const prompt = String(body.prompt || "")
    const model = body.model || routerModelForProvider(provider)

    if (provider === "mock" || !apiKey) {
      return NextResponse.json({
        sectorId: "research",
        confidence: 0.45,
        reason: "Sem provedor/token para roteamento por IA.",
      })
    }

    const sectorList = Array.isArray(body.sectors)
      ? (body.sectors as Array<{ id: string; name: string }>)
      : [
          { id: "engineering", name: "Engenharia" },
          { id: "design", name: "Design" },
          { id: "research", name: "Pesquisa" },
          { id: "data", name: "Dados" },
          { id: "devops", name: "DevOps" },
          { id: "growth", name: "Growth" },
        ]

    const routerPrompt = buildRouterPrompt(prompt, sectorList)
    const result = await runChatCompletion({
      provider,
      apiKey,
      model,
      messages: [{ role: "user", content: routerPrompt }],
      maxTokens: 280,
    })

    if (result.error || !result.text) {
      return NextResponse.json({
        sectorId: "research",
        pipeline: ["research", "engineering"],
        confidence: 0.5,
        reason: "Falha no roteador IA; fallback para Pesquisa.",
      })
    }

    const parsed = parseRouterResponse(result.text)
    if (!parsed) {
      return NextResponse.json({
        sectorId: "research",
        pipeline: ["research", "engineering"],
        confidence: 0.5,
        reason: "Resposta inválida do roteador IA; fallback para Pesquisa.",
      })
    }
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
