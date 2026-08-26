import { NextRequest, NextResponse } from "next/server"
import { isImageModel } from "@/lib/game/constants"
import { resolveApiKey } from "@/lib/ai/serverKeys"
import { buildAgentSystemPrompt } from "@/lib/ai/officeMode"
import { isMediaModality } from "@/lib/ai/mediaModality"
import { generateMedia, resolveMediaModel } from "@/lib/ai/mediaGenerate"
import {
  imagePromptFrom,
  resolveMediaFromBody,
  resolveProvider,
} from "@/lib/ai/apiShared"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      agentName, agentRole, sectorName, sectorId, prompt, model, ensembleSlot,
    } = body
    const provider = resolveProvider(body.provider)
    const clientKey = String(body.apiKey || body.hfToken || "")
    const { apiKey } = resolveApiKey(provider, clientKey)
    const promptText = String(prompt || "")

    const explicitModality = resolveMediaFromBody(body, promptText)
    const hasExplicitMedia = typeof body.mediaModality === "string"
    const legacyImageModel = isImageModel(String(model || ""))
    const isDesignSector = sectorId === "design"
    const detectedModality = isDesignSector || hasExplicitMedia || legacyImageModel
      ? explicitModality
      : "text"
    const effectiveModality =
      legacyImageModel && detectedModality === "text" ? "image" : detectedModality

    if (!isMediaModality(effectiveModality) && !legacyImageModel) {
      return NextResponse.json(
        { error: "Pedido sem modalidade de mídia (image/video/audio)." },
        { status: 400 },
      )
    }

    if (provider === "mock" || !apiKey) {
      return NextResponse.json({
        text: `[simulação] Pedido de ${effectiveModality} — configure a API key do provedor ativo.`,
      })
    }

    const mediaPrompt = imagePromptFrom(promptText)
    const systemPrompt = buildAgentSystemPrompt({
      provider,
      sectorId: typeof sectorId === "string" ? sectorId : undefined,
      sectorName: typeof sectorName === "string" ? sectorName : undefined,
      agentName: String(agentName || "Agente"),
      agentRole: String(agentRole || "Assistente"),
      ensembleSlot: typeof ensembleSlot === "number" ? ensembleSlot : undefined,
      customSystemPrompt:
        typeof body.customSystemPrompt === "string" ? body.customSystemPrompt : undefined,
    })

    const mediaModel = await resolveMediaModel(
      provider,
      effectiveModality,
      typeof model === "string" ? model : undefined,
    )

    const generated = await generateMedia({
      provider,
      apiKey,
      modality: effectiveModality,
      prompt: mediaPrompt,
      systemPrompt,
      model: mediaModel || undefined,
    })

    if (generated.error) {
      console.error("[media]", provider, effectiveModality, mediaModel, generated.error)
    }

    if (generated.error && !generated.imageUrl && !generated.videoUrl && !generated.text) {
      const { friendlyErrorLine } = await import("@/lib/ai/friendlyErrors")
      return NextResponse.json({ error: friendlyErrorLine(generated.error) }, { status: 200 })
    }

    return NextResponse.json({
      text: generated.text || `Entrega ${effectiveModality} via ${provider}.`,
      imageUrl: generated.imageUrl,
      videoUrl: generated.videoUrl,
      audioUrl: generated.audioUrl,
      model: generated.model,
      durationMs: generated.durationMs,
    })
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
