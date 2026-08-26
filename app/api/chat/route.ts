import { NextRequest, NextResponse } from "next/server"
import { isImageModel } from "@/lib/game/constants"
import { AIProvider } from "@/lib/ai/providers"
import { runChatCompletion } from "@/lib/ai/chatClient"
import { resolveApiKey } from "@/lib/ai/serverKeys"
import { buildAgentSystemPrompt } from "@/lib/ai/officeMode"
import {
  buildRouterPrompt,
  parseRouterResponse,
  routerModelForProvider,
} from "@/lib/ai/routerConfig"
import {
  detectMediaModality,
  isMediaModality,
  type MediaModality,
} from "@/lib/ai/mediaModality"
import { generateMedia, resolveMediaModel } from "@/lib/ai/mediaGenerate"

const MOCK_RESPONSES = [
  "Análise concluída! Identifiquei 3 pontos de otimização no código. Sugiro refatorar o módulo de autenticação para usar JWT tokens com refresh rotation.",
  "Plano de testes elaborado: 1) Testes unitários para validação de input, 2) Testes de integração para o fluxo completo, 3) Testes de carga com 1000 req/s.",
  "Dashboard criado com 4 visualizações principais: métricas de conversão, funil de usuários, heatmap de cliques e tendência de churn.",
  "Research completo! Analisei 12 fontes e concluí que a arquitetura de microserviços é a melhor escolha para o scale planejado.",
  "Design system atualizado: novos tokens de cor, componentes de formulário refatorados e documentação no Storybook.",
  "Pipeline CI/CD configurado com GitHub Actions: build, test, lint e deploy automático para staging. Tempo médio: 4min 30s.",
  "Relatório de performance: identifiquei gargalo na query principal. Índice composto reduziu tempo de 2.3s para 120ms.",
  "Campanha de growth estruturada: A/B test para landing page, sequence de email marketing e tracking de conversão via Mixpanel.",
]

interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

function safeParseRouterPayload(raw: string) {
  return parseRouterResponse(raw)
}

function imagePromptFrom(prompt: string): string {
  const cleaned = prompt
    .replace(/\[Bastão[^\]]*\]/gi, "")
    .replace(/Missão principal:\s*/i, "")
    .replace(/Contexto recebido da etapa anterior:[\s\S]*?(?=Tarefa desta etapa|$)/i, "")
    .replace(/Tarefa desta etapa[^\n]*:\s*/i, "")
    .replace(/Responda de forma objetiva[^\n]*/i, "")
    .trim()
  return cleaned.slice(0, 800) || prompt.slice(0, 800)
}

function resolveMediaFromBody(body: Record<string, unknown>, prompt: string): MediaModality {
  const raw = body.mediaModality
  const allowed: MediaModality[] = ["text", "image", "video", "audio"]
  if (typeof raw === "string" && allowed.includes(raw as MediaModality)) {
    return raw as MediaModality
  }
  return detectMediaModality(prompt)
}

function resolveProvider(raw: unknown): AIProvider {
  const p = String(raw || "mock")
  const allowed: AIProvider[] = ["mock", "huggingface", "openai", "anthropic", "groq", "openrouter"]
  return (allowed.includes(p as AIProvider) ? p : "mock") as AIProvider
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      agentName, agentRole, sectorName, sectorId, prompt, history, model, taskType, sectors,
      ensembleSlot,
    } = body
    const provider = resolveProvider(body.provider)
    const clientKey = String(body.apiKey || body.hfToken || "")
    const resolved = resolveApiKey(provider, clientKey)
    const apiKey = resolved.apiKey

    if (taskType === "router") {
      if (provider === "mock" || !apiKey) {
        return NextResponse.json({
          sectorId: "research",
          confidence: 0.45,
          reason: "Sem provedor/token para roteamento por IA.",
        })
      }

      const sectorList = Array.isArray(sectors)
        ? sectors as Array<{ id: string; name: string }>
        : [
            { id: "engineering", name: "Engenharia" },
            { id: "design", name: "Design" },
            { id: "research", name: "Pesquisa" },
            { id: "data", name: "Dados" },
            { id: "devops", name: "DevOps" },
            { id: "growth", name: "Growth" },
          ]
      const routerPrompt = buildRouterPrompt(String(prompt || ""), sectorList)

      const routerModel = model || routerModelForProvider(provider)

      const result = await runChatCompletion({
        provider,
        apiKey,
        model: routerModel,
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

      const parsed = safeParseRouterPayload(result.text)
      if (!parsed) {
        return NextResponse.json({
          sectorId: "research",
          pipeline: ["research", "engineering"],
          confidence: 0.5,
          reason: "Resposta inválida do roteador IA; fallback para Pesquisa.",
        })
      }
      return NextResponse.json(parsed)
    }

    const promptText = String(prompt || "")
    const explicitModality = resolveMediaFromBody(body, promptText)
    const hasExplicitMedia = typeof body.mediaModality === "string"
    const legacyImageModel = isImageModel(String(model || ""))
    const isDesignSector = sectorId === "design"
    const detectedModality = isDesignSector || hasExplicitMedia || legacyImageModel
      ? explicitModality
      : "text"
    const effectiveModality: MediaModality =
      legacyImageModel && detectedModality === "text" ? "image" : detectedModality

    if (isMediaModality(effectiveModality) || legacyImageModel) {
      if (provider === "mock" || !apiKey) {
        return NextResponse.json({
          text: `[simulação] Pedido de ${effectiveModality} — configure a API key do provedor ativo.`,
        })
      }

      const mediaPrompt = imagePromptFrom(promptText)
      const systemPrompt = buildAgentSystemPrompt({
        provider,
        sectorId: typeof sectorId === "string" ? sectorId : undefined,
        sectorName: typeof sectorName === "string" ? sectorName : undefined,
        agentName: String(agentName || "Agente"),
        agentRole: String(agentRole || "Assistente"),
        ensembleSlot: typeof ensembleSlot === "number" ? ensembleSlot : undefined,
      })

      const mediaModel = await resolveMediaModel(
        provider,
        effectiveModality,
        typeof model === "string" ? model : undefined,
      )

      const generated = await generateMedia({
        provider,
        apiKey,
        modality: effectiveModality,
        prompt: mediaPrompt,
        systemPrompt,
        model: mediaModel || undefined,
      })

      if (generated.error) {
        console.error("[media]", provider, effectiveModality, mediaModel, generated.error)
      }

      if (generated.error && !generated.imageUrl && !generated.videoUrl && !generated.text) {
        return NextResponse.json({ error: generated.error }, { status: 200 })
      }

      return NextResponse.json({
        text: generated.text || `Entrega ${effectiveModality} via ${provider}.`,
        imageUrl: generated.imageUrl,
        videoUrl: generated.videoUrl,
        audioUrl: generated.audioUrl,
        model: generated.model,
      })
    }

    if (provider !== "mock" && apiKey) {
      const systemPrompt = buildAgentSystemPrompt({
        provider,
        sectorId: typeof sectorId === "string" ? sectorId : undefined,
        sectorName: typeof sectorName === "string" ? sectorName : undefined,
        agentName: String(agentName || "Agente"),
        agentRole: String(agentRole || "Assistente"),
        ensembleSlot: typeof ensembleSlot === "number" ? ensembleSlot : undefined,
      })

      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...(Array.isArray(history) ? history.slice(-12).map((m: ChatMessage) => ({ role: m.role, content: m.content })) : []),
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
        return NextResponse.json({ error: result.error }, { status: 200 })
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
