'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

// The brand's signature purple→teal gradient panel (same as the marketing
// CTAs), with a subtle dot pattern, glow blobs, and one gently floating
// doodle. Used for dashboard heroes so the app opens with the site's energy.
export function GradientCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background:
          'linear-gradient(135deg, #7447E1 0%, #8B5CF6 45%, #9333EA 70%, #14B8A6 100%)',
      }}
    >
      {/* dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />
      {/* glow blobs */}
      <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-white/[0.06] blur-2xl" />
      <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full bg-white/[0.05] blur-2xl" />
      {/* floating star */}
      <motion.svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="absolute top-4 right-6 w-6 h-6 text-white/20 hidden sm:block pointer-events-none"
        animate={{ y: [0, -8, 0], rotate: [0, 12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </motion.svg>

      <div className="relative z-10">{children}</div>
    </div>
  )
}
