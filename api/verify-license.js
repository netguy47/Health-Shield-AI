const admin = require('firebase-admin');

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { licenseKey } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ error: 'License key is required' });
  }

  try {
    const doc = await db.collection('licenses').doc(licenseKey).get();

    if (!doc.exists) {
      return res.status(404).json({ valid: false, message: 'Invalid license key.' });
    }

    const data = doc.data();
    
    // Mark as activated if it's the first time
    if (!data.activated) {
      await db.collection('licenses').doc(licenseKey).update({
        activated: true,
        activated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return res.status(200).json({
      valid: true,
      tier: data.tier,
      version: data.version
    });
  } catch (err) {
    console.error('License Verification Error:', err);
    return res.status(500).json({ error: 'Internal server error during verification.' });
  }
}
