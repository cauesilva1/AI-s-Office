import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agent Office — Game",
  description: "Gerencie seu escritório de agentes de IA",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased overflow-hidden bg-[#0c140d]">
        {children}
      </body>
    </html>
  )
}
