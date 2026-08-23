"use client"

import { useEffect, useRef, useState } from "react"
import { Application, Container, Graphics, Text, TextStyle } from "pixi.js"
import { useGameStore } from "@/store/gameStore"
import { TILE_WIDTH, TILE_HEIGHT, COLORS } from "@/lib/game/constants"

export function usePixiApp(containerRef: React.RefObject<HTMLDivElement | null>) {
  const appRef = useRef<Application | null>(null)
  const sceneRef = useRef<Container | null>(null)
  const [ready, setReady] = useState(false)
  const store = useGameStore()

  useEffect(() => {
    if (!containerRef.current || appRef.current) return

    const init = async () => {
      const app = new Application()
      await app.init({
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        backgroundColor: 0x0c140d,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })

      containerRef.current!.appendChild(app.canvas)
      appRef.current = app

      const scene = new Container()
      app.stage.addChild(scene)
      sceneRef.current = scene

      setReady(true)

      const handleResize = () => {
        if (!containerRef.current || !appRef.current) return
        appRef.current.renderer.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        )
        centerScene()
      }

      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }

    init()

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true })
        appRef.current = null
      }
    }
  }, [containerRef])

  const centerScene = () => {
    if (!appRef.current || !sceneRef.current) return
    const app = appRef.current
    const scene = sceneRef.current
    scene.x = app.screen.width / 2
    scene.y = app.screen.height / 3
  }

  useEffect(() => {
    if (ready) centerScene()
  }, [ready])

  return { app: appRef, scene: sceneRef, ready }
}
