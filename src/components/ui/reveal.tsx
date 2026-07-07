'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

// Lightweight fade-up reveal for wrapping server-rendered content. Respects
// reduced-motion via motion/react's built-in handling of the OS setting.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 90, damping: 18, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
