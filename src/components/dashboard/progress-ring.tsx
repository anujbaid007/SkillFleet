'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

// Animated circular progress ring. `gradient` (default) uses the brand
// purple→teal stroke for light backgrounds; `light` uses white strokes so it
// reads on a coloured/gradient hero. The signature "overall growth" element.
export function ProgressRing({
  percent,
  size = 128,
  stroke = 11,
  variant = 'gradient',
  children,
}: {
  percent: number
  size?: number
  stroke?: number
  variant?: 'gradient' | 'light'
  children?: ReactNode
}) {
  const clamped = Math.min(100, Math.max(0, percent))
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - clamped / 100)

  const track = variant === 'light' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)'
  const progressStroke = variant === 'light' ? '#ffffff' : 'url(#growthRingGradient)'

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="growthRingGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7447E1" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={progressStroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: 'spring', stiffness: 40, damping: 16, delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}
