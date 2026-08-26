"use client"

import { useEffect, useState } from "react"
import { useGameStore } from "@/store/gameStore"
import { Key, RotateCcw, ExternalLink, Server } from "lucide-react"
import PixelButton from "@/components/site/PixelButton"
import {
  AIProvider,
  PROVIDERS,
  activeApiKey,
  getProviderMeta,
} from "@/lib/ai/providers"

type ServerConfig = {
  allowClientKeys: boolean
  serverProviders: Exclude<AIProvider, "mock">[]
}

export default function SettingsPanel({ onDone }: { onDone?: () => void }) {
  const {
    aiProvider,
    apiKeys,
    hfToken,
    applyProviderSwitch,
    showToast,
    resetGame,
    setProviderError,
    providerError,
  } = useGameStore()

  const [provider, setProvider] = useState<AIProvider>(aiProvider)
  const [key, setKey] = useState(activeApiKey(aiProvider, apiKeys, hfToken))
  const [confirmReset, setConfirmReset] = useState(false)
  const [serverCfg, setServerCfg] = useState<ServerConfig | null>(null)
  const meta = getProviderMeta(provider)
  const serverHasKey =
    provider !== "mock" && Boolean(serverCfg?.serverProviders.includes(provider))

  useEffect(() => {
    setProvider(aiProvider)
    setKey(activeApiKey(aiProvider, apiKeys, hfToken))
  }, [aiProvider, apiKeys, hfToken])

  useEffect(() => {
    let cancelled = false
    fetch("/api/config")
      .then(r => r.json())
      .then((data: ServerConfig) => {
        if (!cancelled) setServerCfg(data)
      })
      .catch(() => {
        if (!cancelled) setServerCfg({ allowClientKeys: true, serverProviders: [] })
      })
    return () => { cancelled = true }
  }, [])

  const handleProviderPick = (id: AIProvider) => {
    setProvider(id)
    setKey(activeApiKey(id, apiKeys, hfToken))
  }

  const toastForSwitch = (label: string, result: { remapped: number; removed: number; added: number; mode: "solo" | "team" | "ensemble" }) => {
    if (result.mode === "solo") {
      showToast(`${label} · modo solo · 6 sêniores`)
      return
    }
    if (result.mode === "ensemble") {
      showToast(`${label} · trio por setor · paralelo + síntese`)
      return
    }
    if (result.added > 0) {
      showToast(`${label} · time HF restaurado`)
      return
    }
    if (result.remapped > 0) {
      showToast(`${label} · ${result.remapped} modelo(s) ajustado(s)`)
      return
    }
    showToast(`Provedor: ${label}`)
  }

  const handleSave = () => {
    if (provider === "mock") {
      const result = applyProviderSwitch("mock")
      toastForSwitch("Simulação", result)
      setProviderError(null)
      onDone?.()
      return
    }

    if (serverHasKey && !key.trim()) {
      const result = applyProviderSwitch(provider)
      toastForSwitch(`${getProviderMeta(provider).label} (servidor)`, result)
      setProviderError(null)
      onDone?.()
      return
    }

    if (!serverCfg?.allowClientKeys && !serverHasKey) {
      showToast("Este ambiente só aceita keys no servidor (.env)")
      return
    }

    const trimmed = key.trim()
    if (!trimmed && !serverHasKey) {
      showToast("Cole a API key deste provedor")
      return
    }

    const result = applyProviderSwitch(provider, trimmed || undefined)
    toastForSwitch(getProviderMeta(provider).label, result)
    setProviderError(null)
    onDone?.()
  }

  return (
    <div className="p-4 theme-cream w-[min(92vw,22rem)]">
      <h3 className="text-sm font-bold text-ink mb-1">Provedor de IA</h3>
      <p className="text-[11px] text-muted-ink mb-3 leading-relaxed">
        Só o provedor selecionado é usado — chat, missões e roteador. Ao salvar, o time é remontado para esse provedor.
      </p>

      {providerError && (
        <div className="mb-3 border-2 border-coral bg-coral/10 px-2.5 py-2 text-[11px] text-ink leading-relaxed">
          <strong>Último erro:</strong> {providerError}
        </div>
      )}

      {serverCfg && serverCfg.serverProviders.length > 0 && (
        <div className="mb-3 flex items-start gap-2 border-2 border-ink bg-grid/10 px-2 py-1.5 text-[10px] text-ink">
          <Server className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Keys no servidor: {serverCfg.serverProviders.map(p => getProviderMeta(p).short).join(", ")}
            {!serverCfg.allowClientKeys && " · client keys desligadas"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {PROVIDERS.map(p => {
          const hasClient = p.id === "mock" || Boolean(activeApiKey(p.id, apiKeys, hfToken))
          const hasServer = p.id !== "mock" && Boolean(serverCfg?.serverProviders.includes(p.id))
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleProviderPick(p.id)}
              className={`border-2 border-ink px-2 py-2 text-left transition-colors ${
                provider === p.id
                  ? "bg-coral text-cream"
                  : "bg-paper text-ink hover:bg-cream-2"
              }`}
            >
              <div className="text-[11px] font-bold">{p.short}</div>
              <div className={`text-[9px] truncate ${provider === p.id ? "text-cream/80" : "text-muted-ink"}`}>
                {p.label}
                {hasServer ? " · srv" : hasClient && p.needsKey ? " · ok" : ""}
              </div>
            </button>
          )
        })}
      </div>

      {meta.needsKey && (
        <>
          <label className="text-[11px] font-bold text-ink mb-1.5 block">
            API key · {meta.label}
            {serverHasKey ? " (opcional — servidor já tem)" : ""}
          </label>
          <div className="relative mb-1.5">
            <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-ink" />
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={meta.placeholder}
              disabled={serverCfg?.allowClientKeys === false && !serverHasKey}
              className="w-full bg-cream border-2 border-ink pl-8 pr-2 py-2 text-ink text-xs focus:outline-none focus:border-coral disabled:opacity-50"
            />
          </div>
          <p className="text-[10px] text-muted-ink mb-3 leading-relaxed flex items-start gap-1">
            <span className="flex-1">{meta.hint}</span>
            {meta.docsUrl && (
              <a
                href={meta.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-coral flex-shrink-0 inline-flex items-center gap-0.5 font-bold"
              >
                Link <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </p>
        </>
      )}

      {!meta.needsKey && (
        <p className="text-[11px] text-muted-ink mb-3 leading-relaxed border-2 border-ink/15 bg-cream-2 px-2 py-2">
          {meta.hint}
        </p>
      )}

      <div className="flex gap-2 mb-3">
        <PixelButton size="sm" className="flex-1" onClick={handleSave}>
          Salvar
        </PixelButton>
      </div>

      <div className="pt-3 border-t-2 border-ink">
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="w-full flex items-center justify-center gap-2 text-[11px] font-bold border-2 border-coral text-coral py-2 hover:bg-coral hover:text-cream"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar escritório
          </button>
        ) : (
          <div className="flex gap-2">
            <PixelButton
              size="sm"
              className="flex-1"
              onClick={() => {
                resetGame()
                setConfirmReset(false)
                showToast("Escritório reiniciado")
                onDone?.()
              }}
            >
              Confirmar
            </PixelButton>
            <PixelButton size="sm" variant="outline" onClick={() => setConfirmReset(false)}>
              Cancelar
            </PixelButton>
          </div>
        )}
      </div>
    </div>
  )
}
