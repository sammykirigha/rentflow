import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

export default getStripe;

// Subscription plans configuration
export const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month' as const,
    features: [
      '1 file upload per question',
      'Basic AI responses',
      'Community support',
      'Limited daily questions',
    ],
    fileUploadLimit: 1,
    hasAiChat: false,
    stripePriceId: null,
    isPopular: false,
  },
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    price: 9.99,
    interval: 'month' as const,
    features: [
      'Unlimited file uploads',
      'AI chat with subject experts',
      'Priority response time',
      'Advanced plagiarism checker',
      'Step-by-step solutions',
      'Expert tutor access',
      'Study planner & reminders',
      'Download solutions as PDF',
    ],
    fileUploadLimit: -1, // unlimited
    hasAiChat: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    isPopular: true,
  },
  {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    price: 99.99,
    interval: 'year' as const,
    features: [
      'Everything in Premium Monthly',
      'Save 17% with yearly billing',
      'Priority customer support',
      'Early access to new features',
    ],
    fileUploadLimit: -1, // unlimited
    hasAiChat: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID,
    isPopular: false,
  },
];

// Helper function to format price
export const formatPrice = (price: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
};

// Helper function to get plan by ID
export const getPlanById = (planId: string) => {
  return subscriptionPlans.find(plan => plan.id === planId);
};

// Helper function to create checkout session
export const createCheckoutSession = async (priceId: string, userId: string) => {
  try {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const { sessionId } = await response.json();
    
    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

   
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Helper function to create customer portal session
export const createCustomerPortalSession = async (customerId: string) => {
  try {
    const response = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create portal session');
    }

    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
};