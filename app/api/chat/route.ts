import { NextRequest, NextResponse } from "next/server"

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
            model: model || "Qwen/Qwen2.5-72B-Instruct",
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
            model: model || "meta-llama/Llama-3.2-3B-Instruct",
            messages,
            max_tokens: 1000,
          }),
        })

        if (!response.ok) {
          const err = await response.text()
          return NextResponse.json({ error: `Erro do modelo ${model}: ${err.slice(0, 300)}` }, { status: 200 })
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
