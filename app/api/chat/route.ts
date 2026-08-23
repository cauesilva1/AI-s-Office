import { NextRequest, NextResponse } from "next/server"
import { isImageModel } from "@/lib/game/constants"

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
  const safe = prompt.replace(/[<>&]/g, " ").slice(0, 72)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1a1230"/>
        <stop offset="1" stop-color="#0b1220"/>
      </linearGradient>
    </defs>
    <rect fill="url(#g)" width="100%" height="100%"/>
    <text x="50%" y="42%" fill="#a78bfa" text-anchor="middle" font-family="Inter,sans-serif" font-size="22" font-weight="700">FLUX.1-dev · simulação</text>
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

  return { error: lastErr || "Nenhum provedor gerou a imagem. Tente FLUX.1-schnell ou verifique o token." }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentName, agentRole, sectorName, prompt, history, provider, hfToken, model, taskType, sectors } = body

    if (taskType === "router") {
      if (provider !== "huggingface" || !hfToken) {
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

      try {
        const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${hfToken}`,
          },
          body: JSON.stringify({
            model: model || "meta-llama/Llama-3.1-8B-Instruct",
            messages: [{ role: "user", content: routerPrompt }],
            max_tokens: 220,
          }),
        })
        const data = await response.json()
        const raw = String(data?.choices?.[0]?.message?.content || "")
        const parsed = safeParseRouterPayload(raw)
        if (!parsed) {
          return NextResponse.json({
            sectorId: "research",
            confidence: 0.5,
            reason: "Resposta inválida do roteador IA; fallback para Pesquisa.",
          })
        }
        return NextResponse.json({
          sectorId: parsed.sectorId,
          confidence: parsed.confidence,
          reason: parsed.reason,
        })
      } catch {
        return NextResponse.json({
          sectorId: "research",
          confidence: 0.5,
          reason: "Falha no roteador IA; fallback para Pesquisa.",
        })
      }
    }

    const wantsImage = isImageModel(String(model || ""))

    if (wantsImage) {
      const visualPrompt = imagePromptFrom(String(prompt || ""))
      if (provider !== "huggingface" || !hfToken) {
        return NextResponse.json({
          text: `[simulação] Conceito visual gerado para: ${visualPrompt.slice(0, 140)}`,
          imageUrl: mockDesignImage(visualPrompt),
        })
      }

      const generated = await generateImage(String(model), visualPrompt, hfToken)
      if (generated.error || !generated.imageUrl) {
        return NextResponse.json({ error: generated.error || "Falha ao gerar imagem." }, { status: 200 })
      }
      return NextResponse.json({
        text: `Imagem gerada com ${model}. Prompt usado: ${visualPrompt.slice(0, 200)}`,
        imageUrl: generated.imageUrl,
      })
    }

    if (provider === "huggingface" && hfToken) {
      const systemPrompt = `Você é ${agentName}, ${agentRole} do setor ${sectorName || "Geral"} no Agent Office — um escritório virtual onde várias IAs trabalham em conjunto. Responda em português do Brasil, de forma profissional e direta. Quando receber um "bastão" (contexto vindo de outro agente), continue o trabalho a partir dele sem repetir o que já foi feito.`

      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        // Mantém as últimas trocas para dar contexto sem estourar o limite de tokens
        ...(Array.isArray(history) ? history.slice(-12).map((m: ChatMessage) => ({ role: m.role, content: m.content })) : []),
        { role: "user", content: prompt },
      ]

      try {
        const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${hfToken}`,
          },
          body: JSON.stringify({
            model: model || "meta-llama/Llama-3.1-8B-Instruct",
            messages,
            max_tokens: 1000,
          }),
        })

        if (!response.ok) {
          const err = await response.text()
          let friendly = `Erro do modelo ${model}`
          if (response.status === 401) friendly = "Token da Hugging Face inválido ou expirado. Verifique em Config."
          else if (response.status === 402) friendly = "Créditos da Hugging Face esgotados para este mês."
          else if (response.status === 404) friendly = `Modelo ${model} não está disponível no router da Hugging Face. Troque o modelo deste agente.`
          else if (response.status === 429) friendly = "Limite de requisições atingido. Aguarde alguns segundos e tente de novo."
          else friendly = `Erro do modelo ${model}: ${err.slice(0, 200)}`
          return NextResponse.json({ error: friendly }, { status: 200 })
        }

        const data = await response.json()
        let text = data.choices?.[0]?.message?.content || "(sem resposta)"
        // Modelos de raciocínio (ex.: DeepSeek R1) devolvem <think>...</think> antes da resposta
        text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim() || "(sem resposta)"
        return NextResponse.json({ text })
      } catch (err) {
        return NextResponse.json({ error: "Falha na conexão com a Hugging Face. Verifique sua internet e o token." }, { status: 200 })
      }
    }

    // Modo simulação (sem token)
    const hash = prompt.split("").reduce((a: number, b: string) => a + b.charCodeAt(0), 0)
    const response = MOCK_RESPONSES[hash % MOCK_RESPONSES.length]
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200))

    return NextResponse.json({ text: `[simulação — configure seu token HF em CONFIG] ${response}` })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
