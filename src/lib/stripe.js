import Stripe from 'stripe';

let stripe = null;

export function getStripe() {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured.');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
    });
  }
  return stripe;
}
