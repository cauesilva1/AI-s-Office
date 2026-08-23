"use client"

import { Application, Container, Graphics, Text, TextStyle } from "pixi.js"
import { useGameStore } from "@/store/gameStore"
import { TILE_WIDTH, TILE_HEIGHT } from "@/lib/game/constants"
import { Sector } from "@/lib/game/types"

function hexToNumber(hex: string): number {
  return parseInt(hex.replace("#", ""), 16)
}

// Escurece/clareia uma cor 0xRRGGBB por um fator (0..2)
function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor))
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor))
  const b = Math.min(255, Math.round((color & 0xff) * factor))
  return (r << 16) | (g << 8) | b
}

export class OfficeScene {
  private app: Application
  private scene: Container
  private store: ReturnType<typeof useGameStore.getState>
  private agents: Map<string, Container> = new Map()
  private lightingLayer: Graphics
  private staticLayer: Container
  private dynamicLayer: Container
  private isDragging = false
  private lastPointer = { x: 0, y: 0 }
  private listenersBound = false
  private lastLayoutSignature = ""
  private lastAgentVisualSignature = ""

  constructor(app: Application, scene: Container) {
    this.app = app
    this.scene = scene
    this.store = useGameStore.getState()
    this.staticLayer = new Container()
    this.dynamicLayer = new Container()
    this.lightingLayer = new Graphics()
    this.scene.addChild(this.staticLayer)
    this.scene.addChild(this.dynamicLayer)
    this.scene.addChild(this.lightingLayer)
    this.bindInteractions()
    this.render()
  }

