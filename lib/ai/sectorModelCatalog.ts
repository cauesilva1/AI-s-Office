import { AIProvider } from "@/lib/ai/providers"

export type ModelPickRole = "qualidade" | "velocidade" | "estilo" | "raciocinio" | "codigo" | "geral"

export type CuratedModel = {
  id: string
  /** Nome curto para UI */
  label: string
  role: ModelPickRole
  /** Por que está na lista (não é ranking automático) */
  why: string
}

const ROLE_LABEL: Record<ModelPickRole, string> = {
  qualidade: "Qualidade",
  velocidade: "Velocidade",
  estilo: "Estilo",
  raciocinio: "Raciocínio",
  codigo: "Código",
  geral: "Geral",
}

export function roleLabel(role: ModelPickRole): string {
  return ROLE_LABEL[role]
}

/**
 * Catálogo curado por setor — escolha humana, não trending aleatório.
 * Slot 0 = default do setor (melhor equilíbrio para o caso principal).
 */
export const HF_SECTOR_CATALOG: Record<string, CuratedModel[]> = {
  engineering: [
    {
      id: "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      label: "Qwen3 Coder 480B",
      role: "codigo",
      why: "Melhor equilíbrio código + contexto no Inference Providers",
    },
    {
      id: "moonshotai/Kimi-K2.7-Code",
      label: "Kimi Code",
      role: "codigo",
      why: "Forte em refatoração e multi-arquivo",
    },
    {
      id: "Qwen/Qwen3-Coder-30B-A3B-Instruct",
      label: "Qwen Coder 30B",
      role: "velocidade",
      why: "Respostas mais rápidas / custo menor",
    },
  ],
  design: [
    {
      id: "black-forest-labs/FLUX.1-dev",
      label: "FLUX.1 Dev",
      role: "qualidade",
      why: "Melhor fidelidade ao prompt (mais lento)",
    },
    {
      id: "black-forest-labs/FLUX.1-schnell",
      label: "FLUX Schnell",
      role: "velocidade",
      why: "Rascunhos rápidos, bom para iterar",
    },
    {
      id: "black-forest-labs/FLUX.1-Krea-dev",
      label: "FLUX Krea",
      role: "estilo",
      why: "Look artístico / direção de arte",
    },
  ],
  research: [
    {
      id: "deepseek-ai/DeepSeek-V4-Flash",
      label: "DeepSeek V4 Flash",
      role: "raciocinio",
      why: "Análise rápida com bom raciocínio",
    },
    {
      id: "deepseek-ai/DeepSeek-R1",
      label: "DeepSeek R1",
      role: "raciocinio",
      why: "Pensamento longo / comparação de opções",
    },
    {
      id: "Qwen/Qwen3-235B-A22B-Thinking-2507",
      label: "Qwen3 Thinking",
      role: "raciocinio",
      why: "Exploração profunda de trade-offs",
    },
  ],
  data: [
    {
      id: "openai/gpt-oss-120b",
      label: "GPT-OSS 120B",
      role: "geral",
      why: "SQL, métricas e explicações claras",
    },
    {
      id: "Qwen/Qwen3.5-27B",
      label: "Qwen 3.5 27B",
      role: "velocidade",
      why: "Consultas rápidas e dashboards",
    },
    {
      id: "deepseek-ai/DeepSeek-V3.2",
      label: "DeepSeek V3.2",
      role: "raciocinio",
      why: "Análise numérica e pipelines",
    },
  ],
  devops: [
    {
      id: "zai-org/GLM-5.2",
      label: "GLM 5.2",
      role: "geral",
      why: "Infra, Docker e CI com bom senso prático",
    },
    {
      id: "moonshotai/Kimi-K2.6",
      label: "Kimi K2.6",
      role: "codigo",
      why: "Scripts e automação",
    },
    {
      id: "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      label: "Qwen3 Coder",
      role: "codigo",
      why: "Yaml/CI complexos",
    },
  ],
  growth: [
    {
      id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      label: "Llama 4 Maverick",
      role: "geral",
      why: "Copy e campanhas com contexto longo",
    },
    {
      id: "MiniMaxAI/MiniMax-M3",
      label: "MiniMax M3",
      role: "estilo",
      why: "Tom criativo / variações de mensagem",
    },
    {
      id: "meta-llama/Llama-3.3-70B-Instruct",
      label: "Llama 3.3 70B",
      role: "qualidade",
      why: "Textos polidos e consistentes",
    },
  ],
}

