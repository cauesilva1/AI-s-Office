export const TILE_WIDTH = 64
export const TILE_HEIGHT = 32
export const GRID_COLS = 24
export const GRID_ROWS = 16

export const BASE_SECTORS = [
  { id: "engineering", name: "Engenharia", color: "#2dd4bf" },
  { id: "design", name: "Design", color: "#a78bfa" },
  { id: "research", name: "Pesquisa", color: "#fbbf24" },
  { id: "data", name: "Dados", color: "#60a5fa" },
  { id: "devops", name: "DevOps", color: "#22d3ee" },
  { id: "growth", name: "Growth", color: "#f87171" },
]

export const SECTOR_LAYOUTS = {
  wide: {
    engineering: { x: 2, y: 2, w: 8, h: 6 },
    design: { x: 12, y: 2, w: 8, h: 6 },
    research: { x: 2, y: 9, w: 8, h: 6 },
    data: { x: 12, y: 9, w: 8, h: 6 },
    devops: { x: 2, y: 16, w: 8, h: 6 },
    growth: { x: 12, y: 16, w: 8, h: 6 },
  },
  compact: {
    engineering: { x: 3, y: 3, w: 6, h: 5 },
    design: { x: 10, y: 3, w: 6, h: 5 },
    research: { x: 3, y: 9, w: 6, h: 5 },
    data: { x: 10, y: 9, w: 6, h: 5 },
    devops: { x: 3, y: 15, w: 6, h: 5 },
    growth: { x: 10, y: 15, w: 6, h: 5 },
  },
} as const

// Pelo menos 3 modelos por setor, todos no Inference Providers da Hugging Face (ago/2026)
export const SECTOR_MODELS: Record<string, string[]> = {
  engineering: [
    "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    "moonshotai/Kimi-K2.7-Code",
    "Qwen/Qwen3-Coder-30B-A3B-Instruct",
  ],
  design: [
    "black-forest-labs/FLUX.1-dev",
    "black-forest-labs/FLUX.1-schnell",
    "black-forest-labs/FLUX.1-Krea-dev",
  ],
  research: [
    "deepseek-ai/DeepSeek-V4-Flash",
    "deepseek-ai/DeepSeek-R1",
    "Qwen/Qwen3-235B-A22B-Thinking-2507",
  ],
  data: [
    "openai/gpt-oss-120b",
    "Qwen/Qwen3.5-27B",
    "deepseek-ai/DeepSeek-V3.2",
  ],
  devops: [
    "zai-org/GLM-5.2",
    "moonshotai/Kimi-K2.6",
    "Qwen/Qwen3-Coder-480B-A35B-Instruct",
  ],
  growth: [
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    "MiniMaxAI/MiniMax-M3",
    "meta-llama/Llama-3.3-70B-Instruct",
  ],
}

export const HF_IMAGE_MODELS = [
  ...SECTOR_MODELS.design,
  "Qwen/Qwen-Image",
  "stabilityai/stable-diffusion-3.5-large",
]

export const HF_MODELS = Array.from(new Set(
  Object.entries(SECTOR_MODELS)
    .filter(([sectorId]) => sectorId !== "design")
    .flatMap(([, models]) => models)
    .concat([
      "openai/gpt-oss-20b",
      "meta-llama/Llama-3.1-8B-Instruct",
      "google/gemma-4-26B-A4B-it",
      "microsoft/phi-4",
    ])
))

export function modelsForSector(sectorId: string): string[] {
  return SECTOR_MODELS[sectorId] || HF_MODELS
}

export function isImageModel(model: string): boolean {
  if (HF_IMAGE_MODELS.includes(model)) return true
  const id = model.toLowerCase()
  return id.includes("flux") || id.includes("stable-diffusion") || id.includes("qwen-image") || id.includes("hyper-sd")
}

// Modelo pequeno e rápido dedicado ao roteamento automático de missões
export const ROUTER_MODEL = "meta-llama/Llama-3.1-8B-Instruct"

