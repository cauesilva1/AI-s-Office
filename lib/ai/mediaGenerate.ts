import { AIProvider } from "@/lib/ai/providers"
import type { MediaModality } from "@/lib/ai/mediaModality"
import { isHfImageModel } from "@/lib/game/constants"
import {
  bestOpenRouterMediaModel,
  openRouterModelSupportsModality,
  OR_MEDIA_FALLBACK,
} from "@/lib/ai/openRouterCatalog"
import { runChatCompletion } from "@/lib/ai/chatClient"
import { enrichImagePrompt } from "@/lib/ai/mediaPromptBuilders"

export type MediaResult = {
  text: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
  model?: string
  error?: string
  durationMs?: number
}

function extractImageFromOrMessage(message: Record<string, unknown>): string | undefined {
  const images = message.images as Array<Record<string, unknown>> | undefined
  if (Array.isArray(images)) {
    for (const img of images) {
      const url =
        (img.image_url as { url?: string })?.url ||
        (img.imageUrl as { url?: string })?.url ||
        (typeof img.url === "string" ? img.url : undefined)
      if (url) return url
    }
  }

  const content = message.content
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part?.type === "image_url" && part.image_url?.url) return part.image_url.url
    }
  }
  return undefined
}

async function generateOpenRouterImageViaChat(
  apiKey: string,
  model: string,
  prompt: string,
  modalities: Array<"image" | "text">,
  systemPrompt?: string,
): Promise<MediaResult> {
  const messages: Array<{ role: "system" | "user"; content: string }> = []
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt })
  messages.push({ role: "user", content: prompt })

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://agent-office.local",
      "X-Title": "Agent Office",
    },
    body: JSON.stringify({
      model,
      messages,
      modalities,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return { text: "", error: `OpenRouter imagem (${response.status}): ${err.slice(0, 240)}`, model }
  }

  const data = await response.json()
  const message = data?.choices?.[0]?.message || {}
  const imageUrl = extractImageFromOrMessage(message)
  const text = String(message.content || "")

  if (imageUrl) {
    return { text: text || `Imagem gerada com ${model}.`, imageUrl, model }
  }
  return { text: text || "Modelo não retornou imagem.", model, error: "Sem imagem na resposta" }
}

/** Image API dedicada — recomendada para Seedream, Flux, etc. */
async function generateOpenRouterImage(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
): Promise<MediaResult> {
  const fullPrompt = systemPrompt ? `${systemPrompt.slice(0, 400)}\n\n${prompt}` : prompt

  const response = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://agent-office.local",
      "X-Title": "Agent Office",
    },
    body: JSON.stringify({ model, prompt: fullPrompt, n: 1 }),
  })

  if (!response.ok) {
    const err = await response.text()
    if (response.status === 402) {
      return {
        text: "",
        error:
          "OpenRouter: créditos insuficientes (402). Recarregue em openrouter.ai/settings/credits ou use Hugging Face (FLUX).",
        model,
      }
    }
    // Fallback: modelos multimodais (ex. Gemini) ainda no chat/completions
    if (response.status === 404 || response.status === 400) {
      const chatOnly = await generateOpenRouterImageViaChat(
        apiKey,
        model,
        prompt,
        ["image", "text"],
        systemPrompt,
      )
      if (chatOnly.imageUrl || !chatOnly.error?.includes("404")) return chatOnly
      const imageOnly = await generateOpenRouterImageViaChat(
        apiKey,
        model,
        prompt,
        ["image"],
        systemPrompt,
      )
      if (imageOnly.imageUrl) return imageOnly
    }
    return { text: "", error: `OpenRouter imagem (${response.status}): ${err.slice(0, 240)}`, model }
  }

  const data = await response.json()
  const item = data?.data?.[0]
  const b64 = item?.b64_json
  const url = item?.url
  const mediaType = typeof item?.media_type === "string" ? item.media_type : "image/png"

  if (typeof b64 === "string" && b64.length > 0) {
    return {
      text: `Imagem gerada com ${model}.`,
      imageUrl: `data:${mediaType};base64,${b64}`,
      model,
    }
  }
  if (typeof url === "string") {
    return { text: `Imagem gerada com ${model}.`, imageUrl: url, model }
  }

  return { text: "", error: "Image API não retornou bytes", model }
}

