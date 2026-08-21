'use client'

import { useActionState, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { checkoutCartAction } from '@/app/(platform)/cart/actions'
import { splitPayment } from '@/lib/commerce/discount'

function formatPrice(paise: number) {
  return paise === 0 ? 'Free' : `₹${(paise / 100).toLocaleString('en-IN')}`
}

export function CheckoutBar({
  walletBalancePaise,
  totalPaise,
}: {
  walletBalancePaise: number
  totalPaise: number
}) {
  const [state, action, pending] = useActionState(checkoutCartAction, undefined)
  const [useWallet, setUseWallet] = useState(walletBalancePaise > 0)

  const { walletPaise, gatewayPaise } = splitPayment(totalPaise, walletBalancePaise, useWallet)

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="use_wallet" value={useWallet ? '1' : '0'} />

      {walletBalancePaise > 0 && (
        <>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={useWallet}
              onChange={(e) => setUseWallet(e.target.checked)}
              className="w-4 h-4 rounded accent-[color:var(--color-primary)]"
            />
            <span className="text-sm text-foreground">
              Use wallet balance ({formatPrice(walletBalancePaise)})
            </span>
          </label>

          {useWallet && (
            <div className="text-xs text-muted space-y-1 bg-black/[0.03] rounded-xl px-3 py-2">
              <div className="flex justify-between">
                <span>From wallet</span>
                <span className="font-semibold text-foreground">− {formatPrice(walletPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span>To pay now</span>
                <span className="font-semibold text-foreground">{formatPrice(gatewayPaise)}</span>
              </div>
            </div>
          )}
        </>
      )}

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="clay-button bg-cta text-white w-full h-12 font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {pending ? 'Starting checkout…' : `Checkout · ${formatPrice(gatewayPaise)}`}
        {!pending && <ArrowRight className="w-4 h-4" />}
      </button>
    </form>
  )
}
