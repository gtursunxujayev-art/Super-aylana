// components/WinModal.tsx
'use client'
import React from 'react'

type Props = {
  open: boolean
  onClose: () => void
  username?: string
  title?: string
  imageUrl?: string | null
}

export default function WinModal({ open, onClose, username, title, imageUrl }: Props) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
        display: 'grid', placeItems: 'center', zIndex: 1000
      }}
    >
      <div
        onClick={(e)=>e.stopPropagation()}
        style={{
          width: 'min(92vw, 520px)',
          background: '#0b1220',
          border: '1px solid #1f2937',
          borderRadius: 16,
          overflow: 'hidden',
          color: '#e5e7eb',
          boxShadow: '0 20px 60px rgba(0,0,0,.5)'
        }}
      >
        {imageUrl ? (
          <div style={{ width: '100%', aspectRatio: '16/9', background:'#0b1220' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          </div>
        ) : null}
        <div style={{ padding: 18 }}>
          <h3 style={{ margin: '0 0 8px' }}>{username} siz <b>{title}</b> yutib oldingiz 🎉</h3>
          <button onClick={onClose}
                  style={{ padding:'10px 14px', borderRadius:10, border:'1px solid #374151', background:'#111827', color:'#e5e7eb' }}>
            Yopish
          </button>
        </div>
      </div>
    </div>
  )
}
