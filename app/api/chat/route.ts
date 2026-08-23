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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentName, agentRole, sectorName, prompt, history, provider, hfToken, model } = body

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
