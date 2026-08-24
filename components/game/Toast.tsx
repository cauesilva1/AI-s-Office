"use client"

import { useGameStore } from "@/store/gameStore"
import { motion, AnimatePresence } from "framer-motion"

export default function Toast() {
  const { toast, hideToast } = useGameStore()

  return (
    <AnimatePresence>
      {toast.visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 20, x: "-50%" }}
          onAnimationComplete={() => {
            setTimeout(hideToast, 2500)
          }}
          className="fixed bottom-6 left-1/2 z-[80] bg-navy text-cream border-[3px] border-ink shadow-pixel px-5 py-2.5 font-pixel text-[9px] whitespace-nowrap max-w-[90vw] truncate"
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
