import { describe, expect, it } from "vitest"
import { designBackgroundSlots, OR_MEDIA_FALLBACK } from "@/lib/ai/openRouterCatalog"

describe("designBackgroundSlots", () => {
  it("exposes text, image and video slots for Design ensemble", () => {
    const slots = designBackgroundSlots()
    expect(slots).toHaveLength(3)
    expect(slots.map(s => s.modality)).toEqual(["text", "image", "video"])
    expect(slots[1].fallbackModel).toBe(OR_MEDIA_FALLBACK.image)
    expect(slots[2].fallbackModel).toBe(OR_MEDIA_FALLBACK.video)
  })
})