async function generateOpenRouterVideo(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<MediaResult> {
  const response = await fetch("https://openrouter.ai/api/v1/videos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://agent-office.local",
      "X-Title": "Agent Office",
    },
    body: JSON.stringify({ model, prompt }),
  })

  if (!response.ok) {
    const err = await response.text()
    return { text: "", error: `OpenRouter vídeo (${response.status}): ${err.slice(0, 220)}`, model }
  }

  const data = await response.json()
  const pollUrl = data.url || data.polling_url || data.links?.get
  const videoUrl = data.video_url || data.output?.url || data.data?.[0]?.url

  if (videoUrl) {
    return { text: `Vídeo gerado com ${model}.`, videoUrl: String(videoUrl), model }
  }

  if (pollUrl) {
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 3000))
      const poll = await fetch(String(pollUrl), {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!poll.ok) continue
      const status = await poll.json()
      const doneUrl =
        status.video_url ||
        status.output?.url ||
        status.data?.[0]?.url ||
        status.result?.url
      if (doneUrl) {
        return { text: `Vídeo gerado com ${model}.`, videoUrl: String(doneUrl), model }
      }
      if (status.status === "failed" || status.error) {
        return { text: "", error: String(status.error || "Geração de vídeo falhou"), model }
      }
    }
    return {
      text: `Vídeo em processamento (${model}). URL de polling: ${pollUrl}`,
      model,
    }
  }

  return { text: JSON.stringify(data).slice(0, 300), model, error: "Resposta de vídeo inesperada" }
}

/** providerId no Inference Providers (não é o slug do Hub) */
const HF_IMAGE_PROVIDER_ROUTES: Record<string, Array<{ provider: string; providerId: string }>> = {
  "black-forest-labs/FLUX.1-dev": [
    { provider: "fal-ai", providerId: "fal-ai/flux/dev" },
    { provider: "replicate", providerId: "black-forest-labs/flux-dev" },
    { provider: "wavespeed", providerId: "wavespeed-ai/flux-dev" },
  ],
  "black-forest-labs/FLUX.1-schnell": [
    { provider: "fal-ai", providerId: "fal-ai/flux/schnell" },
    { provider: "nscale", providerId: "black-forest-labs/FLUX.1-schnell" },
    { provider: "wavespeed", providerId: "wavespeed-ai/flux-schnell" },
  ],
  "black-forest-labs/FLUX.1-Krea-dev": [
    { provider: "fal-ai", providerId: "fal-ai/flux/krea" },
    { provider: "replicate", providerId: "black-forest-labs/flux-krea-dev" },
  ],
}

function extractHfImageUrl(data: Record<string, unknown>): string | undefined {
  const images = data.images as Array<{ url?: string; content?: string }> | undefined
  if (Array.isArray(images) && images[0]) {
    if (typeof images[0].url === "string") return images[0].url
    if (typeof images[0].content === "string") return images[0].content
  }
  if (typeof data.url === "string") return data.url
  if (typeof data.image_url === "string") return data.image_url
  const output = data.output
  if (typeof output === "string") return output
  if (Array.isArray(output) && typeof output[0] === "string") return output[0]
  return undefined
}

/** @deprecated use mediaPromptBuilders — reexport p/ testes existentes */
export { enrichImagePrompt } from "@/lib/ai/mediaPromptBuilders"

async function remoteUrlToDataUrl(remoteUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch(remoteUrl)
    if (!res.ok) return undefined
    const buffer = Buffer.from(await res.arrayBuffer())
    // PNG/JPEG mínimos válidos — rejeita lixo / 1x1 quase preto típico de filtro
    if (buffer.length < 2_000) return undefined
    const contentType = res.headers.get("content-type") || ""
    const mime = contentType.includes("jpeg")
      ? "image/jpeg"
      : contentType.includes("webp")
        ? "image/webp"
        : "image/png"
    return `data:${mime};base64,${buffer.toString("base64")}`
  } catch {
    return undefined
  }
}

