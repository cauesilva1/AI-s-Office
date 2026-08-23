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
          className="absolute bottom-6 left-1/2 z-[70] bg-panel border border-line text-white px-5 py-2.5 rounded-full shadow-xl font-medium text-sm whitespace-nowrap"
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
