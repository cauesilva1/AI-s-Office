"use client"

import { Application, Container, Graphics, Text, TextStyle, Sprite, FederatedPointerEvent } from "pixi.js"
import { useGameStore } from "@/store/gameStore"
import { TILE_WIDTH, TILE_HEIGHT, COLORS, SECTORS } from "@/lib/game/constants"
import { Agent, Desk, Sector } from "@/lib/game/types"

const ISO_ANGLE = 0.463647609 // atan(0.5)

export class OfficeScene {
  private app: Application
  private scene: Container
  private store: ReturnType<typeof useGameStore.getState>
  private tiles: Map<string, Graphics> = new Map()
  private agents: Map<string, Container> = new Map()
  private desks: Map<string, Container> = new Map()
  private effects: Container
  private lighting: Graphics
  private timeOfDay = 0
  private selectedId: string | null = null

  constructor(app: Application, scene: Container) {
    this.app = app
    this.scene = scene
    this.store = useGameStore.getState()
    this.effects = new Container()
    this.lighting = new Graphics()
    scene.addChild(this.effects)
    scene.addChild(this.lighting)
    this.render()
  }

  private isoToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - y) * TILE_WIDTH * 0.5,
      y: (x + y) * TILE_HEIGHT * 0.5,
    }
  }

  private screenToIso(screenX: number, screenY: number): { x: number; y: number } {
    const x = (screenX / (TILE_WIDTH * 0.5) + screenY / (TILE_HEIGHT * 0.5)) / 2
    const y = (screenY / (TILE_HEIGHT * 0.5) - screenX / (TILE_WIDTH * 0.5)) / 2
    return { x: Math.round(x), y: Math.round(y) }
  }

  render() {
    this.scene.removeChildren()
    this.tiles.clear()
    this.agents.clear()
    this.desks.clear()

    this.effects = new Container()
    this.lighting = new Graphics()
    this.scene.addChild(this.effects)
    this.scene.addChild(this.lighting)

    this.renderGrid()
    this.renderSectors()
    this.renderDesks()
    this.renderCoffeeArea()
    this.renderAgents()
    this.renderLighting()
    this.setupInteraction()
  }

  private renderGrid() {
    const grid = new Container()
    const cols = 24
    const rows = 24

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const pos = this.isoToScreen(x, y)
        const tile = new Graphics()

        tile.moveTo(0, -TILE_HEIGHT / 2)
        tile.lineTo(TILE_WIDTH / 2, 0)
        tile.lineTo(0, TILE_HEIGHT / 2)
        tile.lineTo(-TILE_WIDTH / 2, 0)
        tile.closePath()

        const isEven = (x + y) % 2 === 0
        tile.fill({ color: isEven ? 0xc3d2a4 : 0xaec18b, alpha: 0.6 })
        tile.stroke({ color: 0x152018, width: 0.5, alpha: 0.15 })

        tile.x = pos.x
        tile.y = pos.y
        tile.eventMode = "static"
        tile.cursor = "pointer"

        grid.addChild(tile)
        this.tiles.set(`${x},${y}`, tile)
      }
    }
    this.scene.addChild(grid)
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

      this.scene.addChild(graphics)
      this.scene.addChild(label)
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

      this.scene.addChild(container)
      this.desks.set(desk.id, container)
    })
  }

  private renderCoffeeArea() {
    const pos = this.isoToScreen(12, 12)
    const container = new Container()
    container.x = pos.x
    container.y = pos.y

    // Table
    const table = new Graphics()
    table.ellipse(0, 0, 25, 12)
    table.fill({ color: 0xf9f3e0 })
    table.stroke({ color: 0xded2a9, width: 1 })

    // Leg
    const leg = new Graphics()
    leg.moveTo(0, 0)
    leg.lineTo(0, 15)
    leg.stroke({ color: 0x243a29, width: 3 })

    // Coffee cup
    const cup = new Graphics()
    cup.moveTo(-8, -5)
    cup.lineTo(8, -5)
    cup.lineTo(6, 5)
    cup.lineTo(-6, 5)
    cup.closePath()
    cup.fill({ color: 0xe8c78c })

    container.addChild(leg)
    container.addChild(table)
    container.addChild(cup)

    // Steam particles
    for (let i = 0; i < 3; i++) {
      const steam = new Graphics()
      steam.circle(-5 + i * 5, -12 - i * 3, 2)
      steam.fill({ color: 0xffffff, alpha: 0.3 })
      container.addChild(steam)
    }

    this.scene.addChild(container)
  }

  private renderAgents() {
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

      // Animation: bobbing
      let time = 0
      const tick = () => {
        time += 0.03
        const bob = agent.spriteState === "working" ? Math.sin(time * 2) * 1.5 : Math.sin(time) * 1
        container.y = pos.y - 35 + bob
      }
      this.app.ticker.add(tick)

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

      this.scene.addChild(container)
      this.agents.set(agent.id, container)
    })
  }

  private renderLighting() {
    const hour = this.store.hour
    let overlayColor = 0x000000
    let alpha = 0

    if (hour >= 6 && hour < 18) {
      // Day
      overlayColor = 0xfff4d6
      alpha = 0.05
    } else if (hour >= 18 && hour < 22) {
      // Sunset
      overlayColor = 0xff9966
      alpha = 0.15
    } else {
      // Night
      overlayColor = 0x1a237e
      alpha = 0.35
    }

    this.lighting.clear()
    this.lighting.rect(-2000, -2000, 4000, 4000)
    this.lighting.fill({ color: overlayColor, alpha })
  }

  private setupInteraction() {
    // Pan with drag
    let isDragging = false
    let lastPos = { x: 0, y: 0 }

    this.app.canvas.addEventListener("pointerdown", (e) => {
      isDragging = true
      lastPos = { x: e.clientX, y: e.clientY }
    })

    this.app.canvas.addEventListener("pointermove", (e) => {
      if (!isDragging) return
      const dx = e.clientX - lastPos.x
      const dy = e.clientY - lastPos.y
      this.scene.x += dx
      this.scene.y += dy
      lastPos = { x: e.clientX, y: e.clientY }
    })

    this.app.canvas.addEventListener("pointerup", () => {
      isDragging = false
    })

    // Zoom with wheel
    this.app.canvas.addEventListener("wheel", (e) => {
      e.preventDefault()
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.5, Math.min(2, this.scene.scale.x * scaleFactor))
      this.scene.scale.set(newScale)
    })
  }

  update() {
    const currentStore = useGameStore.getState()
    if (currentStore.selectedDeskId !== this.selectedId) {
      this.selectedId = currentStore.selectedDeskId
      this.render()
      return
    }
    if (currentStore.selectedAgentId !== this.store.selectedAgentId) {
      this.store = currentStore
      this.render()
      return
    }
    this.renderLighting()
  }

  destroy() {
    this.app.ticker.stop()
  }
}
