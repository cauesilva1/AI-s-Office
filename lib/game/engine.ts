import { Sector, Desk, LogEntry } from "./types"

export function initials(name: string): string {
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function generateLogEntry(text: string): LogEntry {
  return { text, timestamp: Date.now() }
}

export function getSectorById(sectors: Sector[], id: string): Sector | undefined {
  return sectors.find(s => s.id === id)
}

export function getDeskById(desks: Desk[], id: string): Desk | undefined {
  return desks.find(d => d.id === id)
}
