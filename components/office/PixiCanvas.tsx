"use client"

import { useRef, useEffect } from "react"
import { Application, Container } from "pixi.js"
import { useGameLoop } from "@/hooks/useGameLoop"
import { OfficeScene } from "./OfficeScene"

export default function PixiCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const officeSceneRef = useRef<OfficeScene | null>(null)

  useEffect(() => {
    if (!containerRef.current || appRef.current) return

    let mounted = true
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

      if (!mounted) {
        app.destroy()
        return
      }

      containerRef.current!.appendChild(app.canvas)
      appRef.current = app

      const scene = new Container()
      app.stage.addChild(scene)

      const officeScene = new OfficeScene(app, scene)
      officeSceneRef.current = officeScene

      const handleResize = () => {
        if (!containerRef.current || !appRef.current) return
        appRef.current.renderer.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        )
        officeSceneRef.current?.render(true)
      }

      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }

    init()

    return () => {
      mounted = false
      if (officeSceneRef.current) {
        officeSceneRef.current.destroy()
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true })
        appRef.current = null
      }
    }
  }, [])

  useGameLoop(() => {
    if (officeSceneRef.current) {
      officeSceneRef.current.update()
    }
  })

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full"
      style={{ cursor: "grab" }}
    />
  )
}
