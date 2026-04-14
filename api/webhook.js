const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
const { Resend } = require('resend');
const crypto = require('crypto');

// Initialize Firebase Admin (Only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;
  let rawBody = Buffer.from([]);

  try {
    // Read the raw body stream
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    rawBody = Buffer.concat(chunks);
    
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook Signature Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details.email;
    const tier = session.metadata.plan_tier || 'lifetime';
    const version = session.metadata.app_version || 'v1';

    // 1. Generate Sovereign License Key
    const licenseKey = `HS-${version.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    try {
      // 2. Save to Firestore
      await db.collection('licenses').doc(licenseKey).set({
        email: customerEmail,
        tier: tier,
        version: version,
        stripe_session_id: session.id,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        activated: false
      });

      // 3. Email the User via Resend
      await resend.emails.send({
        from: 'HealthShield AI <onboarding@healthshield-ai.com>',
        to: customerEmail,
        subject: 'Sovereign Activation: Your HealthShield AI License Key',
        html: `
          <div style="background: #050505; color: #E0E2EB; padding: 40px; font-family: sans-serif;">
            <h1 style="color: #6ed8c3;">Welcome to the Sovereignty Layer</h1>
            <p>Your purchase of <strong>HealthShield AI - ${tier.toUpperCase()}</strong> was successful.</p>
            <div style="background: #111; border: 1px solid #6ed8c3; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="font-size: 0.8rem; color: #849495; margin-bottom: 5px;">YOUR LICENSE KEY</p>
              <h2 style="letter-spacing: 2px; margin: 0; color: #fff;">${licenseKey}</h2>
            </div>
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Open the app on your device.</li>
              <li>Go to the "SAFE" or "Settings" tab.</li>
              <li>Click "Restore License" and paste your key.</li>
            </ol>
            <p>Watch your Onboarding Video here: <a href="https://vimeo.com/healthshield-onboarding" style="color: #6ed8c3;">How to use HealthShield AI</a></p>
            <hr style="border: 0; border-top: 1px solid #222; margin: 40px 0;">
            <p style="font-size: 0.7rem; color: #444;">&copy; 2026 Antigravity Intelligence Systems</p>
          </div>
        `
      });

      console.log(`License ${licenseKey} generated and emailed to ${customerEmail}`);
    } catch (dbError) {
      console.error('License Fulfillment Error:', dbError);
      return res.status(500).json({ error: 'License fulfillment failed' });
    }
  }

  res.status(200).json({ received: true });
}

// Disable Vercel's default body parser to get raw body for Stripe signature check
export const config = {
  api: {
    bodyParser: false,
  },
};
