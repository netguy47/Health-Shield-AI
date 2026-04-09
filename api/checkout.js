const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { plan } = req.body;
      
      const plans = {
        monthly: { amount: 999, name: 'Sovereign Pro - Monthly', mode: 'subscription' },
        yearly: { amount: 7900, name: 'Sovereign Pro - Yearly', mode: 'subscription' },
        lifetime: { amount: 19900, name: 'Sovereign Node - Lifetime', mode: 'payment' }
      };

      const selectedPlan = plans[plan] || plans.lifetime;

      // Create Checkout Sessions from body params.
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: selectedPlan.name,
                description: 'Professional-grade biometric analysis and archival intelligence.',
              },
              unit_amount: selectedPlan.amount,
            },
            quantity: 1,
          },
        ],
        mode: selectedPlan.mode,
        success_url: `${req.headers.origin}/?success=true`,
        cancel_url: `${req.headers.origin}/?canceled=true`,
      });
      res.status(200).json({ url: session.url });
    } catch (err) {
      res.status(err.statusCode || 500).json(err.message);
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
