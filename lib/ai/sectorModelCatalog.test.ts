import { describe, expect, it } from "vitest"
import {
  catalogForProvider,
  HF_SECTOR_CATALOG,
  OR_SECTOR_CATALOG,
} from "@/lib/ai/sectorModelCatalog"

describe("sectorModelCatalog", () => {
  it("gives Design three explicit roles on HF", () => {
    const design = HF_SECTOR_CATALOG.design
    expect(design).toHaveLength(3)
    expect(design.map(d => d.role)).toEqual(["qualidade", "velocidade", "estilo"])
    expect(design[0].id).toContain("FLUX.1-dev")
  })

  it("exposes curated lists for HF and OpenRouter", () => {
    expect(catalogForProvider("huggingface", "engineering").length).toBeGreaterThanOrEqual(3)
    expect(catalogForProvider("openrouter", "design")[1].id).toBe(OR_SECTOR_CATALOG.design[1].id)
    expect(catalogForProvider("openai", "design")).toEqual([])
  })
})