async function generateHfImage(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<MediaResult> {
  const visualPrompt = enrichImagePrompt(prompt)
  const routes = HF_IMAGE_PROVIDER_ROUTES[model] || [
    { provider: "fal-ai", providerId: model },
    { provider: "hf-inference", providerId: `models/${model}` },
  ]
  let lastErr = ""

  for (const { provider, providerId } of routes) {
    const url = `https://router.huggingface.co/${provider}/${providerId}`
    try {
      const body =
        provider === "hf-inference"
          ? { inputs: visualPrompt, parameters: { num_inference_steps: 28 } }
          : provider === "fal-ai"
            ? {
                prompt: visualPrompt,
                image_size: "square_hd",
                num_images: 1,
                enable_safety_checker: false,
              }
            : { prompt: visualPrompt }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json, image/png, */*",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        lastErr = await response.text()
        continue
      }

      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json") || contentType.includes("text/plain")) {
        const data = await response.json()
        const remoteUrl = extractHfImageUrl(data)
        if (remoteUrl) {
          const dataUrl = remoteUrl.startsWith("data:")
            ? remoteUrl
            : await remoteUrlToDataUrl(remoteUrl)
          if (dataUrl) {
            return {
              text: `Imagem gerada com ${model} (${provider}).`,
              imageUrl: dataUrl,
              model,
            }
          }
          // URL remota como fallback (pode expirar)
          return {
            text: `Imagem gerada com ${model} (${provider}).`,
            imageUrl: remoteUrl,
            model,
          }
        }
        lastErr = JSON.stringify(data).slice(0, 220)
        continue
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length < 2_000) {
        lastErr = "Imagem vazia ou bloqueada pelo filtro de segurança"
        continue
      }
      const mime = contentType.includes("jpeg") ? "image/jpeg" : contentType.includes("webp") ? "image/webp" : "image/png"
      return {
        text: `Imagem gerada com ${model} (${provider}).`,
        imageUrl: `data:${mime};base64,${buffer.toString("base64")}`,
        model,
      }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : "Erro HF"
    }
  }

  return {
    text: "",
    error: lastErr || "Falha HF imagem — confira se o token tem permissão Inference Providers",
    model,
  }
}

async function generateOpenAiImage(
  apiKey: string,
  prompt: string,
): Promise<MediaResult> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return { text: "", error: `OpenAI imagem: ${err.slice(0, 200)}` }
  }

  const data = await response.json()
  const b64 = data?.data?.[0]?.b64_json
  const url = data?.data?.[0]?.url
  if (b64) {
    return {
      text: "Imagem gerada com OpenAI.",
      imageUrl: `data:image/png;base64,${b64}`,
      model: "gpt-image-1",
    }
  }
  if (url) return { text: "Imagem gerada com OpenAI.", imageUrl: url, model: "gpt-image-1" }
  return { text: "", error: "OpenAI não retornou imagem" }
}

async function generateGoogleImage(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<MediaResult> {
  const visualPrompt = enrichImagePrompt(prompt)
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: visualPrompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return { text: "", error: `Google imagem: ${err.slice(0, 220)}`, model }
  }

  const data = await response.json()
  const parts = data?.candidates?.[0]?.content?.parts as Array<{
    text?: string
    inlineData?: { mimeType?: string; data?: string }
  }> | undefined

  let text = ""
  let imageUrl: string | undefined
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (part.text) text += part.text
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || "image/png"
        imageUrl = `data:${mime};base64,${part.inlineData.data}`
      }
    }
  }

  if (!imageUrl) {
    return { text: text || "", error: "Gemini não retornou imagem", model }
  }
  return {
    text: text || "Imagem gerada com Gemini.",
    imageUrl,
    model,
  }
}

export async function resolveMediaModel(
  provider: AIProvider,
  modality: MediaModality,
  explicitModel?: string,
): Promise<string | null> {
  if (modality === "text") return explicitModel || null

  if (provider === "openrouter") {
    const catalogModel = await bestOpenRouterMediaModel(modality)
    if (explicitModel && await openRouterModelSupportsModality(explicitModel, modality)) {
      return explicitModel
    }
    return catalogModel
  }

  if (provider === "huggingface") {
    if (modality === "image") {
      if (explicitModel && isHfImageModel(explicitModel)) return explicitModel
      return "black-forest-labs/FLUX.1-schnell"
    }
    return null
  }

  if (provider === "openai" && modality === "image") return "gpt-image-1"

  if (provider === "google" && modality === "image") {
    return "gemini-2.0-flash-preview-image-generation"
  }

  return null
}

export async function generateMedia(params: {
  provider: AIProvider
  apiKey: string
  modality: MediaModality
  prompt: string
  systemPrompt?: string
  model?: string
}): Promise<MediaResult> {
  const started = Date.now()
  const result = await generateMediaInner(params)
  return { ...result, durationMs: result.durationMs ?? Date.now() - started }
}

async function generateMediaInner(params: {
  provider: AIProvider
  apiKey: string
  modality: MediaModality
  prompt: string
  systemPrompt?: string
  model?: string
}): Promise<MediaResult> {
  const { provider, apiKey, modality, prompt, systemPrompt } = params
  if (modality === "text" || !apiKey) {
    return { text: "", error: "Modalidade texto ou sem API key" }
  }

  const model = (await resolveMediaModel(provider, modality, params.model)) || ""

  if (provider === "openrouter") {
    if (modality === "image") return generateOpenRouterImage(apiKey, model, prompt, systemPrompt)
    if (modality === "video") return generateOpenRouterVideo(apiKey, model, prompt)
    if (modality === "audio") {
      const chat = await runChatCompletion({
        provider: "openrouter",
        apiKey,
        model: model || OR_MEDIA_FALLBACK.audio,
        messages: [
          ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
        maxTokens: 800,
      })
      return { text: chat.text || chat.error || "", model, error: chat.error }
    }
  }

  if (provider === "huggingface" && modality === "image") {
    return generateHfImage(apiKey, model || "black-forest-labs/FLUX.1-schnell", prompt)
  }

  if (provider === "openai" && modality === "image") {
    return generateOpenAiImage(apiKey, prompt)
  }

  if (provider === "google" && modality === "image") {
    return generateGoogleImage(
      apiKey,
      model || "gemini-2.0-flash-preview-image-generation",
      prompt,
    )
  }

  const chat = await runChatCompletion({
    provider,
    apiKey,
    model: model || "gpt-4o-mini",
    messages: [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      {
        role: "user",
        content: `${prompt}\n\n(Provedor ${provider} não suporta ${modality} nativamente — resposta em texto.)`,
      },
    ],
    maxTokens: 900,
  })

  return {
    text: chat.text || "",
    model,
    error: chat.error || `Sem suporte a ${modality} neste provedor`,
  }
}
