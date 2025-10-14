'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

type Slice = { label:string }
export default function Wheel({ slices, spinning, durationMs }:{ slices:Slice[], spinning:boolean, durationMs:number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [angle, setAngle] = useState(0)

  // simple fake spin visual
  useEffect(()=>{
    if (!spinning) return
    const start = performance.now()
    const total = durationMs
    let raf:number
    const tick = (t:number)=>{
      const p = Math.min(1,(t-start)/total)
      const speed = (1 - p) * 20 // decelerate
      setAngle(a=>a + speed)
      raf = requestAnimationFrame(tick)
      if (p>=1) cancelAnimationFrame(raf)
    }
    raf = requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(raf)
  },[spinning,durationMs])

  // draw
  useEffect(()=>{
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const W = (c.width = 360)
    const H = (c.height = 360)
    const r = W/2 - 6
    ctx.clearRect(0,0,W,H)
    ctx.save()
    ctx.translate(W/2,H/2)
    ctx.rotate(angle * Math.PI/180)
    const n = slices.length || 12
    for (let i=0;i<n;i++){
      const a0 = (i/n)*Math.PI*2
      const a1 = ((i+1)/n)*Math.PI*2
      ctx.beginPath()
      ctx.moveTo(0,0)
      ctx.arc(0,0,r,a0,a1)
      ctx.closePath()
      ctx.fillStyle = i%2? '#1e293b' : '#0f172a'
      ctx.fill()
      ctx.strokeStyle = '#111827'
      ctx.stroke()
      // label
      ctx.save()
      ctx.rotate((a0+a1)/2)
      ctx.translate(r*0.7,0)
      ctx.rotate(Math.PI/2)
      ctx.fillStyle = '#e5e7eb'
      ctx.font = '12px ui-sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(slices[i]?.label ?? '', 0, 0, 120)
      ctx.restore()
    }
    ctx.restore()
    // pointer
    ctx.beginPath()
    ctx.moveTo(W/2, 8)
    ctx.lineTo(W/2-10, 28)
    ctx.lineTo(W/2+10, 28)
    ctx.closePath()
    ctx.fillStyle = '#ef4444'
    ctx.fill()
  },[slices, angle])

  const style:React.CSSProperties = { display:'block', margin:'0 auto' }
  return <canvas ref={canvasRef} width={360} height={360} style={style} />
}