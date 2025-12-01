import api from './api';

export const billingService = {
  // Get current subscription status and SMS usage
  async getSubscriptionStatus() {
    const response = await api.get('/api/billing/subscription');
    return response.data;
  },

  // Create Stripe checkout session for SMS Pro subscription
  async createCheckoutSession() {
    const response = await api.post('/api/billing/create-checkout');
    return response.data;
  },

  // Create Stripe customer portal session for subscription management
  async createPortalSession() {
    const response = await api.post('/api/billing/portal');
    return response.data;
  },

  // Redirect to Stripe checkout
  async redirectToCheckout() {
    const { checkout_url } = await this.createCheckoutSession();
    window.location.href = checkout_url;
  },

  // Redirect to Stripe customer portal
  async redirectToPortal() {
    const { portal_url } = await this.createPortalSession();
    window.location.href = portal_url;
  }
};

export default billingService;
