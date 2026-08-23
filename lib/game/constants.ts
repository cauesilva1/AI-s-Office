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

// Modelos gratuitos disponíveis via Hugging Face Inference (router)
export const HF_MODELS = [
  "Qwen/Qwen2.5-Coder-32B-Instruct",
  "meta-llama/Llama-3.3-70B-Instruct",
  "deepseek-ai/DeepSeek-R1",
  "deepseek-ai/DeepSeek-V3",
  "Qwen/Qwen2.5-72B-Instruct",
  "mistralai/Mistral-7B-Instruct-v0.3",
  "microsoft/phi-4",
  "meta-llama/Llama-3.2-3B-Instruct",
  "google/gemma-2-9b-it",
]

export const STARTING_AGENTS = [
  { id: "qwen-coder", name: "Qwen Coder", role: "Engenheiro Sênior", sectorId: "engineering", color: "#2dd4bf", model: "Qwen/Qwen2.5-Coder-32B-Instruct" },
  { id: "llama", name: "Llama 3.3", role: "Designer", sectorId: "design", color: "#a78bfa", model: "meta-llama/Llama-3.3-70B-Instruct" },
  { id: "deepseek", name: "DeepSeek R1", role: "Pesquisador", sectorId: "research", color: "#fbbf24", model: "deepseek-ai/DeepSeek-R1" },
  { id: "qwen", name: "Qwen 2.5", role: "Cientista de Dados", sectorId: "data", color: "#60a5fa", model: "Qwen/Qwen2.5-72B-Instruct" },
  { id: "mistral", name: "Mistral", role: "Engenheiro DevOps", sectorId: "devops", color: "#22d3ee", model: "mistralai/Mistral-7B-Instruct-v0.3" },
  { id: "phi", name: "Phi-4", role: "Growth Hacker", sectorId: "growth", color: "#f87171", model: "microsoft/phi-4" },
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
