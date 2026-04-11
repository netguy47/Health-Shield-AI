/**
 * HealthShield Sovereign Diagnostic Audit
 * Automates health checks for production readiness.
 */

const fs = require('fs');
const path = require('path');

const CHECKMARK = '\x1b[32m✔\x1b[0m';
const CROSS = '\x1b[31m✘\x1b[0m';
const WARNING = '\x1b[33m⚠\x1b[0m';

async function runAudit() {
  console.log('\x1b[36m--- HEALTHSHIELD SOVEREIGN AUDIT ---\x1b[0m\n');

  // 1. Check Env Vars (Local simulation)
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log(`${CHECKMARK} .env file detected`);
    const content = fs.readFileSync(envPath, 'utf8');
    const required = ['VITE_FIREBASE_API_KEY', 'STRIPE_SECRET_KEY'];
    required.forEach(key => {
      if (content.includes(key)) {
        console.log(`  ${CHECKMARK} Variable ${key} configured`);
      } else {
        console.log(`  ${CROSS} Variable ${key} MISSING`);
      }
    });
  } else {
    console.log(`${WARNING} .env file not found (ignore if using Vercel Dashboard envs)`);
  }

  // 2. Build Artifacts
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    console.log(`${CHECKMARK} Build directory 'dist' found`);
    const manifestPath = path.join(distPath, 'manifest.webmanifest');
    if (fs.existsSync(manifestPath)) {
        console.log(`  ${CHECKMARK} PWA Manifest generated`);
    } else {
        console.log(`  ${CROSS} PWA Manifest missing in build`);
    }
  } else {
    console.log(`${CROSS} Build artifact 'dist' not found. Run 'npm run build' first.`);
  }

  // 3. Asset Integrity
  const icons = ['icon-192.png', 'icon-512.png'];
  icons.forEach(icon => {
    if (fs.existsSync(path.join(process.cwd(), 'public', icon))) {
        console.log(`${CHECKMARK} Asset ${icon} exists`);
    } else {
        console.log(`${CROSS} Asset ${icon} MISSING`);
    }
  });

  // 4. API Integrity
  const apiPath = path.join(process.cwd(), 'api', 'checkout.js');
  if (fs.existsSync(apiPath)) {
    console.log(`${CHECKMARK} Serverless API route configured`);
  } else {
    console.log(`${CROSS} Serverless API route MISSING`);
  }
}

runAudit();
