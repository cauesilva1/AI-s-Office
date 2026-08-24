import { NextRequest, NextResponse } from "next/server"
import { isImageModel } from "@/lib/game/constants"
import { AIProvider } from "@/lib/ai/providers"
import { runChatCompletion } from "@/lib/ai/chatClient"
import { resolveApiKey, serverKeyFor } from "@/lib/ai/serverKeys"
import { buildAgentSystemPrompt } from "@/lib/ai/officeMode"

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

function safeParseRouterPayload(raw: string): { sectorId: string; confidence: number; reason: string } | null {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim()
    const firstBrace = cleaned.indexOf("{")
    const lastBrace = cleaned.lastIndexOf("}")
    const jsonSlice = firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned
    const parsed = JSON.parse(jsonSlice)
    return {
      sectorId: String(parsed?.sectorId || "research"),
      confidence: Math.max(0, Math.min(1, Number(parsed?.confidence || 0.6))),
      reason: String(parsed?.reason || "Classificação por IA."),
    }
  } catch {
    return null
  }
}

function mockDesignImage(prompt: string): string {
  const safe = prompt.replace(/[<>&']/g, " ").slice(0, 72)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1a1230"/>
        <stop offset="1" stop-color="#0b1220"/>
      </linearGradient>
    </defs>
    <rect fill="url(#g)" width="100%" height="100%"/>
    <text x="50%" y="42%" fill="#a78bfa" text-anchor="middle" font-family="Inter,sans-serif" font-size="22" font-weight="700">FLUX · simulação</text>
    <text x="50%" y="58%" fill="#e6f4ff" text-anchor="middle" font-family="Inter,sans-serif" font-size="13">${safe}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
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

async function generateImage(model: string, prompt: string, hfToken: string): Promise<{ imageUrl?: string; error?: string }> {
  const endpoints = [
    `https://router.huggingface.co/hf-inference/models/${model}`,
    `https://router.huggingface.co/fal-ai/${model}`,
    `https://router.huggingface.co/replicate/${model}`,
    `https://router.huggingface.co/together/${model}`,
  ]
  let lastErr = ""

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { num_inference_steps: 28 },
        }),
      })

      if (!response.ok) {
        lastErr = await response.text()
        continue
      }

      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        const data = await response.json()
        const remoteUrl = data.url || data.image_url || data.images?.[0]?.url
        if (typeof remoteUrl === "string") return { imageUrl: remoteUrl }
        lastErr = JSON.stringify(data).slice(0, 220)
        continue
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length < 32) {
        lastErr = "Resposta de imagem vazia"
        continue
      }
      const mime = contentType.includes("jpeg") ? "image/jpeg" : contentType.includes("webp") ? "image/webp" : "image/png"
      return { imageUrl: `data:${mime};base64,${buffer.toString("base64")}` }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : "Falha no provedor de imagem"
    }
  }

  return { error: lastErr || "Nenhum provedor gerou a imagem. Tente FLUX.1-schnell ou verifique o token HF." }
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
        ? sectors.map((s: { id: string; name: string }) => `${s.id}: ${s.name}`).join(", ")
        : "engineering, design, research, data, devops, growth"
      const routerPrompt = [
        "Você é um roteador de tarefas para um escritório de IAs.",
        `Setores válidos: ${sectorList}.`,
        "Retorne apenas JSON válido no formato:",
        '{"sectorId":"engineering","confidence":0.8,"reason":"..."}',
        "Escolha o setor principal para iniciar o trabalho.",
        `Tarefa do usuário: ${prompt}`,
      ].join("\n")

      const routerModel =
        provider === "huggingface" ? (model || "meta-llama/Llama-3.1-8B-Instruct")
        : provider === "openai" ? "gpt-4o-mini"
        : provider === "anthropic" ? "claude-3-5-haiku-latest"
        : provider === "groq" ? "llama-3.3-70b-versatile"
        : provider === "openrouter" ? "poolside/laguna-s-2.1:free"
        : "meta-llama/Llama-3.1-8B-Instruct"

      const result = await runChatCompletion({
        provider,
        apiKey,
        model: routerModel,
        messages: [{ role: "user", content: routerPrompt }],
        maxTokens: 220,
      })

      if (result.error || !result.text) {
        return NextResponse.json({
          sectorId: "research",
          confidence: 0.5,
          reason: "Falha no roteador IA; fallback para Pesquisa.",
        })
      }

      const parsed = safeParseRouterPayload(result.text)
      if (!parsed) {
        return NextResponse.json({
          sectorId: "research",
          confidence: 0.5,
          reason: "Resposta inválida do roteador IA; fallback para Pesquisa.",
        })
      }
      return NextResponse.json(parsed)
    }

    const wantsImage = isImageModel(String(model || ""))

    if (wantsImage) {
      const visualPrompt = imagePromptFrom(String(prompt || ""))
      // Imagem: sempre tenta HF (server env ou client)
      const hfResolved = resolveApiKey("huggingface", clientKey)
      const hfKey = hfResolved.apiKey || serverKeyFor("huggingface")

      if (!hfKey) {
        return NextResponse.json({
          text: `Imagem (FLUX) precisa de Hugging Face. Provedor atual: ${provider}. Conceito: ${visualPrompt.slice(0, 120)}`,
          imageUrl: mockDesignImage(visualPrompt),
        })
      }

      const generated = await generateImage(String(model), visualPrompt, hfKey)
      if (generated.error || !generated.imageUrl) {
        return NextResponse.json({ error: generated.error || "Falha ao gerar imagem." }, { status: 200 })
      }
      return NextResponse.json({
        text: `Imagem gerada com ${model}. Prompt usado: ${visualPrompt.slice(0, 200)}`,
        imageUrl: generated.imageUrl,
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
