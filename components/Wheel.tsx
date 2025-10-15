// components/Wheel.tsx
'use client'
import React from 'react'

type Slice = { label: string }
type Props = {
  size?: number
  labels: string[]
  spinning: boolean
  angle: number
}

export default function Wheel({ size = 320, labels, spinning, angle }: Props) {
  const radius = size / 2
  const N = Math.max(1, labels.length)
  const step = (2 * Math.PI) / N

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        margin: '0 auto',
        transform: `rotate(${angle}deg)`,
        transition: spinning ? 'transform 3.2s cubic-bezier(.15,.8,.2,1)' : 'none',
        boxShadow: '0 0 0 6px #0b1220, 0 10px 30px rgba(0,0,0,.5)',
        background: '#ffffff',
        overflow: 'hidden',
      }}
      aria-label="Aylana"
    >
      {/* pointer */}
      <div
        style={{
          position: 'absolute',
          top: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderBottom: '18px solid #ef4444',
          zIndex: 10,
        }}
      />
      {/* slices */}
      {labels.map((label, i) => {
        const a0 = i * step
        const a1 = a0 + step
        const x0 = radius + radius * Math.cos(a0)
        const y0 = radius + radius * Math.sin(a0)
        const x1 = radius + radius * Math.cos(a1)
        const y1 = radius + radius * Math.sin(a1)
        // alternate light greys for readability on white
        const bg = i % 2 ? '#f3f4f6' : '#e5e7eb'
        return (
          <div key={i} style={{ position: 'absolute', inset: 0 }}>
            <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
              <path
                d={`M ${radius} ${radius} L ${x0} ${y0} A ${radius} ${radius} 0 0 1 ${x1} ${y1} Z`}
                fill={bg}
                stroke="#d1d5db"
                strokeWidth={1}
              />
            </svg>
            {/* label */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transformOrigin: '0 0',
                transform: `rotate(${(a0 + a1) / 2}rad) translate(${radius * 0.58}px, -8px) rotate(90deg)`,
                whiteSpace: 'nowrap',
                fontSize: 14,
                color: '#111827',
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
}