  private isoToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - y) * TILE_WIDTH * 0.5,
      y: (x + y) * TILE_HEIGHT * 0.5,
    }
  }

  private buildLayoutSignature() {
    return JSON.stringify({
      layout: this.store.layoutMode,
      selectedDeskId: this.store.selectedDeskId,
      sectors: this.store.sectors.map((s) => ({ id: s.id, zone: s.zone })),
      desks: this.store.desks.map((d) => ({ id: d.id, p: d.position, agentId: d.agentId })),
    })
  }

  private buildAgentSignature() {
    return JSON.stringify({
      selectedAgentId: this.store.selectedAgentId,
      agents: this.store.agents.map((a) => ({
        id: a.id,
        position: a.position,
        spriteState: a.spriteState,
        model: a.model,
        name: a.name,
      })),
    })
  }

  render(full = true) {
    const nextLayoutSignature = this.buildLayoutSignature()
    const nextAgentSignature = this.buildAgentSignature()
    let staticChanged = false

    if (full || nextLayoutSignature !== this.lastLayoutSignature) {
      this.renderStaticWorld()
      this.lastLayoutSignature = nextLayoutSignature
      staticChanged = true
    }

    if (full || nextAgentSignature !== this.lastAgentVisualSignature) {
      this.renderAgents()
      this.lastAgentVisualSignature = nextAgentSignature
    }

    this.renderLighting()
    if (staticChanged || full) this.centerScene()
  }

  private renderStaticWorld() {
    this.scene.removeChildren()
    this.staticLayer = new Container()
    this.dynamicLayer = new Container()
    this.lightingLayer = new Graphics()
    this.scene.addChild(this.staticLayer)
    this.scene.addChild(this.dynamicLayer)
    this.scene.addChild(this.lightingLayer)
    this.renderGrid()
    this.renderSectorRooms()
    this.renderSectorWalls()
    this.renderCommonArea()
    this.renderDesks()
  }

  private getWorkspaceBounds() {
    const sectors = this.store.sectors
    const minX = Math.min(...sectors.map(s => s.zone.x)) - 3
    const minY = Math.min(...sectors.map(s => s.zone.y)) - 3
    const maxX = Math.max(...sectors.map(s => s.zone.x + s.zone.w)) + 3
    const maxY = Math.max(...sectors.map(s => s.zone.y + s.zone.h)) + 3
    return { minX, minY, maxX, maxY }
  }

  private renderGrid() {
    const grid = new Graphics()
    const { minX, minY, maxX, maxY } = this.getWorkspaceBounds()

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const pos = this.isoToScreen(x, y)
        grid.moveTo(pos.x, pos.y - TILE_HEIGHT / 2)
        grid.lineTo(pos.x + TILE_WIDTH / 2, pos.y)
        grid.lineTo(pos.x, pos.y + TILE_HEIGHT / 2)
        grid.lineTo(pos.x - TILE_WIDTH / 2, pos.y)
        grid.closePath()

        const isEven = (x + y) % 2 === 0
        grid.fill({ color: isEven ? 0x101a2b : 0x0d1624, alpha: 0.95 })
        grid.stroke({ color: 0x1b2b42, width: 0.5, alpha: 0.35 })
      }
    }
    this.staticLayer.addChild(grid)
  }

  // Cada setor vira uma "sala": tapete colorido, brilho ambiente e etiqueta
  private renderSectorRooms() {
    const sectors = this.store.sectors
    sectors.forEach(sector => {
      if (!sector.unlocked) return

      const zone = sector.zone
      const color = hexToNumber(sector.color)
      const graphics = new Graphics()

      const corner = (dx: number, dy: number) => this.isoToScreen(zone.x + dx * zone.w, zone.y + dy * zone.h)
      const tl = corner(0, 0)
      const tr = corner(1, 0)
      const br = corner(1, 1)
      const bl = corner(0, 1)

      // Glow ambiente do setor (embaixo de tudo)
      const center = this.isoToScreen(zone.x + zone.w / 2, zone.y + zone.h / 2)
      const glow = new Graphics()
      glow.ellipse(center.x, center.y, zone.w * TILE_WIDTH * 0.42, zone.h * TILE_HEIGHT * 0.62)
      glow.fill({ color, alpha: 0.05 })
      this.staticLayer.addChild(glow)

      // Piso da sala
      graphics.moveTo(tl.x, tl.y)
      graphics.lineTo(tr.x, tr.y)
      graphics.lineTo(br.x, br.y)
      graphics.lineTo(bl.x, bl.y)
      graphics.closePath()
      graphics.fill({ color: shade(color, 0.16), alpha: 0.55 })
      graphics.stroke({ color, width: 1.5, alpha: 0.35 })

      // Tapete interno aconchegante
      const rug = new Graphics()
      const inset = 0.18
      const r1 = this.isoToScreen(zone.x + zone.w * inset, zone.y + zone.h * inset)
      const r2 = this.isoToScreen(zone.x + zone.w * (1 - inset), zone.y + zone.h * inset)
      const r3 = this.isoToScreen(zone.x + zone.w * (1 - inset), zone.y + zone.h * (1 - inset))
      const r4 = this.isoToScreen(zone.x + zone.w * inset, zone.y + zone.h * (1 - inset))
      rug.moveTo(r1.x, r1.y)
      rug.lineTo(r2.x, r2.y)
      rug.lineTo(r3.x, r3.y)
      rug.lineTo(r4.x, r4.y)
      rug.closePath()
      rug.fill({ color: shade(color, 0.28), alpha: 0.3 })
      rug.stroke({ color, width: 1, alpha: 0.18 })

      const labelStyle = new TextStyle({
        fontFamily: "Inter",
        fontSize: 12,
        fill: sector.color,
        fontWeight: "bold",
        letterSpacing: 2,
      })
      const label = new Text({ text: sector.name.toUpperCase(), style: labelStyle })
      label.anchor.set(0.5)
      label.x = center.x
      label.y = center.y - 14
      label.alpha = 0.85

      this.staticLayer.addChild(graphics)
      this.staticLayer.addChild(rug)
      this.staticLayer.addChild(label)

      // Props aconchegantes nos cantos da sala
      this.renderSectorProps(sector)
    })
  }

  private renderSectorProps(sector: Sector) {
    const zone = sector.zone
    const color = hexToNumber(sector.color)

    // Planta no canto superior da sala
    const plantPos = this.isoToScreen(zone.x + 0.6, zone.y + 0.6)
    this.drawPlant(plantPos.x, plantPos.y, 1.1)

    // Prop temático no canto inferior
    const propPos = this.isoToScreen(zone.x + zone.w - 0.7, zone.y + zone.h - 0.7)
    if (sector.id === "devops") {
      this.drawServerRack(propPos.x, propPos.y, color)
    } else if (sector.id === "research" || sector.id === "data") {
      this.drawBookshelf(propPos.x, propPos.y)
    } else if (sector.id === "design") {
      this.drawEasel(propPos.x, propPos.y, color)
    } else {
      this.drawPlant(propPos.x, propPos.y, 0.9)
    }
  }

  private drawPlant(x: number, y: number, scale = 1) {
    const plant = new Graphics()
    // Vaso
    plant.moveTo(x - 5 * scale, y - 2 * scale)
    plant.lineTo(x + 5 * scale, y - 2 * scale)
    plant.lineTo(x + 3.5 * scale, y + 5 * scale)
    plant.lineTo(x - 3.5 * scale, y + 5 * scale)
    plant.closePath()
    plant.fill({ color: 0x7c5a3a })
    plant.stroke({ color: 0x5a3f27, width: 1 })
    // Folhas
    plant.ellipse(x - 3 * scale, y - 8 * scale, 4 * scale, 6 * scale)
    plant.fill({ color: 0x2f9e58 })
    plant.ellipse(x + 3 * scale, y - 9 * scale, 4 * scale, 7 * scale)
    plant.fill({ color: 0x37b566 })
    plant.ellipse(x, y - 12 * scale, 3.5 * scale, 6 * scale)
    plant.fill({ color: 0x45c974 })
    this.staticLayer.addChild(plant)
  }

  private drawServerRack(x: number, y: number, accent: number) {
    const rack = new Graphics()
    const w = 12
    const h = 30
    // Corpo
    rack.roundRect(x - w / 2, y - h, w, h, 2)
    rack.fill({ color: 0x131c2c })
    rack.stroke({ color: 0x27364e, width: 1 })
    // LEDs piscantes (estáticos, só decoração)
    for (let i = 0; i < 5; i++) {
      rack.circle(x - 2, y - h + 5 + i * 5, 1.2)
      rack.fill({ color: i % 2 === 0 ? accent : 0x34d399, alpha: 0.95 })
      rack.rect(x + 0.5, y - h + 4 + i * 5, 4, 1.6)
      rack.fill({ color: 0x22304a })
    }
    this.staticLayer.addChild(rack)
  }

  private drawBookshelf(x: number, y: number) {
    const shelf = new Graphics()
    const w = 22
    const h = 26
    shelf.roundRect(x - w / 2, y - h, w, h, 2)
    shelf.fill({ color: 0x4a3826 })
    shelf.stroke({ color: 0x33261a, width: 1 })
    // Prateleiras com livros coloridos
    const bookColors = [0xe9b65f, 0x60a5fa, 0xf87171, 0xa78bfa, 0x34d399]
    for (let row = 0; row < 3; row++) {
      const shelfY = y - h + 4 + row * 8
      for (let b = 0; b < 4; b++) {
        shelf.rect(x - w / 2 + 2.5 + b * 4.5, shelfY, 3.4, 6)
        shelf.fill({ color: bookColors[(row * 4 + b) % bookColors.length], alpha: 0.9 })
      }
    }
    this.staticLayer.addChild(shelf)
  }

  private drawEasel(x: number, y: number, accent: number) {
    const easel = new Graphics()
    // Pernas
    easel.moveTo(x - 8, y + 4)
    easel.lineTo(x, y - 22)
    easel.lineTo(x + 8, y + 4)
    easel.stroke({ color: 0x5a4632, width: 2 })
    // Tela
    easel.roundRect(x - 9, y - 20, 18, 14, 1.5)
    easel.fill({ color: 0x101827 })
    easel.stroke({ color: 0x2c3a52, width: 1 })
    // "Arte" abstrata
    easel.circle(x - 3, y - 14, 3)
    easel.fill({ color: accent, alpha: 0.85 })
    easel.rect(x + 1, y - 17, 5, 8)
    easel.fill({ color: 0xe9b65f, alpha: 0.7 })
    this.staticLayer.addChild(easel)
  }

  // Cantinho do café na área central entre os setores
  private renderCommonArea() {
    const { minX, minY, maxX, maxY } = this.getWorkspaceBounds()
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const pos = this.isoToScreen(cx, cy)

    const table = new Graphics()
    // Mesinha redonda
    table.ellipse(pos.x, pos.y - 8, 12, 6)
    table.fill({ color: 0x6b4e33 })
    table.stroke({ color: 0x4a3521, width: 1 })
    table.rect(pos.x - 1.5, pos.y - 8, 3, 9)
    table.fill({ color: 0x4a3521 })
    // Xícaras
    table.circle(pos.x - 4, pos.y - 10, 2)
    table.fill({ color: 0xe9dcc5 })
    table.circle(pos.x + 4, pos.y - 9, 2)
    table.fill({ color: 0xd8c8ac })
    // Vapor (glow quente)
    table.circle(pos.x, pos.y - 16, 6)
    table.fill({ color: 0xe9b65f, alpha: 0.08 })
    this.staticLayer.addChild(table)

    this.drawPlant(pos.x - 22, pos.y + 2, 0.8)
  }

  private drawIsoWallSegment(
    start: { x: number; y: number },
    end: { x: number; y: number },
    accent: number,
    height = 16
  ) {
    const p1 = this.isoToScreen(start.x, start.y)
    const p2 = this.isoToScreen(end.x, end.y)
    const wall = new Graphics()

    // Corpo da parede
    wall.moveTo(p1.x, p1.y)
    wall.lineTo(p2.x, p2.y)
    wall.lineTo(p2.x, p2.y - height)
    wall.lineTo(p1.x, p1.y - height)
    wall.closePath()
    wall.fill({ color: 0x121b2c, alpha: 0.92 })
    wall.stroke({ color: 0x1e2c44, width: 1, alpha: 0.8 })

    // Borda superior neon na cor do setor
    wall.moveTo(p1.x, p1.y - height)
    wall.lineTo(p2.x, p2.y - height)
    wall.stroke({ color: accent, width: 2, alpha: 0.75 })

    // Halo do neon
    wall.moveTo(p1.x, p1.y - height)
    wall.lineTo(p2.x, p2.y - height)
    wall.stroke({ color: accent, width: 5, alpha: 0.14 })

    this.staticLayer.addChild(wall)
  }

  private renderSectorWalls() {
    const sectorsById = new Map(this.store.sectors.map(s => [s.id, s]))
    const pairs: Array<[string, string, "vertical" | "horizontal"]> = [
      ["engineering", "design", "vertical"],
      ["research", "data", "vertical"],
      ["devops", "growth", "vertical"],
      ["engineering", "research", "horizontal"],
      ["research", "devops", "horizontal"],
      ["design", "data", "horizontal"],
      ["data", "growth", "horizontal"],
    ]

    pairs.forEach(([aId, bId, dir]) => {
      const a = sectorsById.get(aId)
      const b = sectorsById.get(bId)
      if (!a || !b) return
      const accent = hexToNumber(a.color)

      if (dir === "vertical") {
        const wallX = a.zone.x + a.zone.w
        const yStart = Math.max(a.zone.y, b.zone.y)
        const yEnd = Math.min(a.zone.y + a.zone.h, b.zone.y + b.zone.h)
        const gapY = Math.floor((yStart + yEnd) / 2)
        this.drawIsoWallSegment({ x: wallX, y: yStart }, { x: wallX, y: gapY - 1 }, accent)
        this.drawIsoWallSegment({ x: wallX, y: gapY + 1 }, { x: wallX, y: yEnd }, accent)
      } else {
        const wallY = a.zone.y + a.zone.h
        const xStart = Math.max(a.zone.x, b.zone.x)
        const xEnd = Math.min(a.zone.x + a.zone.w, b.zone.x + b.zone.w)
        const gapX = Math.floor((xStart + xEnd) / 2)
        this.drawIsoWallSegment({ x: xStart, y: wallY }, { x: gapX - 1, y: wallY }, accent)
        this.drawIsoWallSegment({ x: gapX + 1, y: wallY }, { x: xEnd, y: wallY }, accent)
      }
    })
  }

  private renderDesks() {
    const desks = this.store.desks
    desks.forEach(desk => {
      const sector = this.store.sectors.find(s => s.id === desk.sectorId)
      if (!sector || !sector.unlocked) return

      const accent = hexToNumber(sector.color)
      const pos = this.isoToScreen(desk.position.x, desk.position.y)
      const container = new Container()
      container.x = pos.x
      container.y = pos.y - 10

      const w = 28
      const h = 18
      const d = 11

      // Cadeira (atrás da mesa)
      const chair = new Graphics()
      chair.ellipse(0, 10, 8, 4)
      chair.fill({ color: 0x1a2537 })
      chair.stroke({ color: 0x27364e, width: 1 })
      container.addChild(chair)

      // Mesa escura
      const deskGraphics = new Graphics()
      // Tampo
      deskGraphics.moveTo(0, -h)
      deskGraphics.lineTo(w, -h / 2)
      deskGraphics.lineTo(0, 0)
      deskGraphics.lineTo(-w, -h / 2)
      deskGraphics.closePath()
      deskGraphics.fill({ color: 0x223048 })
      deskGraphics.stroke({ color: 0x314260, width: 1 })
      // Lado direito
      deskGraphics.moveTo(0, 0)
      deskGraphics.lineTo(w, -h / 2)
      deskGraphics.lineTo(w, -h / 2 + d)
      deskGraphics.lineTo(0, d)
      deskGraphics.closePath()
      deskGraphics.fill({ color: 0x18233a })
      // Lado esquerdo
      deskGraphics.moveTo(0, 0)
      deskGraphics.lineTo(-w, -h / 2)
      deskGraphics.lineTo(-w, -h / 2 + d)
      deskGraphics.lineTo(0, d)
      deskGraphics.closePath()
      deskGraphics.fill({ color: 0x121b2e })
      container.addChild(deskGraphics)

      // Monitor com tela acesa na cor do setor
      const monitor = new Graphics()
      const mw = 13
      const mh = 10
      // Halo da tela
      monitor.moveTo(0, -h - 6)
      monitor.lineTo(mw + 4, -h - 6 + (mh + 4) / 2)
      monitor.lineTo(0, -h - 6 + mh + 4)
      monitor.lineTo(-mw - 4, -h - 6 + (mh + 4) / 2)
      monitor.closePath()
      monitor.fill({ color: accent, alpha: 0.14 })
      // Moldura
      monitor.moveTo(0, -h - 5)
      monitor.lineTo(mw, -h - 5 + mh / 2)
      monitor.lineTo(0, -h - 5 + mh)
      monitor.lineTo(-mw, -h - 5 + mh / 2)
      monitor.closePath()
      monitor.fill({ color: 0x0b1220 })
      monitor.stroke({ color: 0x2b3b58, width: 1 })
      // Tela
      monitor.moveTo(0, -h - 3.5)
      monitor.lineTo(mw - 3, -h - 3.5 + (mh - 3) / 2)
      monitor.lineTo(0, -h - 3.5 + mh - 3)
      monitor.lineTo(-mw + 3, -h - 3.5 + (mh - 3) / 2)
      monitor.closePath()
      monitor.fill({ color: shade(accent, 0.55), alpha: 0.9 })
      // "Linhas de código" na tela
      monitor.moveTo(-5, -h - 1)
      monitor.lineTo(4, -h + 1)
      monitor.stroke({ color: shade(accent, 1.4), width: 1, alpha: 0.8 })
      monitor.moveTo(-4, -h + 1.5)
      monitor.lineTo(2, -h + 3)
      monitor.stroke({ color: shade(accent, 1.4), width: 1, alpha: 0.5 })
      container.addChild(monitor)

      // Teclado
      const keyboard = new Graphics()
      keyboard.moveTo(2, -h + 7)
      keyboard.lineTo(10, -h + 9)
      keyboard.lineTo(4, -h + 12)
      keyboard.lineTo(-4, -h + 10)
      keyboard.closePath()
      keyboard.fill({ color: 0x0e1626 })
      keyboard.stroke({ color: 0x27364e, width: 0.8 })
      container.addChild(keyboard)

      // Luminária de mesa com luz quente
      if (desk.upgrades.lamp) {
        const lamp = new Graphics()
        lamp.moveTo(-w + 7, -h + 2)
        lamp.lineTo(-w + 7, -h - 12)
        lamp.stroke({ color: 0x33455f, width: 2 })
        lamp.moveTo(-w + 7, -h - 12)
        lamp.lineTo(-w + 13, -h - 15)
        lamp.lineTo(-w + 3, -h - 15)
        lamp.closePath()
        lamp.fill({ color: 0x24344c })
        // Glow quente
        lamp.circle(-w + 8, -h - 10, 7)
        lamp.fill({ color: 0xe9b65f, alpha: 0.14 })
        lamp.circle(-w + 8, -h - 12, 2)
        lamp.fill({ color: 0xffd894, alpha: 0.9 })
        container.addChild(lamp)
      }

      // Plantinha de mesa
      if (desk.upgrades.plant) {
        const plant = new Graphics()
        plant.rect(w - 10, d - 9, 5, 4)
        plant.fill({ color: 0x7c5a3a })
        plant.circle(w - 8, d - 11, 3.5)
        plant.fill({ color: 0x37b566 })
        plant.circle(w - 6, d - 13, 2.5)
        plant.fill({ color: 0x45c974 })
        container.addChild(plant)
      }

      // Destaque de seleção
      if (this.store.selectedDeskId === desk.id) {
        const highlight = new Graphics()
        highlight.moveTo(0, -h - 20)
        highlight.lineTo(w + 5, -h / 2 - 10)
        highlight.lineTo(0, d + 5)
        highlight.lineTo(-w - 5, -h / 2 - 10)
        highlight.closePath()
        highlight.stroke({ color: 0xe9b65f, width: 2 })
        container.addChild(highlight)
      }

      container.eventMode = "static"
      container.cursor = "pointer"
      container.on("pointerdown", () => {
        this.store.selectDesk(desk.id)
      })

      this.staticLayer.addChild(container)
    })
  }

  private renderAgents() {
    this.dynamicLayer.removeChildren()
    this.agents.clear()
    const agents = this.store.agents
    agents.forEach(agent => {
      const accent = hexToNumber(agent.color)
      const pos = this.isoToScreen(agent.position.x, agent.position.y)
      const container = new Container()
      container.x = pos.x
      container.y = pos.y - 38

      // Sombra
      const shadow = new Graphics()
      shadow.ellipse(0, 34, 14, 5)
      shadow.fill({ color: 0x000000, alpha: 0.3 })
      container.addChild(shadow)

      // Corpo do robô na cor do setor
      const body = new Graphics()
      body.roundRect(-13, 2, 26, 22, 8)
      body.fill({ color: shade(accent, 0.5) })
      body.stroke({ color: accent, width: 1.5, alpha: 0.9 })
      // Painel do peito
      body.roundRect(-6, 8, 12, 9, 3)
      body.fill({ color: 0x0b1220, alpha: 0.85 })
      body.circle(0, 12.5, 2)
      body.fill({ color: accent, alpha: 0.95 })
      container.addChild(body)

      // Braços
      const arms = new Graphics()
      arms.roundRect(-17, 6, 4, 12, 2)
      arms.fill({ color: shade(accent, 0.38) })
      arms.roundRect(13, 6, 4, 12, 2)
      arms.fill({ color: shade(accent, 0.38) })
      container.addChild(arms)

      // Cabeça
      const head = new Graphics()
      head.roundRect(-11, -14, 22, 17, 7)
      head.fill({ color: 0x141c2e })
      head.stroke({ color: shade(accent, 0.8), width: 1.5 })
      // Visor
      head.roundRect(-8, -11, 16, 10, 4)
      head.fill({ color: 0x080d18 })
      container.addChild(head)

      // Olhos acesos
      const eyes = new Graphics()
      const working = agent.spriteState === "working"
      const eyeColor = working ? 0xffd894 : shade(accent, 1.35)
      eyes.roundRect(-5.5, -8.5, 4, working ? 2.4 : 4, 1.5)
      eyes.fill({ color: eyeColor })
      eyes.roundRect(1.5, -8.5, 4, working ? 2.4 : 4, 1.5)
      eyes.fill({ color: eyeColor })
      container.addChild(eyes)

      // Antena com ponta acesa
      const antenna = new Graphics()
      antenna.moveTo(0, -14)
      antenna.lineTo(0, -20)
      antenna.stroke({ color: shade(accent, 0.7), width: 1.5 })
      antenna.circle(0, -21.5, 2.2)
      antenna.fill({ color: working ? 0xe9b65f : accent })
      antenna.circle(0, -21.5, 4.5)
      antenna.fill({ color: working ? 0xe9b65f : accent, alpha: 0.22 })
      container.addChild(antenna)

      // Placa de nome
      const nameStyle = new TextStyle({
        fontFamily: "Inter",
        fontSize: 9,
        fill: 0xffffff,
        fontWeight: "bold",
      })
      const nameText = new Text({ text: agent.name, style: nameStyle })
      nameText.anchor.set(0.5)
      nameText.y = -32
      const plate = new Graphics()
      const plateW = Math.max(34, nameText.width + 12)
      plate.roundRect(-plateW / 2, -39, plateW, 13, 6)
      plate.fill({ color: 0x0d1522, alpha: 0.88 })
      plate.stroke({ color: accent, width: 1, alpha: 0.45 })
      container.addChild(plate)
      container.addChild(nameText)

      // Nome do modelo embaixo
      const modelStyle = new TextStyle({
        fontFamily: "Inter",
        fontSize: 7,
        fill: agent.color,
        fontWeight: "bold",
      })
      const modelText = new Text({ text: agent.model.split("/").pop()?.slice(0, 24) || "", style: modelStyle })
      modelText.anchor.set(0.5)
      modelText.y = 28
      modelText.alpha = 0.85
      container.addChild(modelText)

      // Seleção
      if (this.store.selectedAgentId === agent.id) {
        const highlight = new Graphics()
        highlight.ellipse(0, 34, 18, 7)
        highlight.stroke({ color: 0xe9b65f, width: 2, alpha: 0.95 })
        container.addChild(highlight)
      }

      container.eventMode = "static"
      container.cursor = "pointer"
      container.on("pointerdown", () => {
        this.store.selectAgent(agent.id)
      })

      this.dynamicLayer.addChild(container)
      this.agents.set(agent.id, container)
    })
  }

  private renderLighting() {
    const overlayColor = 0x0a0f1c
    const alpha = this.store.layoutMode === "compact" ? 0.1 : 0.14
    this.lightingLayer.clear()
    this.lightingLayer.rect(-2000, -2000, 4000, 4000)
    this.lightingLayer.fill({ color: overlayColor, alpha })
  }

  private centerScene() {
    const { minX, minY, maxX, maxY } = this.getWorkspaceBounds()
    const center = this.isoToScreen((minX + maxX) / 2, (minY + maxY) / 2)
    this.scene.scale.set(this.store.layoutMode === "compact" ? 1.07 : 0.92)
    this.scene.x = this.app.renderer.width / 2 - center.x * this.scene.scale.x
    this.scene.y = this.app.renderer.height / 2 - center.y * this.scene.scale.y
  }

  private onPointerDown = (e: PointerEvent) => {
    this.isDragging = true
    this.lastPointer = { x: e.clientX, y: e.clientY }
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return
    const dx = e.clientX - this.lastPointer.x
    const dy = e.clientY - this.lastPointer.y
    this.scene.x += dx
    this.scene.y += dy
    this.scene.x = Math.max(-400, Math.min(this.scene.x, this.app.renderer.width + 400))
    this.scene.y = Math.max(-280, Math.min(this.scene.y, this.app.renderer.height + 280))
    this.lastPointer = { x: e.clientX, y: e.clientY }
  }

  private onPointerUp = () => {
    this.isDragging = false
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const scaleFactor = e.deltaY > 0 ? 0.92 : 1.08
    const newScale = Math.max(0.78, Math.min(1.2, this.scene.scale.x * scaleFactor))
    this.scene.scale.set(newScale)
  }

  private bindInteractions() {
    if (this.listenersBound) return
    this.listenersBound = true
    this.app.canvas.addEventListener("pointerdown", this.onPointerDown)
    this.app.canvas.addEventListener("pointermove", this.onPointerMove)
    this.app.canvas.addEventListener("pointerup", this.onPointerUp)
    this.app.canvas.addEventListener("pointerleave", this.onPointerUp)
    this.app.canvas.addEventListener("wheel", this.onWheel, { passive: false })
  }

  private animateAgents() {
    const t = performance.now() * 0.001
    this.store.agents.forEach((agent) => {
      const container = this.agents.get(agent.id)
      if (!container) return
      const pos = this.isoToScreen(agent.position.x, agent.position.y)
      const bob = agent.spriteState === "working" ? Math.sin(t * 5 + pos.x * 0.02) * 1.7 : Math.sin(t * 2 + pos.x * 0.01) * 0.8
      container.y = pos.y - 38 + bob
    })
  }

  update() {
    const currentStore = useGameStore.getState()
    this.store = currentStore

    const nextLayoutSignature = this.buildLayoutSignature()
    const nextAgentSignature = this.buildAgentSignature()

    if (nextLayoutSignature !== this.lastLayoutSignature) {
      this.render(true)
      return
    }
    if (nextAgentSignature !== this.lastAgentVisualSignature) {
      this.render(false)
      return
    }

    this.animateAgents()
    this.renderLighting()
  }

  destroy() {
    if (this.listenersBound) {
      this.app.canvas.removeEventListener("pointerdown", this.onPointerDown)
      this.app.canvas.removeEventListener("pointermove", this.onPointerMove)
      this.app.canvas.removeEventListener("pointerup", this.onPointerUp)
      this.app.canvas.removeEventListener("pointerleave", this.onPointerUp)
      this.app.canvas.removeEventListener("wheel", this.onWheel)
      this.listenersBound = false
    }
  }
}
