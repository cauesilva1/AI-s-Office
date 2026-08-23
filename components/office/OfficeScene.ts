"use client"

import { Application, Container, Graphics, Text, TextStyle } from "pixi.js"
import { useGameStore } from "@/store/gameStore"
import { TILE_WIDTH, TILE_HEIGHT } from "@/lib/game/constants"

export class OfficeScene {
  private app: Application
  private scene: Container
  private store: ReturnType<typeof useGameStore.getState>
  private agents: Map<string, Container> = new Map()
  private lightingLayer: Graphics
  private staticLayer: Container
  private dynamicLayer: Container
  private selectedId: string | null = null
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
    this.renderSectors()
    this.renderSectorWalls()
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
        grid.fill({ color: isEven ? 0x24363d : 0x1f3037, alpha: 0.72 })
        grid.stroke({ color: 0x0b1116, width: 0.5, alpha: 0.18 })
      }
    }
    this.staticLayer.addChild(grid)
  }

  private renderSectors() {
    const sectors = this.store.sectors
    sectors.forEach(sector => {
      if (!sector.unlocked) return

      const zone = sector.zone
      const graphics = new Graphics()

      const topLeft = this.isoToScreen(zone.x, zone.y)
      const topRight = this.isoToScreen(zone.x + zone.w, zone.y)
      const bottomRight = this.isoToScreen(zone.x + zone.w, zone.y + zone.h)
      const bottomLeft = this.isoToScreen(zone.x, zone.y + zone.h)

      graphics.moveTo(topLeft.x, topLeft.y - TILE_HEIGHT / 2)
      graphics.lineTo(topRight.x, topRight.y - TILE_HEIGHT / 2)
      graphics.lineTo(bottomRight.x, bottomRight.y + TILE_HEIGHT / 2)
      graphics.lineTo(bottomLeft.x, bottomLeft.y + TILE_HEIGHT / 2)
      graphics.closePath()

      const color = parseInt(sector.color.replace("#", ""), 16)
      graphics.fill({ color, alpha: 0.08 })
      graphics.stroke({ color, width: 2, alpha: 0.4 })

      const labelStyle = new TextStyle({
        fontFamily: "Inter",
        fontSize: 12,
        fill: sector.color,
        fontWeight: "bold",
        letterSpacing: 1,
      })
      const center = this.isoToScreen(zone.x + zone.w / 2, zone.y + zone.h / 2)
      const label = new Text({ text: sector.name.toUpperCase(), style: labelStyle })
      label.anchor.set(0.5)
      label.x = center.x
      label.y = center.y - 20
      label.alpha = 0.7

      this.staticLayer.addChild(graphics)
      this.staticLayer.addChild(label)
    })
  }

  private drawIsoWallSegment(start: { x: number; y: number }, end: { x: number; y: number }, height = 18) {
    const p1 = this.isoToScreen(start.x, start.y)
    const p2 = this.isoToScreen(end.x, end.y)
    const wall = new Graphics()

    wall.moveTo(p1.x, p1.y)
    wall.lineTo(p2.x, p2.y)
    wall.lineTo(p2.x, p2.y - height)
    wall.lineTo(p1.x, p1.y - height)
    wall.closePath()
    wall.fill({ color: 0x1f3224, alpha: 0.7 })
    wall.stroke({ color: 0x2d4d36, width: 1, alpha: 0.8 })

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

      if (dir === "vertical") {
        const wallX = a.zone.x + a.zone.w
        const yStart = Math.max(a.zone.y, b.zone.y)
        const yEnd = Math.min(a.zone.y + a.zone.h, b.zone.y + b.zone.h)
        const gapY = Math.floor((yStart + yEnd) / 2)
        this.drawIsoWallSegment({ x: wallX, y: yStart }, { x: wallX, y: gapY - 1 })
        this.drawIsoWallSegment({ x: wallX, y: gapY + 1 }, { x: wallX, y: yEnd })
      } else {
        const wallY = a.zone.y + a.zone.h
        const xStart = Math.max(a.zone.x, b.zone.x)
        const xEnd = Math.min(a.zone.x + a.zone.w, b.zone.x + b.zone.w)
        const gapX = Math.floor((xStart + xEnd) / 2)
        this.drawIsoWallSegment({ x: xStart, y: wallY }, { x: gapX - 1, y: wallY })
        this.drawIsoWallSegment({ x: gapX + 1, y: wallY }, { x: xEnd, y: wallY })
      }
    })
  }

  private renderDesks() {
    const desks = this.store.desks
    desks.forEach(desk => {
      const sector = this.store.sectors.find(s => s.id === desk.sectorId)
      if (!sector || !sector.unlocked) return

      const pos = this.isoToScreen(desk.position.x, desk.position.y)
      const container = new Container()
      container.x = pos.x
      container.y = pos.y - 10

      // Desk base
      const deskGraphics = new Graphics()
      const w = 30
      const h = 20
      const d = 12

      // Top
      deskGraphics.moveTo(0, -h)
      deskGraphics.lineTo(w, -h / 2)
      deskGraphics.lineTo(0, 0)
      deskGraphics.lineTo(-w, -h / 2)
      deskGraphics.closePath()
      deskGraphics.fill({ color: 0xf7f1de })
      deskGraphics.stroke({ color: 0xc9bc90, width: 1 })

      // Right side
      deskGraphics.moveTo(0, 0)
      deskGraphics.lineTo(w, -h / 2)
      deskGraphics.lineTo(w, -h / 2 + d)
      deskGraphics.lineTo(0, d)
      deskGraphics.closePath()
      deskGraphics.fill({ color: 0xe2d7b2 })

      // Left side
      deskGraphics.moveTo(0, 0)
      deskGraphics.lineTo(-w, -h / 2)
      deskGraphics.lineTo(-w, -h / 2 + d)
      deskGraphics.lineTo(0, d)
      deskGraphics.closePath()
      deskGraphics.fill({ color: 0xc9bc90 })

      container.addChild(deskGraphics)

      // Monitor
      if (desk.upgrades.monitor > 0) {
        const monitor = new Graphics()
        const mw = 10 + desk.upgrades.monitor * 3
        const mh = 8 + desk.upgrades.monitor * 2

        monitor.moveTo(0, -h - 4)
        monitor.lineTo(mw, -h - 4 + mh / 2)
        monitor.lineTo(0, -h - 4 + mh)
        monitor.lineTo(-mw, -h - 4 + mh / 2)
        monitor.closePath()

        const monitorColor = desk.upgrades.monitor === 3 ? 0x34d399 : 0x2dd4bf
        monitor.fill({ color: monitorColor, alpha: 0.9 })
        monitor.stroke({ color: 0x1c2e21, width: 1 })

        // Glow effect for level 3
        if (desk.upgrades.monitor === 3) {
          const glow = new Graphics()
          glow.moveTo(0, -h - 4)
          glow.lineTo(mw + 4, -h - 4 + mh / 2)
          glow.lineTo(0, -h - 4 + mh + 4)
          glow.lineTo(-mw - 4, -h - 4 + mh / 2)
          glow.closePath()
          glow.fill({ color: 0x34d399, alpha: 0.2 })
          container.addChild(glow)
        }

        container.addChild(monitor)
      }

      // Lamp
      if (desk.upgrades.lamp) {
        const lamp = new Graphics()
        lamp.moveTo(-w + 5, -h + 2)
        lamp.lineTo(-w + 5, -h - 15)
        lamp.stroke({ color: 0x132018, width: 2 })

        const lampHead = new Graphics()
        lampHead.moveTo(-w + 5, -h - 15)
        lampHead.lineTo(-w + 12, -h - 18)
        lampHead.lineTo(-w + 2, -h - 18)
        lampHead.closePath()
        lampHead.fill({ color: 0x182a1b })

        container.addChild(lamp)
        container.addChild(lampHead)
      }

      // Plant
      if (desk.upgrades.plant) {
        const plant = new Graphics()
        plant.circle(w - 8, d - 5, 4)
        plant.fill({ color: 0x4ade80 })
        plant.circle(w - 6, d - 8, 3)
        plant.fill({ color: 0x22c55e })
        container.addChild(plant)
      }

      // Selection highlight
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
      const pos = this.isoToScreen(agent.position.x, agent.position.y)
      const container = new Container()
      container.x = pos.x
      container.y = pos.y - 35

      // Shadow
      const shadow = new Graphics()
      shadow.ellipse(0, 30, 12, 4)
      shadow.fill({ color: 0x000000, alpha: 0.2 })
      container.addChild(shadow)

      // Body
      const body = new Graphics()
      body.roundRect(-12, 0, 24, 20, 6)
      body.fill({ color: 0xf2ecda })
      body.stroke({ color: 0xe4dab8, width: 1 })
      container.addChild(body)

      // Head
      const head = new Graphics()
      head.circle(0, -8, 10)
      head.fill({ color: 0x2a231b })
      head.stroke({ color: 0x14100b, width: 1 })
      container.addChild(head)

      // Eyes (simple dots)
      const eye1 = new Graphics()
      eye1.circle(-3, -9, 1.5)
      eye1.fill({ color: 0xffffff })
      const eye2 = new Graphics()
      eye2.circle(3, -9, 1.5)
      eye2.fill({ color: 0xffffff })
      container.addChild(eye1)
      container.addChild(eye2)

      // Indicador de status: âmbar = IA processando, verde = disponível
      const statusColor = agent.spriteState === "working" ? 0xe9b65f : 0x34d399

      const status = new Graphics()
      status.circle(10, -15, 3)
      status.fill({ color: statusColor })
      status.stroke({ color: 0xffffff, width: 1 })
      container.addChild(status)

      // Name badge
      const nameStyle = new TextStyle({
        fontFamily: "Inter",
        fontSize: 9,
        fill: 0xffffff,
        fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 2, distance: 1, angle: Math.PI / 4 },
      })
      const nameText = new Text({ text: agent.name.split(" ")[0], style: nameStyle })
      nameText.anchor.set(0.5)
      nameText.y = -28
      container.addChild(nameText)

      // Nome do modelo embaixo do agente
      const modelStyle = new TextStyle({
        fontFamily: "Inter",
        fontSize: 7,
        fill: agent.color,
        fontWeight: "bold",
      })
      const modelText = new Text({ text: agent.model.split("/").pop()?.slice(0, 22) || "", style: modelStyle })
      modelText.anchor.set(0.5)
      modelText.y = 24
      container.addChild(modelText)

      // Selection
      if (this.store.selectedAgentId === agent.id) {
        const highlight = new Graphics()
        highlight.moveTo(0, -20)
        highlight.lineTo(18, -5)
        highlight.lineTo(0, 35)
        highlight.lineTo(-18, -5)
        highlight.closePath()
        highlight.stroke({ color: 0xe9b65f, width: 2 })
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
    const overlayColor = 0x121723
    const alpha = this.store.layoutMode === "compact" ? 0.16 : 0.2
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
      container.y = pos.y - 35 + bob
    })
  }

  update() {
    const currentStore = useGameStore.getState()
    const nextLayoutSignature = JSON.stringify({
      layout: currentStore.layoutMode,
      selectedDeskId: currentStore.selectedDeskId,
      sectors: currentStore.sectors.map((s) => ({ id: s.id, zone: s.zone })),
      desks: currentStore.desks.map((d) => ({ id: d.id, p: d.position, agentId: d.agentId })),
    })
    const nextAgentSignature = JSON.stringify({
      selectedAgentId: currentStore.selectedAgentId,
      agents: currentStore.agents.map((a) => ({
        id: a.id,
        position: a.position,
        spriteState: a.spriteState,
        model: a.model,
        name: a.name,
      })),
    })

    this.store = currentStore

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
