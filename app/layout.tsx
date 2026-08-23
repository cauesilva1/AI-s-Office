import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agent Office — Suas IAs trabalhando juntas",
  description: "Um escritório virtual onde os melhores modelos abertos da Hugging Face trabalham em conjunto, divididos por setores.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      {/* overflow fica por página: a landing precisa de scroll, o /office trava o próprio container */}
      <body className="antialiased bg-[#0b1220]">
        {children}
      </body>
    </html>
  )
}
