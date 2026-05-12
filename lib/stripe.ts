import StripeLib from 'stripe'

export const PLATFORM_FEE_RATE = 0.10
export const CHECKOUT_TTL_SECONDS = 30 * 60
export const STALE_PROCESSING_MINUTES = 5

type StripeInstance = InstanceType<typeof StripeLib>

let _stripe: StripeInstance | undefined

export function getStripe(): StripeInstance {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new StripeLib(key, { apiVersion: '2026-04-22.dahlia' })
  }
  return _stripe
}
