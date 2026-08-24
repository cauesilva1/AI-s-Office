"use client"

import { useEffect, useRef, useState, ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  label: string
  active?: boolean
  align?: "left" | "right"
  panelClassName?: string
  /** Quando este valor muda (>0), o dropdown abre */
  openSignal?: number
  children: ReactNode
}

/** Dropdown animado ancorado no header — fecha com Escape / clique fora */
export default function HeaderDropdown({
  label,
  active,
  align = "right",
  panelClassName,
  openSignal,
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const lastSignal = useRef(openSignal)

  useEffect(() => {
    if (openSignal === undefined) return
    if (openSignal !== lastSignal.current && openSignal > 0) {
      lastSignal.current = openSignal
      setOpen(true)
    }
  }, [openSignal])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onClick)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onClick)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 border-2 border-ink px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
          open || active
            ? "bg-coral text-cream"
            : "bg-paper text-ink hover:bg-cream-2"
        )}
      >
        {label}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cn(
              "absolute top-full mt-2 z-[100] w-[min(92vw,22rem)] max-h-[min(70vh,32rem)] overflow-y-auto border-[3px] border-ink bg-paper shadow-pixel",
              align === "right" ? "right-0" : "left-0",
              panelClassName
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