export const STARTING_AGENTS = [
  { id: "qwen-coder", name: "Qwen3 Coder", role: "Engenheiro Sênior", sectorId: "engineering", color: "#2dd4bf", model: SECTOR_MODELS.engineering[0] },
  { id: "kimi-code", name: "Kimi Code", role: "Engenheiro de Código", sectorId: "engineering", color: "#34d399", model: SECTOR_MODELS.engineering[1] },
  { id: "qwen-coder-fast", name: "Qwen Coder 30B", role: "Engenheiro Júnior", sectorId: "engineering", color: "#5eead4", model: SECTOR_MODELS.engineering[2] },

  { id: "llama", name: "FLUX.1", role: "Designer", sectorId: "design", color: "#a78bfa", model: SECTOR_MODELS.design[0] },
  { id: "flux-schnell", name: "FLUX Schnell", role: "Designer Rápido", sectorId: "design", color: "#c4b5fd", model: SECTOR_MODELS.design[1] },
  { id: "flux-krea", name: "FLUX Krea", role: "Diretor de Arte", sectorId: "design", color: "#f472b6", model: SECTOR_MODELS.design[2] },

  { id: "deepseek", name: "DeepSeek V4", role: "Pesquisador", sectorId: "research", color: "#fbbf24", model: SECTOR_MODELS.research[0] },
  { id: "deepseek-r1", name: "DeepSeek R1", role: "Pesquisador Sênior", sectorId: "research", color: "#f59e0b", model: SECTOR_MODELS.research[1] },
  { id: "qwen-think", name: "Qwen Think", role: "Analista de Pesquisa", sectorId: "research", color: "#e9b65f", model: SECTOR_MODELS.research[2] },

  { id: "qwen", name: "GPT-OSS", role: "Cientista de Dados", sectorId: "data", color: "#60a5fa", model: SECTOR_MODELS.data[0] },
  { id: "qwen-data", name: "Qwen 3.5", role: "Analista de Dados", sectorId: "data", color: "#38bdf8", model: SECTOR_MODELS.data[1] },
  { id: "deepseek-data", name: "DeepSeek V3.2", role: "Engenheiro de Dados", sectorId: "data", color: "#818cf8", model: SECTOR_MODELS.data[2] },

  { id: "mistral", name: "GLM 5.2", role: "Engenheiro DevOps", sectorId: "devops", color: "#22d3ee", model: SECTOR_MODELS.devops[0] },
  { id: "kimi-ops", name: "Kimi K2.6", role: "SRE", sectorId: "devops", color: "#67e8f9", model: SECTOR_MODELS.devops[1] },
  { id: "qwen-ops", name: "Qwen Ops", role: "Engenheiro de Plataforma", sectorId: "devops", color: "#2dd4bf", model: SECTOR_MODELS.devops[2] },

  { id: "phi", name: "Llama 4", role: "Growth Hacker", sectorId: "growth", color: "#f87171", model: SECTOR_MODELS.growth[0] },
  { id: "minimax-growth", name: "MiniMax M3", role: "Copywriter", sectorId: "growth", color: "#fb7185", model: SECTOR_MODELS.growth[1] },
  { id: "llama-growth", name: "Llama 3.3", role: "Estrategista", sectorId: "growth", color: "#f472b6", model: SECTOR_MODELS.growth[2] },
]

export const AGENT_COLORS = [
  "#2dd4bf", "#a78bfa", "#fbbf24", "#60a5fa", "#22d3ee", "#f87171",
  "#34d399", "#f472b6", "#a6d15a", "#e9b65f", "#b285f0", "#63c7e8",
]

export const COLORS = {
  floor: ["#1f3037", "#24363d"],
  wall: { top: "#1c2732", right: "#151f29", left: "#101821" },
  desk: { top: "#f0efe9", right: "#d8d4c5", left: "#bbb4a0" },
  panel: "#101824",
  panel2: "#162236",
  amber: "#f3ba63",
  paper: "#d8deef",
  cream: "#edf2ff",
  ink: "#0c121c",
}
