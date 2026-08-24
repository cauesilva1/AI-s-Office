import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agent Office — Suas IAs trabalhando juntas",
  description: "Um escritório web onde os melhores modelos abertos da Hugging Face trabalham em conjunto, divididos por setores.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-cream text-ink">
        {children}
      </body>
    </html>
  )
}
