import { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "coral" | "navy" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
}

export default function PixelButton({
  className,
  variant = "coral",
  size = "md",
  children,
  ...props
}: Props) {
  const variants = {
    coral: "bg-coral text-cream border-ink hover:brightness-110",
    navy: "bg-navy text-cream border-ink hover:bg-navy-2",
    outline: "bg-paper text-ink border-ink hover:bg-cream-2",
    ghost: "bg-transparent text-ink border-ink hover:bg-cream-2",
  }
  const sizes = {
    sm: "px-3 py-1.5 text-[9px]",
    md: "px-4 py-2.5 text-[10px]",
    lg: "px-6 py-3.5 text-[11px]",
  }

  return (
    <button
      type="button"
      className={cn(
        "font-pixel uppercase tracking-wide border-[3px] shadow-pixel disabled:opacity-40 disabled:cursor-not-allowed transition-[transform,filter] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
