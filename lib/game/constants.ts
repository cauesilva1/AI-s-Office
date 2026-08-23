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

// Modelos de chat disponíveis via Hugging Face Inference (router) — atualizados ago/2026
export const HF_MODELS = [
  "Qwen/Qwen3-Coder-480B-A35B-Instruct",
  "moonshotai/Kimi-K2.7-Code",
  "deepseek-ai/DeepSeek-V4-Flash",
  "deepseek-ai/DeepSeek-R1",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "zai-org/GLM-5.2",
  "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  "meta-llama/Llama-3.1-8B-Instruct",
  "Qwen/Qwen3.5-27B",
  "google/gemma-4-26B-A4B-it",
  "MiniMaxAI/MiniMax-M3",
  "microsoft/phi-4",
]

// Modelos text-to-image no Inference Providers (Design).
// Pesquisa ago/2026: FLUX.1-dev é o exemplo oficial da HF e o melhor equilíbrio
// qualidade/disponibilidade; schnell é mais rápido (Apache-2.0); Krea é o
// recomendado da HF para realismo; Qwen-Image e SD3.5-large são alternativas.
export const HF_IMAGE_MODELS = [
  "black-forest-labs/FLUX.1-dev",
  "black-forest-labs/FLUX.1-schnell",
  "black-forest-labs/FLUX.1-Krea-dev",
  "Qwen/Qwen-Image",
  "stabilityai/stable-diffusion-3.5-large",
]

export function isImageModel(model: string): boolean {
  if (HF_IMAGE_MODELS.includes(model)) return true
  const id = model.toLowerCase()
  return id.includes("flux") || id.includes("stable-diffusion") || id.includes("qwen-image") || id.includes("hyper-sd")
}

// Modelo pequeno e rápido dedicado ao roteamento automático de missões
export const ROUTER_MODEL = "meta-llama/Llama-3.1-8B-Instruct"

export const STARTING_AGENTS = [
  { id: "qwen-coder", name: "Qwen3 Coder", role: "Engenheiro Sênior", sectorId: "engineering", color: "#2dd4bf", model: "Qwen/Qwen3-Coder-480B-A35B-Instruct" },
  { id: "llama", name: "FLUX.1", role: "Designer", sectorId: "design", color: "#a78bfa", model: "black-forest-labs/FLUX.1-dev" },
  { id: "deepseek", name: "DeepSeek V4", role: "Pesquisador", sectorId: "research", color: "#fbbf24", model: "deepseek-ai/DeepSeek-V4-Flash" },
  { id: "qwen", name: "GPT-OSS", role: "Cientista de Dados", sectorId: "data", color: "#60a5fa", model: "openai/gpt-oss-120b" },
  { id: "mistral", name: "GLM 5.2", role: "Engenheiro DevOps", sectorId: "devops", color: "#22d3ee", model: "zai-org/GLM-5.2" },
  { id: "phi", name: "Llama 4", role: "Growth Hacker", sectorId: "growth", color: "#f87171", model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8" },
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
