import { NextResponse } from "next/server"
import { allowClientKeys, providersWithServerKeys } from "@/lib/ai/serverKeys"

/** Metadados públicos — nunca expõe as keys */
export async function GET() {
  return NextResponse.json({
    allowClientKeys: allowClientKeys(),
    serverProviders: providersWithServerKeys(),
  })
}
