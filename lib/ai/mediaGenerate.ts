import { AIProvider } from "@/lib/ai/providers"
import type { MediaModality } from "@/lib/ai/mediaModality"
import { bestOpenRouterMediaModel, OR_MEDIA_FALLBACK } from "@/lib/ai/openRouterCatalog"
import { runChatCompletion } from "@/lib/ai/chatClient"

export type MediaResult = {
  text: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
  model?: string
  error?: string
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

async function generateOpenRouterImage(
  apiKey: string,
  model: string,
  prompt: string,
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
      modalities: ["image", "text"],
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return { text: "", error: `OpenRouter imagem (${response.status}): ${err.slice(0, 200)}`, model }
  }

  const data = await response.json()
  const message = data?.choices?.[0]?.message || {}
  const imageUrl = extractImageFromOrMessage(message)
  const text = String(message.content || data?.choices?.[0]?.message?.content || "")

  if (imageUrl) {
    return {
      text: text || `Imagem gerada com ${model}.`,
      imageUrl,
      model,
    }
  }
  return {
    text: text || "Modelo não retornou imagem. Tente outro modelo no catálogo OR.",
    model,
    error: "Sem imagem na resposta",
  }
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

async function generateHfImage(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<MediaResult> {
  const endpoints = [
    `https://router.huggingface.co/hf-inference/models/${model}`,
    `https://router.huggingface.co/fal-ai/${model}`,
  ]
  let lastErr = ""

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify({ inputs: prompt, parameters: { num_inference_steps: 28 } }),
      })
      if (!response.ok) {
        lastErr = await response.text()
        continue
      }
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        const data = await response.json()
        const remoteUrl = data.url || data.image_url
        if (typeof remoteUrl === "string") {
          return { text: `Imagem gerada com ${model}.`, imageUrl: remoteUrl, model }
        }
        continue
      }
      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length < 32) continue
      const mime = contentType.includes("jpeg") ? "image/jpeg" : "image/png"
      return {
        text: `Imagem gerada com ${model}.`,
        imageUrl: `data:${mime};base64,${buffer.toString("base64")}`,
        model,
      }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : "Erro HF"
    }
  }
  return { text: "", error: lastErr || "Falha HF imagem", model }
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

export async function resolveMediaModel(
  provider: AIProvider,
  modality: MediaModality,
  explicitModel?: string,
): Promise<string | null> {
  if (modality === "text") return explicitModel || null
  if (explicitModel) return explicitModel

  if (provider === "openrouter") {
    return bestOpenRouterMediaModel(modality)
  }
  if (provider === "huggingface") {
    if (modality === "image") return "black-forest-labs/FLUX.1-schnell"
    return null
  }
  if (provider === "openai" && modality === "image") return "gpt-image-1"
  return OR_MEDIA_FALLBACK[modality] // último recurso em dev
}

export async function generateMedia(params: {
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

  const model = params.model || (await resolveMediaModel(provider, modality)) || ""

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
