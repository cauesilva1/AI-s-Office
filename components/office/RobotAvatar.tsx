"use client"

import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

type Size = "sm" | "md" | "lg" | "xl"

const SIZE: Record<Size, { box: string; svg: number }> = {
  sm: { box: "w-7 h-7", svg: 22 },
  md: { box: "w-9 h-9", svg: 28 },
  lg: { box: "w-12 h-12", svg: 40 },
  xl: { box: "w-16 h-16", svg: 56 },
}

type Props = {
  color: string
  working?: boolean
  size?: Size
  className?: string
  showBubble?: boolean
  /** frase curta na bala (só se working) */
  bubbleText?: string
}

/** Robô pixel + bala animada quando working */
export default function RobotAvatar({
  color,
  working = false,
  size = "md",
  className,
  showBubble = true,
  bubbleText,
}: Props) {
  const s = SIZE[size]

  return (
    <div className={cn("relative inline-flex flex-shrink-0", className)}>
      <AnimatePresence>
        {working && showBubble && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          >
            <div className="bg-paper border-2 border-ink px-1.5 py-0.5 shadow-pixel-sm whitespace-nowrap">
              {bubbleText ? (
                <span className="text-[8px] font-bold text-ink">{bubbleText}</span>
              ) : (
                <span className="inline-flex gap-0.5 items-center h-2.5 px-0.5">
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="w-1 h-1 rounded-full bg-ink"
                      animate={{ y: [0, -3, 0], opacity: [0.35, 1, 0.35] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                    />
                  ))}
                </span>
              )}
            </div>
            <div className="mx-auto w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-ink -mt-px" />
            <div className="mx-auto w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-paper -mt-[7px]" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={
          working
            ? { y: [0, -2, 0], rotate: [0, -3, 3, 0] }
            : { y: [0, -1.5, 0] }
        }
        transition={
          working
            ? { duration: 0.55, repeat: Infinity, ease: "easeInOut" }
            : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
        }
        className={cn(
          s.box,
          "border-2 border-ink flex items-center justify-center overflow-hidden",
          working && "ring-2 ring-coral ring-offset-1 ring-offset-cream"
        )}
        style={{ backgroundColor: color }}
      >
        <svg
          width={s.svg}
          height={s.svg}
          viewBox="0 0 32 32"
          aria-hidden
          className="block"
        >
          {/* antena */}
          <motion.circle
            cx="16"
            cy="3"
            r="1.5"
            fill="#1a1a1a"
            animate={working ? { opacity: [1, 0.2, 1] } : { opacity: 1 }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
          <rect x="15" y="4" width="2" height="3" fill="#1a1a1a" />
          {/* cabeça */}
          <rect x="7" y="7" width="18" height="14" fill="#fffdf8" stroke="#1a1a1a" strokeWidth="2" />
          {/* olhos */}
          <motion.rect
            x="11"
            y="11"
            width="3"
            height="3"
            fill="#1a1a1a"
            animate={working ? { scaleY: [1, 0.2, 1] } : {}}
            transition={{ duration: 0.35, repeat: Infinity, repeatDelay: 1.2 }}
            style={{ originX: "12.5px", originY: "12.5px" }}
          />
          <motion.rect
            x="18"
            y="11"
            width="3"
            height="3"
            fill="#1a1a1a"
            animate={working ? { scaleY: [1, 0.2, 1] } : {}}
            transition={{ duration: 0.35, repeat: Infinity, repeatDelay: 1.2, delay: 0.05 }}
            style={{ originX: "19.5px", originY: "12.5px" }}
          />
          {/* boca / display */}
          {working ? (
            <motion.rect
              x="12"
              y="17"
              height="2"
              fill="#e2554a"
              animate={{ width: [4, 8, 4], x: [14, 12, 14] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          ) : (
            <rect x="12" y="17" width="8" height="2" fill="#1a1a1a" />
          )}
          {/* corpo */}
          <rect x="10" y="21" width="12" height="7" fill="#0b1a2b" stroke="#1a1a1a" strokeWidth="1.5" />
          <rect x="13" y="23" width="6" height="3" fill={color} stroke="#1a1a1a" strokeWidth="1" />
        </svg>
      </motion.div>
    </div>
  )
}
