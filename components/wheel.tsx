'use client'
import { useEffect, useRef, useState } from 'react'

export type WheelSlice = { label: string }

export default function Wheel({
  slices,
  spinning,
  durationMs = 4200,
}: {
  slices: WheelSlice[]
  spinning: boolean
  durationMs?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [angle, setAngle] = useState(0)

  // simple deceleration animation
  useEffect(() => {
    if (!spinning) return
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs)
      const speed = (1 - p) * 22 // start fast → slow
      setAngle((a) => a + speed)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [spinning, durationMs])

  // draw wheel
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const W = (c.width = 360)
    const H = (c.height = 360)
    const r = W / 2 - 6

    ctx.clearRect(0, 0, W, H)
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.rotate((angle * Math.PI) / 180)

    const n = slices.length || 12
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2
      const a1 = ((i + 1) / n) * Math.PI * 2

      // slice
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, r, a0, a1)
      ctx.closePath()
      ctx.fillStyle = i % 2 ? '#18202d' : '#0f172a'
      ctx.fill()
      ctx.strokeStyle = '#0b1220'
      ctx.stroke()

      // label
      ctx.save()
      ctx.rotate((a0 + a1) / 2)
      ctx.translate(r * 0.68, 0)
      ctx.rotate(Math.PI / 2)
      ctx.fillStyle = '#e5e7eb'
      ctx.font = '12px ui-sans-serif, system-ui, -apple-system'
      ctx.textAlign = 'center'
      ctx.fillText(slices[i]?.label ?? '', 0, 0, 130)
      ctx.restore()
    }
    ctx.restore()

    // pointer
    ctx.beginPath()
    ctx.moveTo(W / 2, 8)
    ctx.lineTo(W / 2 - 10, 30)
    ctx.lineTo(W / 2 + 10, 30)
    ctx.closePath()
    ctx.fillStyle = '#ef4444'
    ctx.fill()
  }, [slices, angle])

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={360}
      style={{ display: 'block', margin: '0 auto' }}
    />
  )
}