/** OpenRouter free — slots com papel explícito (não “primeiro do trending”) */
export const OR_SECTOR_CATALOG: Record<string, CuratedModel[]> = {
  engineering: [
    {
      id: "poolside/laguna-s-2.1:free",
      label: "Laguna S",
      role: "codigo",
      why: "Free forte em código",
    },
    {
      id: "stealth/ox-alpha",
      label: "Ox Alpha",
      role: "geral",
      why: "Segundo ângulo no ensemble",
    },
    {
      id: "cohere/north-mini-code:free",
      label: "North Mini Code",
      role: "velocidade",
      why: "Resposta rápida no trio",
    },
  ],
  design: [
    {
      id: "google/gemma-4-31b-it:free",
      label: "Gemma 4 31B",
      role: "geral",
      why: "Brief / UX em texto (free)",
    },
    {
      id: "bytedance-seed/seedream-5-0-lite",
      label: "Seedream 5 Lite",
      role: "qualidade",
      why: "Imagem no catálogo OR (pode exigir créditos)",
    },
    {
      id: "alibaba/wan-3.0",
      label: "Wan 3.0",
      role: "estilo",
      why: "Vídeo no catálogo OR",
    },
  ],
  research: [
    {
      id: "nvidia/nemotron-3-ultra-550b-a55b:free",
      label: "Nemotron Ultra",
      role: "raciocinio",
      why: "Roteador + pesquisa (free)",
    },
    {
      id: "z-ai/glm-5.2:free",
      label: "GLM 5.2 Free",
      role: "geral",
      why: "Síntese e comparação",
    },
    {
      id: "nvidia/nemotron-3-super-120b-a12b:free",
      label: "Nemotron Super",
      role: "velocidade",
      why: "Ângulo rápido no ensemble",
    },
  ],
  data: [
    {
      id: "z-ai/glm-5.2:free",
      label: "GLM 5.2 Free",
      role: "geral",
      why: "Métricas e SQL em free tier",
    },
    {
      id: "nvidia/nemotron-3-super-120b-a12b:free",
      label: "Nemotron Super",
      role: "raciocinio",
      why: "Análise de dados",
    },
    {
      id: "liquid/lfm-2.5-2.6b:free",
      label: "LFM 2.5",
      role: "velocidade",
      why: "Respostas curtas e baratas",
    },
  ],
  devops: [
    {
      id: "poolside/laguna-xs-2.1:free",
      label: "Laguna XS",
      role: "codigo",
      why: "Infra/scripts free",
    },
    {
      id: "cohere/north-mini-code:free",
      label: "North Mini Code",
      role: "velocidade",
      why: "CI/CD rápido",
    },
    {
      id: "nvidia/nemotron-3.5-lightning:free",
      label: "Nemotron Lightning",
      role: "geral",
      why: "Terceiro ângulo DevOps",
    },
  ],
  growth: [
    {
      id: "google/gemma-4-26b-a4b-it:free",
      label: "Gemma 4 26B",
      role: "geral",
      why: "Copy e funil (free)",
    },
    {
      id: "thinkingmachines/inkling-small:free",
      label: "Inkling Small",
      role: "estilo",
      why: "Variações criativas",
    },
    {
      id: "dots-studio/dots-3-note-preview:free",
      label: "Dots Note",
      role: "velocidade",
      why: "Rascunhos rápidos de campanha",
    },
  ],
}

export function catalogForProvider(provider: AIProvider, sectorId: string): CuratedModel[] {
  if (provider === "openrouter") return OR_SECTOR_CATALOG[sectorId] || []
  if (provider === "huggingface" || provider === "mock") return HF_SECTOR_CATALOG[sectorId] || []
  return []
}

export function catalogIds(provider: AIProvider, sectorId: string): string[] {
  return catalogForProvider(provider, sectorId).map(m => m.id)
}

export function findCuratedModel(
  provider: AIProvider,
  sectorId: string,
  modelId: string,
): CuratedModel | undefined {
  return catalogForProvider(provider, sectorId).find(m => m.id === modelId)
}
