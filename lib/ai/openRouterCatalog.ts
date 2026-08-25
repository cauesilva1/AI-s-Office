import type { MediaModality } from "@/lib/ai/mediaModality"

export type OrCatalogModel = {
  id: string
  name: string
  outputModalities: string[]
  promptPrice: number
}

/** Fallbacks se a API falhar — free tier OR (ago/2026) */
export const OR_MEDIA_FALLBACK: Record<Exclude<MediaModality, "text">, string> = {
  image: "bytedance-seed/seedream-5-0-lite",
  video: "alibaba/wan-3.0",
  audio: "google/lyria-3-clip-preview:free",
}

const MODALITY_PARAM: Record<Exclude<MediaModality, "text">, string> = {
  image: "image",
  video: "video",
  audio: "audio",
}

let cache: { at: number; byModality: Map<string, OrCatalogModel[]> } | null = null
const CACHE_MS = 60 * 60 * 1000

function parsePrice(raw: unknown): number {
  const n = Number(raw)
  return Number.isFinite(n) ? n : 999
}

export async function fetchOpenRouterByModality(
  modality: Exclude<MediaModality, "text">,
  maxPrice = 0,
): Promise<OrCatalogModel[]> {
  const param = MODALITY_PARAM[modality]
  const url = `https://openrouter.ai/api/v1/models?max_price=${maxPrice}&output_modalities=${param}&order=most-popular`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`OpenRouter catalog (${res.status})`)

  const data = await res.json()
  const list = Array.isArray(data?.data) ? data.data : []

  return list
    .map((m: {
      id: string
      name?: string
      architecture?: { output_modalities?: string[] }
      pricing?: { prompt?: string; completion?: string }
    }) => ({
      id: m.id,
      name: m.name || m.id,
      outputModalities: m.architecture?.output_modalities || [],
      promptPrice: parsePrice(m.pricing?.prompt),
    }))
    .filter((m: OrCatalogModel) => m.outputModalities.includes(param))
}

async function getCached(modality: Exclude<MediaModality, "text">): Promise<OrCatalogModel[]> {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_MS) {
    const hit = cache.byModality.get(modality)
    if (hit?.length) return hit
  }

  try {
    const models = await fetchOpenRouterByModality(modality, 0)
    if (!cache || now - cache.at >= CACHE_MS) {
      cache = { at: now, byModality: new Map() }
    }
    cache.byModality.set(modality, models)
    return models
  } catch {
    return []
  }
}

/** Melhor modelo free OR para a modalidade (popular primeiro na API) */
export async function bestOpenRouterMediaModel(
  modality: Exclude<MediaModality, "text">,
): Promise<string> {
  const models = await getCached(modality)
  if (models.length > 0) return models[0].id
  return OR_MEDIA_FALLBACK[modality]
}

export function designBackgroundSlots(): Array<{
  slot: number
  modality: Exclude<MediaModality, "text"> | "text"
  role: string
  nameSuffix: string
  fallbackModel: string
}> {
  return [
    {
      slot: 0,
      modality: "text",
      role: "Brief visual",
      nameSuffix: "Texto",
      fallbackModel: "google/gemma-4-31b-it:free",
    },
    {
      slot: 1,
      modality: "image",
      role: "Imagem · background",
      nameSuffix: "Imagem",
      fallbackModel: OR_MEDIA_FALLBACK.image,
    },
    {
      slot: 2,
      modality: "video",
      role: "Vídeo · background",
      nameSuffix: "Vídeo",
      fallbackModel: OR_MEDIA_FALLBACK.video,
    },
  ]
}
