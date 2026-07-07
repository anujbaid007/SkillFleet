'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { GraduationCap, Heart } from 'lucide-react'

export default function SignupPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
    >
      <h1 className="font-display text-2xl font-bold text-foreground mb-2 text-center">
        Join SkillFleet
      </h1>
      <p className="text-muted text-sm mb-8 text-center">Who are you signing up as?</p>

      <div className="grid grid-cols-1 gap-4">
        <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Link
            href="/signup/student"
            className="clay-card p-6 flex items-center gap-4 hover:border-primary/30 transition-colors block"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-foreground text-lg">Student</h2>
              <p className="text-muted text-sm">Ages 13–18 with their own email</p>
            </div>
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Link
            href="/signup/parent"
            className="clay-card p-6 flex items-center gap-4 hover:border-primary/30 transition-colors block"
          >
            <div className="w-12 h-12 rounded-2xl bg-accent-teal/10 flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-accent-teal" />
            </div>
            <div>
              <h2 className="font-display font-bold text-foreground text-lg">Parent / Guardian</h2>
              <p className="text-muted text-sm">Enroll and track your child&apos;s growth</p>
            </div>
          </Link>
        </motion.div>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}
