'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'

type Slice = { label: string }

export default function Wheel({
  slices,
  spinning,
  durationMs = 4200,
}: {
  slices: Slice[]
  spinning: boolean
  durationMs?: number
}) {
  // Rotation animation state
  const [rot, setRot] = useState(0)
  const prevSpinRef = useRef(false)

  // Degree per slice
  const step = slices.length > 0 ? 360 / Math.max(1, slices.length) : 360

  // Render arcs for slices
  const arcs = useMemo(() => {
    const r = 140 // radius
    const cx = 160
    const cy = 160
    const parts: { d: string; fill: string; rotate: number; label: string }[] = []

    for (let i = 0; i < Math.max(1, slices.length); i++) {
      const start = (i * step * Math.PI) / 180
      const end = ((i + 1) * step * Math.PI) / 180
      const x1 = cx + r * Math.cos(start)
      const y1 = cy + r * Math.sin(start)
      const x2 = cx + r * Math.cos(end)
      const y2 = cy + r * Math.sin(end)
      const largeArc = step > 180 ? 1 : 0
      const d = [
        `M ${cx} ${cy}`,
        `L ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ')
      parts.push({
        d,
        fill: i % 2 ? '#0f172a' : '#111827',
        rotate: i * step + step / 2, // label centered in slice
        label: slices[i]?.label ?? '—',
      })
    }
    return parts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(slices), step])

  // When spinning becomes true, animate to a new angle.
  useEffect(() => {
    if (spinning && !prevSpinRef.current) {
      // total turns + random stop so it looks natural
      const turns = 5 * 360
      const rand = Math.floor(Math.random() * 360)
      // IMPORTANT: start angle is -90 so pointer is at top.
      setRot((v) => v + turns + rand)
    }
    prevSpinRef.current = spinning
  }, [spinning])

  // CSS variables for animation timing
  const style: React.CSSProperties = {
    transform: `rotate(${rot}deg)`,
    transition: `transform ${spinning ? durationMs : 300}ms cubic-bezier(.2,.8,.2,1)`,
    transformOrigin: '160px 160px',
  }

  return (
    <div style={{ width: 320, margin: '0 auto', position: 'relative' }}>
      {/* pointer at TOP */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: -6,
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderBottom: '16px solid #ef4444',
          zIndex: 3,
        }}
      />
      <svg width="320" height="320" viewBox="0 0 320 320">
        {/* subtle rim */}
        <circle cx="160" cy="160" r="150" fill="#0b1220" stroke="#111827" strokeWidth="4" />
        {/* group is offset by -90deg so slice index 0 starts at top */}
        <g style={{ ...style, transform: `rotate(calc(${rot}deg - 90deg))`, transformOrigin: '160px 160px' }}>
          {arcs.map((p, i) => (
            <g key={i}>
              <path d={p.d} fill={p.fill} stroke="#0b1220" />
              {/* labels upright */}
              <text
                x="160"
                y="160"
                fill="#d1d5db"
                fontSize="12"
                textAnchor="middle"
                alignmentBaseline="middle"
                transform={`rotate(${p.rotate - 90},160,160) translate(0,-105)`}
                style={{ pointerEvents: 'none' }}
              >
                {p.label}
              </text>
            </g>
          ))}
        </g>
        {/* hub */}
        <circle cx="160" cy="160" r="10" fill="#0b1220" stroke="#111827" />
      </svg>
    </div>
  )
}
