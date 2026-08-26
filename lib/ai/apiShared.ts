import { AIProvider } from "@/lib/ai/providers"
import {
  detectMediaModality,
  type MediaModality,
} from "@/lib/ai/mediaModality"

export const MOCK_RESPONSES = [
  "Análise concluída! Identifiquei 3 pontos de otimização no código. Sugiro refatorar o módulo de autenticação para usar JWT tokens com refresh rotation.",
  "Plano de testes elaborado: 1) Testes unitários para validação de input, 2) Testes de integração para o fluxo completo, 3) Testes de carga com 1000 req/s.",
  "Dashboard criado com 4 visualizações principais: métricas de conversão, funil de usuários, heatmap de cliques e tendência de churn.",
  "Research completo! Analisei 12 fontes e concluí que a arquitetura de microserviços é a melhor escolha para o scale planejado.",
  "Design system atualizado: novos tokens de cor, componentes de formulário refatorados e documentação no Storybook.",
  "Pipeline CI/CD configurado com GitHub Actions: build, test, lint e deploy automático para staging. Tempo médio: 4min 30s.",
  "Relatório de performance: identifiquei gargalo na query principal. Índice composto reduziu tempo de 2.3s para 120ms.",
  "Campanha de growth estruturada: A/B test para landing page, sequence de email marketing e tracking de conversão via Mixpanel.",
]

export function resolveProvider(raw: unknown): AIProvider {
  const p = String(raw || "mock")
  const allowed: AIProvider[] = [
    "mock", "huggingface", "openai", "anthropic", "groq", "openrouter", "nvidia", "google",
  ]
  return (allowed.includes(p as AIProvider) ? p : "mock") as AIProvider
}

export function imagePromptFrom(prompt: string): string {
  const cleaned = prompt
    .replace(/\[Bastão[^\]]*\]/gi, "")
    .replace(/Missão principal:\s*/i, "")
    .replace(/Contexto recebido da etapa anterior:[\s\S]*?(?=Tarefa desta etapa|$)/i, "")
    .replace(/Tarefa desta etapa[^\n]*:\s*/i, "")
    .replace(/Responda de forma objetiva[^\n]*/i, "")
    .trim()
  return cleaned.slice(0, 800) || prompt.slice(0, 800)
}

export function resolveMediaFromBody(body: Record<string, unknown>, prompt: string): MediaModality {
  const raw = body.mediaModality
  const allowed: MediaModality[] = ["text", "image", "video", "audio"]
  if (typeof raw === "string" && allowed.includes(raw as MediaModality)) {
    return raw as MediaModality
  }
  return detectMediaModality(prompt)
}
